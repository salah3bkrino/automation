const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create plans
    await seedPlans();
    
    // Create demo user
    await seedDemoUser();
    
    // Create demo tenant
    await seedDemoTenant();
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedPlans() {
  console.log('📋 Creating subscription plans...');

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for small businesses getting started with WhatsApp automation',
      price: 29.00,
      currency: 'USD',
      interval: 'month',
      features: [
        '1,000 conversations/month',
        'Basic workflows',
        'Email support',
        '1 WhatsApp number',
        'Basic analytics',
        'Contact management',
        'Message templates'
      ],
      limits: {
        messagesPerMonth: 1000,
        contactsPerMonth: 500,
        workflowsPerMonth: 5,
        whatsappNumbers: 1,
        teamMembers: 1,
        apiCallsPerMonth: 1000
      },
      status: 'ACTIVE',
      sortOrder: 1
    },
    {
      name: 'Pro',
      description: 'Ideal for growing businesses with advanced automation needs',
      price: 99.00,
      currency: 'USD',
      interval: 'month',
      features: [
        '5,000 conversations/month',
        'Advanced workflows',
        'Priority support',
        '3 WhatsApp numbers',
        'Advanced analytics',
        'Contact management',
        'Message templates',
        'API access',
        'Custom integrations',
        'A/B testing',
        'Campaign management'
      ],
      limits: {
        messagesPerMonth: 5000,
        contactsPerMonth: 2000,
        workflowsPerMonth: 20,
        whatsappNumbers: 3,
        teamMembers: 5,
        apiCallsPerMonth: 10000
      },
      status: 'ACTIVE',
      sortOrder: 2
    },
    {
      name: 'Business',
      description: 'Complete solution for large businesses with high volume needs',
      price: 299.00,
      currency: 'USD',
      interval: 'month',
      features: [
        '15,000 conversations/month',
        'Custom workflows',
        'Phone support',
        '10 WhatsApp numbers',
        'Advanced analytics',
        'Contact management',
        'Message templates',
        'API access',
        'Custom integrations',
        'A/B testing',
        'Campaign management',
        'White-label options',
        'Dedicated account manager',
        'Custom reporting',
        'SLA guarantee'
      ],
      limits: {
        messagesPerMonth: 15000,
        contactsPerMonth: 10000,
        workflowsPerMonth: 100,
        whatsappNumbers: 10,
        teamMembers: 20,
        apiCallsPerMonth: 50000
      },
      status: 'ACTIVE',
      sortOrder: 3
    },
    {
      name: 'Enterprise',
      description: 'Tailored solution for enterprise-level requirements',
      price: 999.00,
      currency: 'USD',
      interval: 'month',
      features: [
        'Unlimited conversations',
        'Unlimited workflows',
        '24/7 dedicated support',
        'Unlimited WhatsApp numbers',
        'Enterprise analytics',
        'Advanced contact management',
        'Custom message templates',
        'Unlimited API access',
        'Custom integrations',
        'Advanced A/B testing',
        'Multi-channel campaigns',
        'Full white-label',
        'Dedicated account team',
        'Custom reporting',
        'SLA guarantee',
        'On-premise deployment option',
        'Custom training',
        'Priority feature requests'
      ],
      limits: {
        messagesPerMonth: 999999,
        contactsPerMonth: 999999,
        workflowsPerMonth: 999,
        whatsappNumbers: 999,
        teamMembers: 999,
        apiCallsPerMonth: 999999
      },
      status: 'ACTIVE',
      sortOrder: 4
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan
    });
  }

  console.log('✅ Subscription plans created');
}

async function seedDemoUser() {
  console.log('👤 Creating demo user...');

  const hashedPassword = await bcrypt.hash('demo123', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@manychat.com' },
    update: {
      firstName: 'Demo',
      lastName: 'User',
      password: hashedPassword,
      phone: '+1234567890',
      companyName: 'Demo Company',
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: new Date()
    },
    create: {
      email: 'demo@manychat.com',
      firstName: 'Demo',
      lastName: 'User',
      password: hashedPassword,
      phone: '+1234567890',
      companyName: 'Demo Company',
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true
    }
  });

  console.log('✅ Demo user created/updated');
  return demoUser;
}

