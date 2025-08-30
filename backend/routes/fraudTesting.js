const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const DeviceFingerprintService = require('../services/deviceFingerprintService');

// Test fraud detection system
router.post('/test-fraud-detection', protect, adminOnly, async (req, res) => {
  try {
    const { testScenario } = req.body;

    let testFingerprint = {};
    let testSecurityInfo = {};

    switch (testScenario) {
      case 'headless_browser':
        testFingerprint = {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/91.0.4472.124 Safari/537.36',
          plugins: [],
          canvas: 'canvas-blocked',
          webgl: 'webgl-blocked',
          screen: { width: 1024, height: 768, colorDepth: 24 }
        };
        break;

      case 'tor_browser':
        testFingerprint = {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0',
          plugins: [],
          screen: { width: 1000, height: 1000, colorDepth: 24 },
          timezone: 'UTC'
        };
        testSecurityInfo = {
          ipAddress: '127.0.0.1',
          isTor: true
        };
        break;

      case 'proxy_vpn':
        testFingerprint = {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          screen: { width: 1920, height: 1080, colorDepth: 24 }
        };
        testSecurityInfo = {
          ipAddress: '192.168.1.1',
          isProxy: true,
          forwardedFor: '203.123.45.67, 192.168.1.1'
        };
        break;

      case 'device_sharing':
        // Simulate same device used by multiple users
        testFingerprint = {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          screen: { width: 1366, height: 768, colorDepth: 24 },
          plugins: ['Chrome PDF Plugin', 'Shockwave Flash'],
          canvas: 'shared-device-canvas-123'
        };
        break;

      default:
        testFingerprint = {
          userAgent: req.get('User-Agent'),
          screen: { width: 1920, height: 1080, colorDepth: 24 },
          plugins: ['Chrome PDF Plugin'],
          canvas: 'normal-canvas-fingerprint'
        };
    }

    // Generate security report
    const mockRequest = {
      ...req,
      ip: testSecurityInfo.ipAddress || req.ip,
      headers: {
        ...req.headers,
        'user-agent': testFingerprint.userAgent,
        'x-forwarded-for': testSecurityInfo.forwardedFor
      }
    };

    const securityReport = await DeviceFingerprintService.generateSecurityReport(
      mockRequest,
      testFingerprint,
      'test-user-123'
    );

    res.json({
      success: true,
      testScenario,
      securityReport,
      recommendations: generateTestRecommendations(securityReport)
    });

  } catch (error) {
    console.error('Error testing fraud detection:', error);
    res.status(500).json({ error: 'Failed to test fraud detection' });
  }
});

// Get fraud detection statistics
router.get('/fraud-stats', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Overall fraud statistics
    const totalOrders = await Order.countDocuments();
    const flaggedOrders = await Order.countDocuments({ requiresApproval: true });
    const recentFlagged = await Order.countDocuments({
      requiresApproval: true,
      orderedAt: { $gte: last24h }
    });

    // Fraud types breakdown
    const fraudTypes = await Order.aggregate([
      { $match: { requiresApproval: true } },
      { $unwind: '$suspiciousFlags' },
      {
        $group: {
          _id: '$suspiciousFlags.type',
          count: { $sum: 1 },
          severity: { $first: '$suspiciousFlags.severity' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // IP analysis
    const suspiciousIPs = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: last7days },
          'securityInfo.ipAddress': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$securityInfo.ipAddress',
          orderCount: { $sum: 1 },
          totalValue: { $sum: '$total' },
          uniqueUsers: { $addToSet: '$uid' },
          flagged: { $sum: { $cond: ['$requiresApproval', 1, 0] } }
        }
      },
      {
        $match: {
          $or: [
            { orderCount: { $gt: 10 } },
            { flagged: { $gt: 0 } }
          ]
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 20 }
    ]);

    // Device fingerprint analysis
    const deviceStats = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: last30days },
          'securityInfo.deviceFingerprint': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$securityInfo.deviceFingerprint',
          orderCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$uid' },
          uniqueIPs: { $addToSet: '$securityInfo.ipAddress' },
          flagged: { $sum: { $cond: ['$requiresApproval', 1, 0] } }
        }
      },
      {
        $match: {
          $or: [
            { orderCount: { $gt: 5 } },
            { flagged: { $gt: 0 } }
          ]
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 15 }
    ]);

    // Risk level distribution
    const riskDistribution = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: last30days },
          'securityInfo.riskLevel': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$securityInfo.riskLevel',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' },
          avgValue: { $avg: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Time-based fraud patterns
    const hourlyFraud = await Order.aggregate([
      {
        $match: {
          requiresApproval: true,
          orderedAt: { $gte: last7days }
        }
      },
      {
        $group: {
          _id: { $hour: '$orderedAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        overview: {
          totalOrders,
          flaggedOrders,
          flaggedPercentage: ((flaggedOrders / totalOrders) * 100).toFixed(2),
          recentFlagged
        },
        fraudTypes,
        suspiciousIPs: suspiciousIPs.map(ip => ({
          ...ip,
          userCount: ip.uniqueUsers.length,
          riskScore: calculateIPRiskScore(ip)
        })),
        deviceStats: deviceStats.map(device => ({
          ...device,
          userCount: device.uniqueUsers.length,
          ipCount: device.uniqueIPs.length,
          riskLevel: device.userCount > 5 ? 'high' : device.userCount > 2 ? 'medium' : 'low'
        })),
        riskDistribution,
        hourlyFraud
      }
    });

  } catch (error) {
    console.error('Error fetching fraud stats:', error);
    res.status(500).json({ error: 'Failed to fetch fraud statistics' });
  }
});

// Helper function to calculate IP risk score
function calculateIPRiskScore(ipData) {
  let score = 0;
  
  // High order count
  if (ipData.orderCount > 20) score += 50;
  else if (ipData.orderCount > 10) score += 25;
  
  // Multiple users from same IP
  if (ipData.userCount > 5) score += 40;
  else if (ipData.userCount > 2) score += 20;
  
  // High flagged ratio
  const flaggedRatio = ipData.flagged / ipData.orderCount;
  if (flaggedRatio > 0.5) score += 30;
  else if (flaggedRatio > 0.2) score += 15;
  
  return Math.min(score, 100);
}

// Helper function for test recommendations
function generateTestRecommendations(securityReport) {
  const recommendations = [];
  
  if (securityReport.fraudIndicators.length > 0) {
    recommendations.push('🚨 Fraud indicators detected - Review recommended');
  }
  
  if (securityReport.riskScore > 50) {
    recommendations.push('⚠️ High risk score - Manual verification suggested');
  }
  
  if (securityReport.deviceReuseAnalysis.deviceReused) {
    recommendations.push('📱 Device reuse detected - Check for account sharing');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Low fraud risk - Order appears legitimate');
  }
  
  return recommendations;
}

module.exports = router;
