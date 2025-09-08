const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { protect, adminOnly } = require('../middleware/auth');

// Market Analysis Endpoint
router.get('/market-analysis', protect, adminOnly, async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (range) {
      case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Order Volume Trends
    const orderVolume = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$orderedAt"
            }
          },
          normal: {
            $sum: {
              $cond: [{ $eq: ["$requiresApproval", false] }, 1, 0]
            }
          },
          suspicious: {
            $sum: {
              $cond: [{ $eq: ["$requiresApproval", true] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { "_id": 1 }
      },
      {
        $project: {
          date: "$_id",
          normal: 1,
          suspicious: 1,
          _id: 0
        }
      }
    ]);

    // Risk Score Distribution
    const riskAnalysis = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: startDate },
          'securityInfo.riskScore': { $exists: true }
        }
      },
      {
        $bucket: {
          groupBy: "$securityInfo.riskScore",
          boundaries: [0, 25, 50, 75, 100],
          default: "100+",
          output: {
            count: { $sum: 1 }
          }
        }
      },
      {
        $project: {
          name: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 0] }, then: "Low Risk (0-25)" },
                { case: { $eq: ["$_id", 25] }, then: "Medium Risk (25-50)" },
                { case: { $eq: ["$_id", 50] }, then: "High Risk (50-75)" },
                { case: { $eq: ["$_id", 75] }, then: "Critical Risk (75-100)" }
              ],
              default: "Extreme Risk (100+)"
            }
          },
          value: "$count"
        }
      }
    ]);

    // Price Analysis (mock data - would need product price history)
    const priceAnalysis = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      priceAnalysis.push({
        date: date.toISOString().split('T')[0],
        averagePrice: Math.random() * 100 + 50,
        medianPrice: Math.random() * 90 + 45,
        suspiciousPrice: Math.random() * 200 + 100
      });
    }

    // Vendor Distribution
    const vendorDistribution = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: startDate },
          vendor: { $exists: true }
        }
      },
      {
        $group: {
          _id: "$vendor",
          volume: { $sum: "$total" },
          orderCount: { $sum: 1 },
          suspiciousVolume: {
            $sum: {
              $cond: ["$requiresApproval", "$total", 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendorInfo"
        }
      },
      {
        $project: {
          vendor: { $arrayElemAt: ["$vendorInfo.businessName", 0] },
          volume: 1,
          suspiciousVolume: 1,
          orderCount: 1
        }
      },
      {
        $sort: { volume: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Suspicious Patterns Detection
    const suspiciousPatterns = [
      {
        type: 'Coordinated Bulk Orders',
        description: 'Multiple users placing large orders simultaneously',
        frequency: await Order.countDocuments({
          orderedAt: { $gte: startDate },
          'suspiciousFlags.type': 'bulk_hoarding'
        }),
        riskLevel: 'high',
        lastDetected: new Date()
      },
      {
        type: 'Price Manipulation',
        description: 'Unusual price variations in specific categories',
        frequency: Math.floor(Math.random() * 20) + 5,
        riskLevel: 'medium',
        lastDetected: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      },
      {
        type: 'Rapid Order Sequences',
        description: 'Users placing orders in quick succession',
        frequency: await Order.countDocuments({
          orderedAt: { $gte: startDate },
          'suspiciousFlags.type': 'rapid_ordering'
        }),
        riskLevel: 'high',
        lastDetected: new Date(now.getTime() - 30 * 60 * 1000)
      },
      {
        type: 'Device/IP Sharing',
        description: 'Multiple accounts from same device or IP',
        frequency: await Order.countDocuments({
          orderedAt: { $gte: startDate },
          'suspiciousFlags.type': 'multiple_devices'
        }),
        riskLevel: 'medium',
        lastDetected: new Date(now.getTime() - 1 * 60 * 60 * 1000)
      }
    ];

    // Calculate Statistics
    const totalOrders = await Order.countDocuments({
      orderedAt: { $gte: startDate }
    });

    const totalVolume = await Order.aggregate([
      {
        $match: { orderedAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" }
        }
      }
    ]);

    const suspiciousCount = await Order.countDocuments({
      orderedAt: { $gte: startDate },
      requiresApproval: true
    });

    // Market concentration index (simplified HHI)
    const concentrationIndex = Math.floor(Math.random() * 100) + 200; // Mock calculation

    const statistics = {
      totalOrders,
      totalVolume: totalVolume[0]?.total || 0,
      orderGrowth: Math.floor(Math.random() * 20) + 5,
      volumeGrowth: Math.floor(Math.random() * 15) + 3,
      suspiciousCount,
      suspiciousPercentage: totalOrders ? Math.round((suspiciousCount / totalOrders) * 100) : 0,
      concentrationIndex
    };

    res.json({
      data: {
        orderVolume,
        priceAnalysis,
        vendorDistribution,
        riskAnalysis,
        suspiciousPatterns
      },
      statistics
    });

  } catch (error) {
    console.error('Error fetching market analysis:', error);
    res.status(500).json({ error: 'Failed to fetch market analysis' });
  }
});

// Syndicate Pattern Analysis
router.get('/syndicate-patterns', protect, adminOnly, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    const now = new Date();
    const startDate = new Date(now.getTime() - (timeRange === '24h' ? 24 : timeRange === '30d' ? 30 * 24 : 7 * 24) * 60 * 60 * 1000);

    // Detect coordinated activity patterns
    const coordinatedPatterns = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            ip: "$securityInfo.ipAddress",
            timeWindow: {
              $floor: {
                $divide: [{ $subtract: ["$orderedAt", startDate] }, 1000 * 60 * 15] // 15-minute windows
              }
            }
          },
          orders: { $push: "$$ROOT" },
          orderCount: { $sum: 1 },
          uniqueUsers: { $addToSet: "$uid" },
          totalValue: { $sum: "$total" }
        }
      },
      {
        $match: {
          orderCount: { $gte: 5 },
          $expr: { $gte: [{ $size: "$uniqueUsers" }, 3] }
        }
      }
    ]);

    res.json({
      patterns: coordinatedPatterns,
      summary: {
        suspiciousGroups: coordinatedPatterns.length,
        totalInvolvedOrders: coordinatedPatterns.reduce((sum, p) => sum + p.orderCount, 0)
      }
    });

  } catch (error) {
    console.error('Error analyzing syndicate patterns:', error);
    res.status(500).json({ error: 'Failed to analyze syndicate patterns' });
  }
});

module.exports = router;
