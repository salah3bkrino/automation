const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, companyName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'USER_EXISTS',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        companyName,
        role: 'USER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        companyName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Create default tenant for the user
    const tenant = await prisma.tenant.create({
      data: {
        name: companyName || `${firstName} ${lastName}`,
        ownerId: user.id,
        subdomain: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        primaryColor: '#25D366',
        status: 'ACTIVE',
      },
    });

    // Add user as tenant owner
    await prisma.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    // Generate JWT token
    const token = generateToken(user.id);

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        tenant,
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Failed to register user',
      code: 'REGISTRATION_FAILED',
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenants: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get active tenants
    const activeTenants = user.tenants
      .filter(tu => tu.status === 'ACTIVE' && tu.tenant.status === 'ACTIVE')
      .map(tu => tu.tenant);

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      companyName: user.companyName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        tenants: activeTenants,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Failed to login',
      code: 'LOGIN_FAILED',
    });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Remove session from database
      await prisma.userSession.deleteMany({
        where: { token },
      });
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Failed to logout',
      code: 'LOGOUT_FAILED',
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if session exists and is valid
    const session = await prisma.userSession.findFirst({
      where: {
        userId,
        token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return res.status(401).json({
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION',
      });
    }

    // Get active tenants
    const activeTenants = user.tenants
      .filter(tu => tu.status === 'ACTIVE' && tu.tenant.status === 'ACTIVE')
      .map(tu => ({
        ...tu.tenant,
        userRole: tu.role,
      }));

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      companyName: user.companyName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };

    res.json({
      success: true,
      data: {
        user: userResponse,
        tenants: activeTenants,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    res.status(500).json({
      error: 'Failed to get user profile',
      code: 'PROFILE_FAILED',
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN',
      });
    }

    // Verify token (even if expired)
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const userId = decoded.userId;

    // Check if session exists
    const session = await prisma.userSession.findFirst({
      where: {
        userId,
        token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return res.status(401).json({
        error: 'Session not found or expired',
        code: 'SESSION_EXPIRED',
      });
    }

    // Generate new token
    const newToken = generateToken(userId);

    // Update session
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: newToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.json({
      success: true,
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      code: 'REFRESH_FAILED',
    });
  }
});

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send reset email
    // await emailService.sendPasswordResetEmail(email, resetToken);

    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Failed to process password reset',
      code: 'PASSWORD_RESET_FAILED',
    });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verify reset token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        error: 'Invalid reset token',
        code: 'INVALID_RESET_TOKEN',
      });
    }

    const userId = decoded.userId;

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all sessions for this user
    await prisma.userSession.deleteMany({
      where: { userId },
    });

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        error: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN',
      });
    }

    res.status(500).json({
      error: 'Failed to reset password',
      code: 'PASSWORD_RESET_FAILED',
    });
  }
});

module.exports = router;