async function seedDemoTenant() {
  console.log('🏢 Creating demo tenant...');

  // Get demo user
  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@manychat.com' }
  });

  if (!demoUser) {
    throw new Error('Demo user not found');
  }

  // Get Starter plan
  const starterPlan = await prisma.plan.findUnique({
    where: { name: 'Starter' }
  });

  if (!starterPlan) {
    throw new Error('Starter plan not found');
  }

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { ownerId: demoUser.id },
    update: {
      name: 'Demo Workspace',
      subdomain: 'demo',
      primaryColor: '#25D366',
      status: 'ACTIVE'
    },
    create: {
      name: 'Demo Workspace',
      subdomain: 'demo',
      ownerId: demoUser.id,
      primaryColor: '#25D366',
      status: 'ACTIVE'
    }
  });

  // Create tenant user relationship
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: demoUser.id
      }
    },
    update: {
      role: 'OWNER',
      status: 'ACTIVE'
    },
    create: {
      tenantId: demoTenant.id,
      userId: demoUser.id,
      role: 'OWNER',
      status: 'ACTIVE'
    }
  });

  // Create demo subscription
  const subscription = await prisma.subscription.upsert({
    where: { userId: demoUser.id },
    update: {
      planId: starterPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      stripeSubscriptionId: 'sub_demo_starter_' + Date.now(),
      stripeCustomerId: 'cus_demo_' + Date.now()
    },
    create: {
      userId: demoUser.id,
      planId: starterPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeSubscriptionId: 'sub_demo_starter_' + Date.now(),
      stripeCustomerId: 'cus_demo_' + Date.now()
    }
  });

  // Create demo WhatsApp account
  const demoWhatsApp = await prisma.whatsAppAccount.create({
    data: {
      tenantId: demoTenant.id,
      phoneNumber: '+1234567890',
      phoneNumberId: 'phone_demo_' + Date.now(),
      displayName: 'Demo WhatsApp Number',
      businessId: 'biz_demo_' + Date.now(),
      wabaId: 'waba_demo_' + Date.now(),
      accessToken: 'demo_access_token_' + Date.now(),
      verifyToken: 'demo_verify_token_' + Date.now(),
      webhookSecret: 'demo_webhook_secret_' + Date.now(),
      status: 'ACTIVE',
      metadata: {
        isDemo: true,
        connectedAt: new Date().toISOString()
      }
    }
  });

  // Create demo contacts
  const demoContacts = [
    {
      whatsappId: '+1987654321',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1987654321',
      tags: ['customer', 'vip'],
      status: 'ACTIVE'
    },
    {
      whatsappId: '+1976543210',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1976543210',
      tags: ['lead'],
      status: 'ACTIVE'
    },
    {
      whatsappId: '+1965432109',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      phone: '+1965432109',
      tags: ['prospect'],
      status: 'ACTIVE'
    }
  ];

  for (const contactData of demoContacts) {
    await prisma.contact.upsert({
      where: {
        tenantId_whatsappId: {
          tenantId: demoTenant.id,
          whatsappId: contactData.whatsappId
        }
      },
      update: contactData,
      create: {
        ...contactData,
        tenantId: demoTenant.id
      }
    });
  }

  // Create demo workflows
  const demoWorkflows = [
    {
      name: 'Welcome Message',
      description: 'Send a welcome message to new contacts',
      trigger: 'MESSAGE_RECEIVED',
      nodes: [
        {
          id: 'trigger_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'New Message',
            type: 'trigger',
            config: {
              triggerType: 'message_received',
              keywords: []
            }
          }
        },
        {
          id: 'message_1',
          type: 'message',
          position: { x: 300, y: 100 },
          data: {
            label: 'Send Welcome',
            type: 'message',
            config: {
              message: '👋 Welcome to our WhatsApp service! How can we help you today?',
              messageType: 'text'
            }
          }
        }
      ],
      edges: [
        {
          id: 'edge_1',
          source: 'trigger_1',
          target: 'message_1'
        }
      ],
      status: 'ACTIVE'
    },
    {
      name: 'Customer Support',
      description: 'Handle customer support inquiries',
      trigger: 'KEYWORD',
      nodes: [
        {
          id: 'trigger_2',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Support Keyword',
            type: 'trigger',
            config: {
              triggerType: 'keyword',
              keywords: ['support', 'help', 'assistance']
            }
          }
        },
        {
          id: 'condition_1',
          type: 'condition',
          position: { x: 300, y: 100 },
          data: {
            label: 'Check Urgency',
            type: 'condition',
            config: {
              condition: 'contains',
              value: 'urgent'
            }
          }
        },
        {
          id: 'message_2',
          type: 'message',
          position: { x: 500, y: 50 },
          data: {
            label: 'Urgent Response',
            type: 'message',
            config: {
              message: '🚨 We understand this is urgent. Our support team will respond within 1 hour.',
              messageType: 'text'
            }
          }
        },
        {
          id: 'message_3',
          type: 'message',
          position: { x: 500, y: 150 },
          data: {
            label: 'Standard Response',
            type: 'message',
            config: {
              message: '📞 Thank you for contacting support. We\'ll respond within 24 hours.',
              messageType: 'text'
            }
          }
        }
      ],
      edges: [
        {
          id: 'edge_2',
          source: 'trigger_2',
          target: 'condition_1'
        },
        {
          id: 'edge_3',
          source: 'condition_1',
          target: 'message_2'
        },
        {
          id: 'edge_4',
          source: 'condition_1',
          target: 'message_3'
        }
      ],
      status: 'ACTIVE'
    }
  ];

  for (const workflowData of demoWorkflows) {
    await prisma.workflow.create({
      data: {
        ...workflowData,
        tenantId: demoTenant.id,
        isActive: true,
        version: 1
      }
    });
  }

  // Create demo message templates
  const demoTemplates = [
    {
      name: 'Welcome Message',
      category: 'UTILITY',
      language: 'en',
      components: [
        {
          type: 'body',
          text: 'Welcome to {{company_name}}! We\'re excited to have you here. How can we assist you today?'
        }
      ],
      status: 'APPROVED'
    },
    {
      name: 'Order Confirmation',
      category: 'UTILITY',
      language: 'en',
      components: [
        {
          type: 'body',
          text: 'Thank you for your order {{order_number}}! Your items are being prepared and will be shipped soon. Track your order here: {{tracking_url}}'
        }
      ],
      status: 'APPROVED'
    },
    {
      name: 'Appointment Reminder',
      category: 'UTILITY',
      language: 'en',
      components: [
        {
          type: 'body',
          text: 'Reminder: You have an appointment with {{business_name}} on {{appointment_date}} at {{appointment_time}}. Reply CONFIRM to confirm or CANCEL to reschedule.'
        }
      ],
      status: 'APPROVED'
    }
  ];

  for (const templateData of demoTemplates) {
    await prisma.messageTemplate.create({
      data: {
        ...templateData,
        tenantId: demoTenant.id,
        whatsappAccountId: demoWhatsApp.id
      }
    });
  }

  console.log('✅ Demo tenant and sample data created');
}

// Run the seeding
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };