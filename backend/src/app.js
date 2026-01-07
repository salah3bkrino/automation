const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import Prisma Client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tenantRoutes = require('./routes/tenants');
const whatsappRoutes = require('./routes/whatsapp');
const workflowRoutes = require('./routes/workflows');
const contactRoutes = require('./routes/contacts');
const messageRoutes = require('./routes/messages');
const analyticsRoutes = require('./routes/analytics');
const billingRoutes = require('./routes/billing');

// Initialize Express app
const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression middleware
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    database: 'connected', // We'll add actual DB check
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'ManyChat Clone API',
    version: '1.0.0',
    description: 'Multi-tenant WhatsApp Automation SaaS Platform',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      tenants: '/api/tenants',
      whatsapp: '/api/whatsapp',
      workflows: '/api/workflows',
      contacts: '/api/contacts',
      messages: '/api/messages',
      analytics: '/api/analytics',
      billing: '/api/billing',
    },
    documentation: 'https://docs.yourplatform.com',
  });
});

// Multi-tenant middleware - ensures tenant isolation
app.use('/api/*', async (req, res, next) => {
  try {
    // Skip for auth and public endpoints
    if (req.path.startsWith('/api/auth') || req.path === '/api/health' || req.path === '/api') {
      return next();
    }

    // Get tenant from subdomain or header
    const tenantId = req.headers['x-tenant-id'] || req.tenant?.id;
    
    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID is required',
        code: 'TENANT_REQUIRED',
      });
    }

    // Verify tenant exists and is active
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        status: 'ACTIVE',
      },
    });

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found or inactive',
        code: 'TENANT_NOT_FOUND',
      });
    }

    // Attach tenant to request
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'TENANT_ERROR',
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Resource not found',
      code: 'RESOURCE_NOT_FOUND',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ManyChat Clone API running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Local'}`);
});

module.exports = app;