const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('❌ Get plans error:', error);
    res.status(500).json({
      error: 'Failed to get plans',
      code: 'GET_PLANS_FAILED',
    });
  }
});

// Get current subscription
router.get('/subscription', async (req, res) => {
  try {
    const userId = req.user?.id; // This would come from auth middleware
    
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No active subscription found',
      });
    }

    // Get Stripe subscription details
    let stripeSubscription = null;
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      } catch (error) {
        console.error('❌ Failed to retrieve Stripe subscription:', error);
      }
    }

    res.json({
      success: true,
      data: {
        ...subscription,
        stripeSubscription,
      },
    });
  } catch (error) {
    console.error('❌ Get subscription error:', error);
    res.status(500).json({
      error: 'Failed to get subscription',
      code: 'GET_SUBSCRIPTION_FAILED',
    });
  }
});

// Create checkout session
router.post('/checkout', [
  body('planId').notEmpty(),
  body('successUrl').notEmpty().isURL(),
  body('cancelUrl').notEmpty().isURL(),
], handleValidationErrors, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const userId = req.user?.id;

    // Get plan details
    const plan = await prisma.plan.findUnique({
      where: { id: planId, status: 'ACTIVE' },
    });

    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        code: 'PLAN_NOT_FOUND',
      });
    }

    // Create or retrieve Stripe customer
    let customerId;
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId },
    });

    if (existingSubscription && existingSubscription.stripeCustomerId) {
      customerId = existingSubscription.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: req.user?.email,
        name: `${req.user?.firstName} ${req.user?.lastName}`,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.name,
              description: plan.description,
              images: [], // Add product images if needed
            },
            unit_amount: Math.round(parseFloat(plan.price) * 100), // Convert to cents
            recurring: {
              interval: plan.interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        planId: planId,
        userId: userId,
        tenantId: req.tenant?.id,
      },
      subscription_data: {
        metadata: {
          planId: planId,
          userId: userId,
          tenantId: req.tenant?.id,
        },
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error('❌ Create checkout session error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      code: 'CHECKOUT_FAILED',
    });
  }
});

// Create customer portal session
router.post('/portal', [
  body('returnUrl').notEmpty().isURL(),
], handleValidationErrors, async (req, res) => {
  try {
    const { returnUrl } = req.body;
    const userId = req.user?.id;

    // Get user's subscription
    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(400).json({
        error: 'No active subscription found',
        code: 'NO_SUBSCRIPTION',
      });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    console.error('❌ Create portal session error:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      code: 'PORTAL_FAILED',
    });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`❌ Webhook signature verification failed.`, err.message);
    return res.sendStatus(400);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    default:
      console.log(`🔔 Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

// Webhook handlers
async function handleCheckoutSessionCompleted(session) {
  try {
    const { planId, userId, tenantId } = session.metadata;
    const stripeSubscriptionId = session.subscription;
    const stripeCustomerId = session.customer;

    // Get Stripe subscription details
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const stripePriceId = stripeSubscription.items.data[0].price.id;

    // Get plan details
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      console.error('❌ Plan not found for checkout session:', session.id);
      return;
    }

    // Create or update subscription
    const subscriptionData = {
      userId,
      planId,
      status: 'ACTIVE',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      stripeSubscriptionId,
      stripeCustomerId,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    };

    await prisma.subscription.upsert({
      where: { userId },
      update: subscriptionData,
      create: subscriptionData,
    });

    console.log(`✅ Subscription created/updated for user ${userId}, plan ${planId}`);
  } catch (error) {
    console.error('❌ Error handling checkout session completed:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    // Update subscription status if needed
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
      },
      data: {
        status: 'ACTIVE',
      },
    });

    console.log(`✅ Invoice payment succeeded for subscription ${subscriptionId}`);
  } catch (error) {
    console.error('❌ Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
      },
      data: {
        status: 'PAST_DUE',
      },
    });

    console.log(`❌ Invoice payment failed for subscription ${subscriptionId}`);
  } catch (error) {
    console.error('❌ Error handling invoice payment failed:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const { planId, userId } = subscription.metadata;
    const customerId = subscription.customer;

    // Update subscription in database
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
      },
      data: {
        status: subscription.status === 'active' ? 'ACTIVE' : subscription.status.toUpperCase(),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    console.log(`✅ Subscription updated: ${subscription.id}`);
  } catch (error) {
    console.error('❌ Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;

    // Update subscription status in database
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
      },
      data: {
        status: 'CANCELED',
      },
    });

    console.log(`✅ Subscription deleted: ${subscription.id}`);
  } catch (error) {
    console.error('❌ Error handling subscription deleted:', error);
  }
}

// Get usage statistics
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant?.id;

    // Get current month's usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const messageCount = await prisma.message.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const contactCount = await prisma.contact.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Get subscription limits
    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
    });

    const limits = subscription?.plan?.limits || {};
    const messageLimit = limits.messagesPerMonth || 1000;
    const contactLimit = limits.contactsPerMonth || 500;

    res.json({
      success: true,
      data: {
        currentPeriod: {
          start: startOfMonth,
          end: endOfMonth,
        },
        usage: {
          messages: {
            used: messageCount,
            limit: messageLimit,
            percentage: Math.round((messageCount / messageLimit) * 100),
          },
          contacts: {
            used: contactCount,
            limit: contactLimit,
            percentage: Math.round((contactCount / contactLimit) * 100),
          },
        },
      },
    });
  } catch (error) {
    console.error('❌ Get usage error:', error);
    res.status(500).json({
      error: 'Failed to get usage statistics',
      code: 'GET_USAGE_FAILED',
    });
  }
});

// Cancel subscription
router.post('/cancel', [
  body('immediately').optional().isBoolean(),
  body('reason').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { immediately = false, reason } = req.body;
    const userId = req.user?.id;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(400).json({
        error: 'No active subscription found',
        code: 'NO_SUBSCRIPTION',
      });
    }

    if (immediately) {
      // Cancel immediately
      await stripe.subscriptions.del(subscription.stripeSubscriptionId);
      
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELED' },
      });
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    }

    res.json({
      success: true,
      message: immediately 
        ? 'Subscription canceled immediately' 
        : 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error) {
    console.error('❌ Cancel subscription error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      code: 'CANCEL_FAILED',
    });
  }
});

module.exports = router;