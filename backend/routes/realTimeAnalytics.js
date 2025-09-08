const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// Market analytics dashboard data
router.get('/analytics/market-overview', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get sales data over time
    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['completed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get category performance
    const categoryData = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          avgPrice: { $avg: '$unitPrice' }
        }
      },
      {
        $sort: { productCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get top performing vendors
    const topVendors = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['completed', 'shipped', 'delivered'] }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $unwind: '$productDetails'
      },
      {
        $group: {
          _id: '$productDetails.vendor',
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $unwind: '$vendor'
      },
      {
        $sort: { totalSales: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          vendorName: '$vendor.businessName',
          totalSales: 1,
          orderCount: 1,
          avgOrderValue: { $divide: ['$totalSales', '$orderCount'] }
        }
      }
    ]);

    // Get user growth data
    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          newUsers: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Calculate key metrics
    const totalRevenue = salesData.reduce((sum, day) => sum + day.sales, 0);
    const totalOrders = salesData.reduce((sum, day) => sum + day.orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      overview: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        timeframe
      },
      salesTrend: salesData,
      categoryPerformance: categoryData,
      topVendors,
      userGrowth,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error fetching market analytics:', error);
    res.status(500).json({ message: 'Error fetching market analytics' });
  }
});

// Product analytics
router.get('/analytics/products', async (req, res) => {
  try {
    const { category, vendor } = req.query;
    
    let matchConditions = {};
    if (category && category !== 'all') {
      matchConditions.category = category;
    }
    if (vendor && vendor !== 'all') {
      matchConditions.vendor = new mongoose.Types.ObjectId(vendor);
    }

    // Get product performance metrics
    const productMetrics = await Product.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendor',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      {
        $unwind: '$vendorInfo'
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          averagePrice: { $avg: '$unitPrice' },
          categories: { $addToSet: '$category' },
          statusBreakdown: {
            $push: {
              status: '$status',
              count: 1
            }
          }
        }
      }
    ]);

    // Get most viewed/popular products (would need view tracking)
    const popularProducts = await Product.find(matchConditions)
      .populate('vendor', 'businessName')
      .sort({ createdAt: -1 }) // Sort by newest for now, would use view count
      .limit(10)
      .select('name unitPrice category vendor images');

    // Get price distribution
    const priceDistribution = await Product.aggregate([
      { $match: matchConditions },
      {
        $bucket: {
          groupBy: '$unitPrice',
          boundaries: [0, 100, 500, 1000, 5000, 10000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            averagePrice: { $avg: '$unitPrice' }
          }
        }
      }
    ]);

    // Get inventory status
    const inventoryStatus = await Product.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ['$totalQty', 0] }, then: 'Out of Stock' },
                { case: { $lte: ['$totalQty', 10] }, then: 'Low Stock' },
                { case: { $lte: ['$totalQty', 50] }, then: 'Medium Stock' },
                { case: { $gt: ['$totalQty', 50] }, then: 'High Stock' }
              ],
              default: 'Unknown'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      metrics: productMetrics[0] || {
        totalProducts: 0,
        averagePrice: 0,
        categories: [],
        statusBreakdown: []
      },
      popularProducts,
      priceDistribution,
      inventoryStatus,
      filters: { category, vendor }
    });

  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({ message: 'Error fetching product analytics' });
  }
});

// User behavior analytics
router.get('/analytics/users', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User registration trends
    const registrationTrends = await User.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          registrations: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // User demographics (location-based)
    const locationData = await User.aggregate([
      {
        $group: {
          _id: '$division',
          userCount: { $sum: 1 }
        }
      },
      {
        $sort: { userCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // User status breakdown
    const statusBreakdown = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Active vs inactive users (based on last login)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activityData = await User.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $gte: ['$lastLoginAt', sevenDaysAgo] },
              'Active (7 days)',
              'Inactive'
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // User verification status
    const verificationStatus = await User.aggregate([
      {
        $group: {
          _id: '$verification.status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      registrationTrends,
      locationData,
      statusBreakdown,
      activityData,
      verificationStatus,
      summary: {
        totalUsers: await User.countDocuments(),
        newUsersThisMonth: await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        activeUsers: await User.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
        verifiedUsers: await User.countDocuments({ 'verification.status': 'verified' })
      }
    });

  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: 'Error fetching user analytics' });
  }
});

// Vendor analytics
router.get('/analytics/vendors', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Vendor registration trends
    const vendorTrends = await Vendor.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          registrations: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Vendor performance (products and sales)
    const vendorPerformance = await Vendor.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'vendor',
          as: 'products'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' },
          avgProductPrice: { $avg: '$products.unitPrice' }
        }
      },
      {
        $project: {
          businessName: 1,
          email: 1,
          status: 1,
          productCount: 1,
          avgProductPrice: 1,
          createdAt: 1
        }
      },
      {
        $sort: { productCount: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // Vendor status breakdown
    const statusBreakdown = await Vendor.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Location distribution
    const locationData = await Vendor.aggregate([
      {
        $group: {
          _id: '$division',
          vendorCount: { $sum: 1 }
        }
      },
      {
        $sort: { vendorCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      vendorTrends,
      vendorPerformance,
      statusBreakdown,
      locationData,
      summary: {
        totalVendors: await Vendor.countDocuments(),
        newVendorsThisMonth: await Vendor.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        activeVendors: await Vendor.countDocuments({ status: 'active' }),
        pendingVendors: await Vendor.countDocuments({ status: 'pending' })
      }
    });

  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    res.status(500).json({ message: 'Error fetching vendor analytics' });
  }
});

// Financial analytics
router.get('/analytics/financial', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Revenue trends
    const revenueTrends = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['completed', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Payment method breakdown
    const paymentMethods = await Order.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Order status analysis
    const orderStatus = await Order.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          value: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      revenueTrends,
      paymentMethods,
      orderStatus,
      summary: {
        totalRevenue: revenueTrends.reduce((sum, day) => sum + day.revenue, 0),
        totalOrders: revenueTrends.reduce((sum, day) => sum + day.orderCount, 0),
        timeframe
      }
    });

  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({ message: 'Error fetching financial analytics' });
  }
});

module.exports = router;
