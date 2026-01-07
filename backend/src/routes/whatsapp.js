const express = require('express');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Generate OAuth URL for WhatsApp connection
router.get('/connect', async (req, res) => {
  try {
    const { META_APP_ID, FRONTEND_URL } = process.env;
    
    if (!META_APP_ID || !FRONTEND_URL) {
      return res.status(500).json({
        error: 'Missing Meta App ID or Frontend URL configuration',
        code: 'MISSING_CONFIG',
      });
    }

    const tenantId = req.tenant.id;
    const redirectUri = `${FRONTEND_URL}/auth/whatsapp/callback`;
    const state = Buffer.from(JSON.stringify({ tenantId, timestamp: Date.now() })).toString('base64');
    
    const scopes = [
      'whatsapp_business_management',
      'whatsapp_business_messaging',
    ].join(',');

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${META_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_type=code&` +
      `state=${state}`;

    console.log(`🔗 Generated OAuth URL for tenant ${tenantId}`);

    res.json({
      success: true,
      data: {
        authUrl,
        redirectUri,
        scopes: scopes.split(','),
        state,
      },
    });

  } catch (error) {
    console.error('❌ OAuth URL generation error:', error);
    res.status(500).json({
      error: 'Failed to generate OAuth URL',
      code: 'OAUTH_ERROR',
    });
  }
});

// Handle OAuth callback from Meta
router.post('/callback', [
  body('code').notEmpty(),
  body('state').notEmpty(),
], handleValidationErrors, async (req, res) => {
  try {
    const { code, state } = req.body;
    
    // Decode and verify state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid state parameter',
        code: 'INVALID_STATE',
      });
    }

    // Verify tenant matches
    if (stateData.tenantId !== req.tenant.id) {
      return res.status(400).json({
        error: 'Tenant mismatch',
        code: 'TENANT_MISMATCH',
      });
    }

    // Check state age (5 minutes max)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return res.status(400).json({
        error: 'State expired',
        code: 'STATE_EXPIRED',
      });
    }

    const { META_APP_ID, META_APP_SECRET, FRONTEND_URL } = process.env;

    // Exchange code for access token
    console.log(`🔄 Exchanging authorization code for access token...`);
    
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `redirect_uri=${FRONTEND_URL}/auth/whatsapp/callback&` +
      `code=${code}`
    );

    const { access_token, expires_in } = tokenResponse.data;

    if (!access_token) {
      throw new Error('No access token received from Meta');
    }

    // Get user info and business accounts
    const meResponse = await axios.get(
      `https://graph.facebook.com/v18.0/me?` +
      `access_token=${access_token}&` +
      `fields=id,name`
    );

    const businessId = meResponse.data.id;

    // Get WhatsApp business accounts
    const wabaResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts?` +
      `access_token=${access_token}`
    );

    if (!wabaResponse.data.data || wabaResponse.data.data.length === 0) {
      throw new Error('No WhatsApp Business Account found. Please create one first.');
    }

    const wabaId = wabaResponse.data.data[0].id;

    // Get phone numbers
    const phoneResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?` +
      `access_token=${access_token}`
    );

    if (!phoneResponse.data.data || phoneResponse.data.data.length === 0) {
      throw new Error('No phone numbers found. Please add a phone number to your WhatsApp Business Account.');
    }

    const phoneNumber = phoneResponse.data.data[0];
    const phoneNumberId = phoneNumber.id;
    const phoneNumberDisplay = phoneNumber.display_phone_number;
    const phoneNumberName = phoneNumber.verified_name || 'Business Number';

    // Generate webhook secrets
    const webhookSecret = require('crypto').randomBytes(32).toString('hex');
    const verifyToken = require('crypto').randomBytes(16).toString('hex');

    // Store WhatsApp account in database
    const whatsappAccount = await prisma.whatsAppAccount.create({
      data: {
        tenantId: req.tenant.id,
        phoneNumber: phoneNumberDisplay,
        phoneNumberId: phoneNumberId,
        displayName: phoneNumberName,
        businessId: businessId,
        wabaId: wabaId,
        accessToken: access_token, // In production, encrypt this
        verifyToken: verifyToken,
        webhookSecret: webhookSecret,
        status: 'PENDING',
        metadata: {
          expiresAt: new Date(Date.now() + (expires_in * 1000)).toISOString(),
          connectedAt: new Date().toISOString(),
        },
      },
    });

    // Configure webhook for this phone number
    try {
      const webhookUrl = `${process.env.API_BASE_URL || 'https://api.yourplatform.com'}/webhook/whatsapp`;
      
      await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/subscriptions`,
        {
          fields: ['messages', 'message_statuses'],
          object: 'whatsapp_business_account',
          callback_url: webhookUrl,
          verify_token: verifyToken,
        },
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );

      // Update status to ACTIVE
      await prisma.whatsAppAccount.update({
        where: { id: whatsappAccount.id },
        data: { 
          status: 'ACTIVE',
          lastSyncAt: new Date(),
        },
      });

      console.log(`✅ WhatsApp connected successfully for tenant ${req.tenant.id}`);
      console.log(`📱 Phone Number: ${phoneNumberDisplay}`);

    } catch (webhookError) {
      console.error('⚠️ Webhook configuration failed:', webhookError.message);
      // Don't fail the connection, just log the error
    }

    res.json({
      success: true,
      message: 'WhatsApp connected successfully!',
      data: {
        id: whatsappAccount.id,
        phoneNumber: phoneNumberDisplay,
        displayName: phoneNumberName,
        status: 'ACTIVE',
        connectedAt: whatsappAccount.createdAt,
      },
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to connect WhatsApp',
      code: 'CONNECTION_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Get connected WhatsApp accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await prisma.whatsAppAccount.findMany({
      where: {
        tenantId: req.tenant.id,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        status: true,
        lastSyncAt: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: accounts,
    });

  } catch (error) {
    console.error('❌ Get accounts error:', error);
    res.status(500).json({
      error: 'Failed to get WhatsApp accounts',
      code: 'GET_ACCOUNTS_FAILED',
    });
  }
});

// Send message
router.post('/send', [
  body('to').notEmpty().isMobilePhone(),
  body('message').notEmpty(),
  body('type').optional().isIn(['text', 'template', 'image', 'document']),
  body('whatsappAccountId').notEmpty(),
], handleValidationErrors, async (req, res) => {
  try {
    const { to, message, type = 'text', whatsappAccountId, templateName, templateLanguage, templateComponents } = req.body;

    // Get WhatsApp account
    const whatsappAccount = await prisma.whatsAppAccount.findFirst({
      where: {
        id: whatsappAccountId,
        tenantId: req.tenant.id,
        status: 'ACTIVE',
      },
    });

    if (!whatsappAccount) {
      return res.status(404).json({
        error: 'WhatsApp account not found or inactive',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    // Check if we can send message (24-hour rule)
    const lastMessage = await prisma.message.findFirst({
      where: {
        contact: { whatsappId: to },
        direction: 'INBOUND',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    const canSendFreeMessage = lastMessage && new Date() - new Date(lastMessage.createdAt) < 24 * 60 * 60 * 1000;

    // Prepare message payload
    let messagePayload;

    if (type === 'text' && canSendFreeMessage) {
      messagePayload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d+]/g, ''), // Clean phone number
        text: { body: message },
      };
    } else if (type === 'template') {
      // Template message (required for outbound messages outside 24h window)
      if (!templateName) {
        return res.status(400).json({
          error: 'Template name is required for template messages',
          code: 'TEMPLATE_NAME_REQUIRED',
        });
      }

      messagePayload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d+]/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage || 'en' },
          components: templateComponents || [],
        },
      };
    } else if (!canSendFreeMessage) {
      return res.status(400).json({
        error: 'Cannot send free message. Use template message or wait for customer to message first.',
        code: 'MESSAGE_OUTSIDE_WINDOW',
      });
    } else {
      return res.status(400).json({
        error: 'Invalid message type',
        code: 'INVALID_MESSAGE_TYPE',
      });
    }

    // Send message via WhatsApp Cloud API
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${whatsappAccount.phoneNumberId}/messages`,
      messagePayload,
      {
        headers: {
          'Authorization': `Bearer ${whatsappAccount.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const messageId = response.data.messages?.[0]?.id;

    if (!messageId) {
      throw new Error('No message ID received from WhatsApp API');
    }

    // Save message to database
    const savedMessage = await prisma.message.create({
      data: {
        tenantId: req.tenant.id,
        conversationId: await getOrCreateConversation(to, whatsappAccount.id),
        contactId: await getOrCreateContact(to, req.tenant.id),
        whatsappAccountId: whatsappAccount.id,
        messageId: messageId,
        direction: 'OUTBOUND',
        type: type.toUpperCase(),
        content: type === 'text' ? { text: message } : messagePayload,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    console.log(`✅ Message sent successfully. Message ID: ${messageId}`);

    res.json({
      success: true,
      data: {
        messageId: messageId,
        status: 'SENT',
        sentAt: savedMessage.sentAt,
        type: type,
      },
    });

  } catch (error) {
    console.error('❌ Send message error:', error.response?.data || error.message);
    
    // Handle specific WhatsApp API errors
    let errorMessage = 'Failed to send message';
    let errorCode = 'SEND_FAILED';

    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      errorMessage = apiError.message || errorMessage;
      errorCode = apiError.error_code || errorCode;
      
      // Log specific error details
      if (apiError.error_code) {
        console.log(`🚨 WhatsApp API Error ${apiError.error_code}: ${apiError.error_user_title || 'No title'}`);
      }
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Webhook handler for receiving messages
router.post('/webhook', async (req, res) => {
  try {
    const data = req.body;
    
    // Log incoming webhook for debugging
    console.log('📩 Received WhatsApp webhook:', JSON.stringify(data, null, 2));

    // Check if this is a message
    if (data.entry && data.entry[0] && data.entry[0].changes) {
      const change = data.entry[0].changes[0];
      
      if (change.value && change.value.messages) {
        const messages = change.value.messages;
        
        for (const message of messages) {
          await processIncomingMessage(message, change.value);
        }
      }
      
      // Handle message status updates
      if (change.value && change.value.statuses) {
        await processMessageStatuses(change.value.statuses);
      }
    }

    // Always respond quickly to Meta
    res.status(200).send('EVENT_RECEIVED');
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).send('INTERNAL_ERROR');
  }
});

// Webhook verification
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Get the verify token from the WhatsApp account
    // In production, you might want to match it with a specific account
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        console.log('❌ Webhook verification failed: Invalid token');
        res.status(403).send('Forbidden');
      }
    } else {
      res.status(400).send('Bad Request');
    }
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Helper functions
async function processIncomingMessage(message, metadata) {
  try {
    const phoneNumberId = metadata.phone_number_id;
    
    // Find the WhatsApp account
    const whatsappAccount = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId },
    });

    if (!whatsappAccount) {
      console.log('⚠️ No WhatsApp account found for phone number ID:', phoneNumberId);
      return;
    }

    const from = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;
    
    let messageType = 'UNKNOWN';
    let content = {};

    // Extract message content based on type
    if (message.text) {
      messageType = 'TEXT';
      content = { text: message.text.body };
    } else if (message.image) {
      messageType = 'IMAGE';
      content = { 
        image: {
          id: message.image.id,
          caption: message.image.caption,
        }
      };
    } else if (message.audio) {
      messageType = 'AUDIO';
      content = { audio: { id: message.audio.id } };
    } else if (message.video) {
      messageType = 'VIDEO';
      content = { video: { id: message.video.id } };
    } else if (message.document) {
      messageType = 'DOCUMENT';
      content = { 
        document: {
          id: message.document.id,
          filename: message.document.filename,
        }
      };
    } else if (message.location) {
      messageType = 'LOCATION';
      content = { 
        location: {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
        }
      };
    } else if (message.contacts) {
      messageType = 'CONTACT';
      content = { contacts: message.contacts };
    }

    console.log(`📱 New ${messageType} message from ${from}`);

    // Get or create contact
    const contactId = await getOrCreateContact(from, whatsappAccount.tenantId);

    // Get or create conversation
    const conversationId = await getOrCreateConversation(from, whatsappAccount.id);

    // Save message to database
    const savedMessage = await prisma.message.create({
      data: {
        tenantId: whatsappAccount.tenantId,
        conversationId,
        contactId,
        whatsappAccountId: whatsappAccount.id,
        messageId,
        direction: 'INBOUND',
        type: messageType,
        content,
        status: 'RECEIVED',
        sentAt: new Date(parseInt(timestamp) * 1000),
      },
    });

    // Update conversation last message time
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: savedMessage.sentAt },
    });

    // Send to n8n for processing
    await sendToN8n(savedMessage, whatsappAccount);

  } catch (error) {
    console.error('❌ Error processing incoming message:', error);
  }
}

async function processMessageStatuses(statuses) {
  try {
    for (const status of statuses) {
      const { id, status: messageStatus, timestamp } = status;
      
      // Update message status in database
      await prisma.message.updateMany({
        where: { messageId: id },
        data: {
          status: messageStatus.toUpperCase(),
          deliveredAt: messageStatus === 'delivered' ? new Date(parseInt(timestamp) * 1000) : undefined,
          readAt: messageStatus === 'read' ? new Date(parseInt(timestamp) * 1000) : undefined,
        },
      });

      console.log(`📊 Message ${id} status updated to: ${messageStatus}`);
    }
  } catch (error) {
    console.error('❌ Error processing message statuses:', error);
  }
}

async function getOrCreateContact(whatsappId, tenantId) {
  let contact = await prisma.contact.findFirst({
    where: { whatsappId, tenantId },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        tenantId,
        whatsappId,
        name: `Contact ${whatsappId.slice(-4)}`,
        status: 'ACTIVE',
      },
    });
  }

  return contact.id;
}

async function getOrCreateConversation(whatsappId, whatsappAccountId) {
  let conversation = await prisma.conversation.findFirst({
    where: {
      contact: { whatsappId },
      whatsappAccountId,
    },
    include: { contact: true },
  });

  if (!conversation) {
    const contact = await getOrCreateContact(whatsappId, 'temp'); // We'll update this with correct tenantId
    
    conversation = await prisma.conversation.create({
      data: {
        tenantId: 'temp', // We'll update this
        contactId: contact,
        whatsappAccountId,
        status: 'ACTIVE',
      },
    });
  }

  return conversation.id;
}

async function sendToN8n(message, whatsappAccount) {
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.log('⚠️ N8N webhook URL not configured, skipping n8n integration');
      return;
    }

    const payload = {
      messageId: message.id,
      from: message.contact?.whatsappId,
      messageType: message.type.toLowerCase(),
      content: message.content,
      timestamp: message.sentAt.toISOString(),
      tenantId: message.tenantId,
      whatsappAccountId: whatsappAccount.id,
    };

    console.log('🔄 Sending to n8n:', JSON.stringify(payload, null, 2));

    const response = await axios.post(n8nWebhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': message.tenantId,
      },
      timeout: 10000,
    });

    console.log('✅ Successfully sent to n8n');
    console.log('📊 n8n response status:', response.status);

  } catch (error) {
    console.error('❌ Failed to send to n8n:', error.message);
    
    // Don't throw error, just log it - we don't want to fail the webhook
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️ n8n is not running or not accessible');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⚠️ n8n request timed out');
    }
  }
}

// Disconnect WhatsApp account
router.post('/disconnect/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.whatsAppAccount.findFirst({
      where: {
        id: accountId,
        tenantId: req.tenant.id,
      },
    });

    if (!account) {
      return res.status(404).json({
        error: 'WhatsApp account not found',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    // Update status to INACTIVE
    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: { status: 'INACTIVE' },
    });

    console.log(`🔌 WhatsApp account ${accountId} disconnected`);

    res.json({
      success: true,
      message: 'WhatsApp account disconnected successfully',
    });

  } catch (error) {
    console.error('❌ Disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect WhatsApp account',
      code: 'DISCONNECT_FAILED',
    });
  }
});

module.exports = router;