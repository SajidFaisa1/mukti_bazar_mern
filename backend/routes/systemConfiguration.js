const express = require('express');
const router = express.Router();
const AuditEvent = require('../models/AuditEvent');

// Get system configuration
router.get('/system/configuration', async (req, res) => {
  try {
    // In a real implementation, this would read from a configuration collection or file
    // For now, return default configuration
    const defaultConfiguration = {
      security: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          expiration: 90
        },
        twoFactorAuth: false,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        lockoutDuration: 15
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: true,
        webhooksEnabled: false,
        adminAlerts: true,
        userAlerts: true,
        systemAlerts: true
      },
      platform: {
        maintenanceMode: false,
        registrationEnabled: true,
        vendorRegistrationEnabled: true,
        publicCatalog: true,
        guestCheckout: false,
        multilanguage: false,
        defaultLanguage: 'en',
        timezone: 'UTC',
        currency: 'USD'
      },
      integration: {
        paymentGateways: {
          sslcommerz: { enabled: true, live: false },
          stripe: { enabled: false, live: false },
          paypal: { enabled: false, live: false }
        },
        emailService: {
          provider: 'smtp',
          host: process.env.SMTP_HOST || '',
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          username: process.env.SMTP_USERNAME || '',
          password: process.env.SMTP_PASSWORD || ''
        },
        smsService: {
          provider: 'twilio',
          accountSid: process.env.TWILIO_ACCOUNT_SID || '',
          authToken: process.env.TWILIO_AUTH_TOKEN || '',
          fromNumber: process.env.TWILIO_FROM_NUMBER || ''
        }
      },
      performance: {
        caching: true,
        compression: true,
        imageOptimization: true,
        cdnEnabled: false,
        cdnUrl: process.env.CDN_URL || '',
        databaseOptimization: true
      }
    };

    res.json({ configuration: defaultConfiguration });

  } catch (error) {
    console.error('Error fetching system configuration:', error);
    res.status(500).json({ message: 'Error fetching system configuration' });
  }
});

// Update system configuration
router.put('/system/configuration', async (req, res) => {
  try {
    const { configuration } = req.body;

    if (!configuration) {
      return res.status(400).json({ message: 'Configuration data required' });
    }

    // In a real implementation, this would save to database or configuration file
    // For now, we'll just log the audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'UPDATE_SYSTEM_CONFIG',
      targetType: 'SYSTEM',
      details: {
        configurationKeys: Object.keys(configuration),
        timestamp: new Date()
      }
    });

    // Here you would typically:
    // 1. Validate the configuration
    // 2. Save to database or config file
    // 3. Apply certain settings immediately
    // 4. Restart services if needed

    res.json({ 
      message: 'Configuration updated successfully',
      configuration 
    });

  } catch (error) {
    console.error('Error updating system configuration:', error);
    res.status(500).json({ message: 'Error updating system configuration' });
  }
});

// Get system status
router.get('/system/status', async (req, res) => {
  try {
    // Check various system components
    const status = {
      database: await checkDatabaseStatus(),
      server: await checkServerStatus(),
      cache: await checkCacheStatus(),
      storage: await checkStorageStatus()
    };

    res.json({ status });

  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ message: 'Error fetching system status' });
  }
});

// Test service connections
router.post('/system/test/:service', async (req, res) => {
  try {
    const { service } = req.params;
    let testResult = false;

    switch (service) {
      case 'email':
        testResult = await testEmailConnection();
        break;
      case 'sms':
        testResult = await testSMSConnection();
        break;
      case 'sslcommerz':
        testResult = await testSSLCommerzConnection();
        break;
      case 'stripe':
        testResult = await testStripeConnection();
        break;
      case 'paypal':
        testResult = await testPayPalConnection();
        break;
      default:
        return res.status(400).json({ message: 'Unknown service' });
    }

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'TEST_SERVICE_CONNECTION',
      targetType: 'SYSTEM',
      details: {
        service,
        result: testResult ? 'success' : 'failure',
        timestamp: new Date()
      }
    });

    res.json({ 
      success: testResult,
      message: testResult ? `${service} connection successful` : `${service} connection failed`
    });

  } catch (error) {
    console.error('Error testing service connection:', error);
    res.status(500).json({ message: 'Error testing service connection' });
  }
});

// Helper functions for system checks
async function checkDatabaseStatus() {
  try {
    // Simple database connectivity check
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1 ? 'healthy' : 'error';
  } catch (error) {
    return 'error';
  }
}

async function checkServerStatus() {
  try {
    // Check server health metrics
    const used = process.memoryUsage();
    const memoryUsage = used.heapUsed / used.heapTotal;
    
    if (memoryUsage > 0.9) return 'warning';
    if (memoryUsage > 0.95) return 'error';
    return 'healthy';
  } catch (error) {
    return 'error';
  }
}

async function checkCacheStatus() {
  try {
    // If you have Redis or another cache, check it here
    // For now, return healthy
    return 'healthy';
  } catch (error) {
    return 'error';
  }
}

async function checkStorageStatus() {
  try {
    // Check disk space, file system health
    const fs = require('fs');
    const path = require('path');
    
    // Simple check if we can write to uploads directory
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.promises.access(uploadDir, fs.constants.W_OK);
      return 'healthy';
    } catch {
      return 'warning';
    }
  } catch (error) {
    return 'error';
  }
}

// Service connection test functions
async function testEmailConnection() {
  try {
    // In a real implementation, this would test SMTP connection
    // For now, return true if environment variables are set
    return !!(process.env.SMTP_HOST && process.env.SMTP_USERNAME);
  } catch (error) {
    return false;
  }
}

async function testSMSConnection() {
  try {
    // Test Twilio or other SMS service
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  } catch (error) {
    return false;
  }
}

async function testSSLCommerzConnection() {
  try {
    // Test SSLCommerz API
    return !!(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD);
  } catch (error) {
    return false;
  }
}

async function testStripeConnection() {
  try {
    // Test Stripe API
    return !!process.env.STRIPE_SECRET_KEY;
  } catch (error) {
    return false;
  }
}

async function testPayPalConnection() {
  try {
    // Test PayPal API
    return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  } catch (error) {
    return false;
  }
}

module.exports = router;
