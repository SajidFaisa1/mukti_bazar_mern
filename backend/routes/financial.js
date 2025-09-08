const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const AuditEvent = require('../models/AuditEvent');
const mongoose = require('mongoose');

// Enhanced transaction monitoring with real data
router.get('/transactions', protect, adminOnly, async (req, res) => {
  try {
    const { 
      status = 'all', 
      type = 'all', 
      dateRange = '30d',
      minAmount,
      maxAmount,
      page = 1,
      limit = 50,
      riskLevel = 'all'
    } = req.query;

    // Build query based on filters
    let query = {};
    
    // Date range filter
    const now = new Date();
    let startDate;
    switch (dateRange) {
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
    
    query.createdAt = { $gte: startDate };

    if (status !== 'all') {
      query.status = status;
    }

    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) query.totalAmount.$lte = parseFloat(maxAmount);
    }

    // Get transactions (orders and payments)
    const [orders, payments] = await Promise.all([
      Order.find(query)
        .populate('user', 'firstName lastName email phoneNumber')
        .populate('items.product', 'name vendor category')
        .populate('vendor', 'businessName contactEmail')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      
      Payment.find(query)
        .populate('order')
        .populate('user', 'firstName lastName email phoneNumber')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
    ]);

    // Combine and format transactions
    const transactions = [];

    // Add orders
    orders.forEach(order => {
      const riskLevel = calculateTransactionRisk(order);
      if (riskLevel === 'all' || riskLevel === riskLevel) {
        transactions.push({
          id: order._id,
          type: 'order',
          amount: order.totalAmount,
          status: order.status,
          user: order.user,
          vendor: order.vendor,
          description: `Order #${order._id.toString().slice(-6)}`,
          timestamp: order.createdAt,
          paymentMethod: order.paymentMethod,
          riskLevel,
          riskFactors: getOrderRiskFactors(order),
          itemCount: order.items?.length || 0
        });
      }
    });

    // Add payments
    payments.forEach(payment => {
      const riskLevel = calculatePaymentRisk(payment);
      if (riskLevel === 'all' || riskLevel === riskLevel) {
        transactions.push({
          id: payment._id,
          type: 'payment',
          amount: payment.amount,
          status: payment.status,
          user: payment.user,
          description: `Payment #${payment._id.toString().slice(-6)}`,
          timestamp: payment.createdAt,
          paymentMethod: payment.method,
          gateway: payment.gateway,
          riskLevel,
          riskFactors: getPaymentRiskFactors(payment)
        });
      }
    });

    // Sort by timestamp
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get total counts for pagination
    const [totalOrders, totalPayments] = await Promise.all([
      Order.countDocuments(query),
      Payment.countDocuments(query)
    ]);

    res.json({
      transactions: transactions.slice(0, parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalOrders + totalPayments,
        totalPages: Math.ceil((totalOrders + totalPayments) / parseInt(limit))
      },
      filters: { status, type, dateRange, minAmount, maxAmount, riskLevel }
    });

    // Log access
    await AuditEvent.create({
      type: 'transactions_accessed',
      userId: req.user.id,
      description: `Accessed transaction list with filters: ${JSON.stringify({ status, type, dateRange })}`,
      meta: { filters: { status, type, dateRange, minAmount, maxAmount } }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// Real-time fraud detection alerts
router.get('/fraud-alerts', protect, adminOnly, async (req, res) => {
  try {
    const { severity = 'all', status = 'all', limit = 50 } = req.query;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const alerts = [];

    // 1. Detect multiple high-value transactions from same user
    const highValueTransactions = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: oneDayAgo },
          totalAmount: { $gte: 5000 }
        }
      },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          orders: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gte: 3 } }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      }
    ]);

    highValueTransactions.forEach(item => {
      alerts.push({
        id: `high_value_${item._id}`,
        type: 'high_value_transactions',
        severity: 'high',
        title: 'Multiple High-Value Transactions',
        description: `User ${item.user[0]?.firstName || 'Unknown'} made ${item.count} high-value transactions totaling ৳${item.totalAmount.toLocaleString()}`,
        timestamp: new Date(),
        userId: item._id,
        data: { orderCount: item.count, totalAmount: item.totalAmount },
        status: 'active'
      });
    });

    // 2. Detect rapid succession payments
    const rapidPayments = await Payment.aggregate([
      {
        $match: { 
          createdAt: { $gte: oneDayAgo },
          status: { $ne: 'completed' }
        }
      },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      {
        $match: { count: { $gte: 5 } }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      }
    ]);

    rapidPayments.forEach(item => {
      alerts.push({
        id: `rapid_payments_${item._id}`,
        type: 'rapid_payments',
        severity: 'medium',
        title: 'Rapid Payment Attempts',
        description: `User ${item.user[0]?.firstName || 'Unknown'} attempted ${item.count} payments (${item.failedCount} failed) in 24 hours`,
        timestamp: new Date(),
        userId: item._id,
        data: { paymentCount: item.count, failedCount: item.failedCount },
        status: 'active'
      });
    });

    // 3. Detect new accounts with large purchases
    const suspiciousNewAccounts = await Order.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $match: {
          'userInfo.createdAt': { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          totalAmount: { $gte: 3000 },
          createdAt: { $gte: oneDayAgo }
        }
      },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          user: { $first: { $arrayElemAt: ['$userInfo', 0] } }
        }
      },
      {
        $match: { totalSpent: { $gte: 5000 } }
      }
    ]);

    suspiciousNewAccounts.forEach(item => {
      alerts.push({
        id: `new_account_${item._id}`,
        type: 'suspicious_new_account',
        severity: 'high',
        title: 'New Account High Spending',
        description: `New account (created ${Math.ceil((now - item.user.createdAt) / (1000 * 60 * 60 * 24))} days ago) spent ৳${item.totalSpent.toLocaleString()} in ${item.orderCount} orders`,
        timestamp: new Date(),
        userId: item._id,
        data: { totalSpent: item.totalSpent, orderCount: item.orderCount, accountAge: Math.ceil((now - item.user.createdAt) / (1000 * 60 * 60 * 24)) },
        status: 'active'
      });
    });

    // 4. Detect vendor pricing anomalies
    const pricingAnomalies = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          avgPrice: { $avg: '$items.price' },
          maxPrice: { $max: '$items.price' },
          minPrice: { $min: '$items.price' },
          priceCount: { $sum: 1 }
        }
      },
      {
        $match: {
          priceCount: { $gte: 3 },
          $expr: {
            $gt: [
              { $divide: [{ $subtract: ['$maxPrice', '$minPrice'] }, '$avgPrice'] },
              0.5 // 50% price variation
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $limit: 10 }
    ]);

    pricingAnomalies.forEach(item => {
      const priceVariation = ((item.maxPrice - item.minPrice) / item.avgPrice * 100).toFixed(1);
      alerts.push({
        id: `price_anomaly_${item._id}`,
        type: 'price_anomaly',
        severity: 'medium',
        title: 'Price Manipulation Detected',
        description: `Product "${item.product[0]?.name || 'Unknown'}" shows ${priceVariation}% price variation (৳${item.minPrice} - ৳${item.maxPrice})`,
        timestamp: new Date(),
        productId: item._id,
        data: { avgPrice: item.avgPrice, maxPrice: item.maxPrice, minPrice: item.minPrice, priceVariation },
        status: 'active'
      });
    });

    // Filter alerts by severity and status if specified
    let filteredAlerts = alerts;
    if (severity !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    if (status !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
    }

    // Sort by severity (high > medium > low) and timestamp
    filteredAlerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    res.json({
      alerts: filteredAlerts.slice(0, parseInt(limit)),
      summary: {
        total: filteredAlerts.length,
        high: filteredAlerts.filter(a => a.severity === 'high').length,
        medium: filteredAlerts.filter(a => a.severity === 'medium').length,
        low: filteredAlerts.filter(a => a.severity === 'low').length
      }
    });

    // Log access
    await AuditEvent.create({
      type: 'fraud_alerts_accessed',
      userId: req.user.id,
      description: `Accessed fraud alerts with filters: severity=${severity}, status=${status}`,
      meta: { alertCount: filteredAlerts.length, filters: { severity, status } }
    });

  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({ message: 'Error fetching fraud alerts' });
  }
});

// Enhanced financial analytics and metrics
router.get('/analytics', protect, adminOnly, async (req, res) => {
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

    const [
      revenueData,
      orderStats,
      paymentStats,
      transactionVolume,
      riskAnalysis,
      topVendors,
      fraudStats
    ] = await Promise.all([
      // Revenue analytics
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $in: ['completed', 'shipped', 'delivered'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            completedOrders: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),

      // Order statistics
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' }
          }
        }
      ]),

      // Payment statistics
      Payment.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),

      // Daily transaction volume
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            volume: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Risk level analysis
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            lowRisk: {
              $sum: {
                $cond: [{ $lt: ['$totalAmount', 1000] }, 1, 0]
              }
            },
            mediumRisk: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$totalAmount', 1000] }, { $lt: ['$totalAmount', 5000] }] },
                  1, 0
                ]
              }
            },
            highRisk: {
              $sum: {
                $cond: [{ $gte: ['$totalAmount', 5000] }, 1, 0]
              }
            }
          }
        }
      ]),

      // Top vendors by revenue
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $in: ['completed', 'shipped', 'delivered'] }
          }
        },
        {
          $group: {
            _id: '$vendor',
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'vendors',
            localField: '_id',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]),

      // Fraud and suspicious activity stats
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            flaggedTransactions: {
              $sum: {
                $cond: [{ $eq: ['$status', 'flagged'] }, 1, 0]
              }
            },
            highValueTransactions: {
              $sum: {
                $cond: [{ $gte: ['$totalAmount', 10000] }, 1, 0]
              }
            },
            newAccountOrders: {
              $sum: 1 // Would need user join to calculate properly
            }
          }
        }
      ])
    ]);

    // Calculate platform fees (assuming 5% commission)
    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const platformFees = totalRevenue * 0.05;

    // Format payment method breakdown
    const paymentMethodBreakdown = {};
    orderStats.forEach(stat => {
      paymentMethodBreakdown[stat._id] = {
        count: stat.count,
        value: stat.totalValue
      };
    });

    res.json({
      overview: {
        totalRevenue,
        completedOrders: revenueData[0]?.completedOrders || 0,
        averageOrderValue: revenueData[0]?.avgOrderValue || 0,
        platformFees,
        timeframe
      },
      orderStatistics: orderStats,
      paymentStatistics: paymentStats,
      transactionVolume,
      riskAnalysis: riskAnalysis[0] || { lowRisk: 0, mediumRisk: 0, highRisk: 0 },
      topVendors: topVendors.map(v => ({
        id: v._id,
        name: v.vendorInfo[0]?.businessName || 'Unknown',
        revenue: v.revenue,
        orders: v.orders
      })),
      fraudStatistics: fraudStats[0] || { flaggedTransactions: 0, highValueTransactions: 0 },
      generatedAt: new Date()
    });

    // Log access
    await AuditEvent.create({
      type: 'financial_analytics_accessed',
      userId: req.user.id,
      description: `Accessed financial analytics for ${timeframe}`,
      meta: { timeframe, totalRevenue, completedOrders: revenueData[0]?.completedOrders || 0 }
    });

  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({ message: 'Error fetching financial analytics' });
  }
});

// Risk assessment for specific transaction
router.get('/risk-assessment/:transactionId', protect, adminOnly, async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Find transaction (could be order or payment)
    const [order, payment] = await Promise.all([
      Order.findById(transactionId)
        .populate('user', 'firstName lastName email phoneNumber createdAt')
        .populate('vendor', 'businessName contactEmail createdAt')
        .populate('items.product', 'name category'),
      Payment.findById(transactionId)
        .populate('user', 'firstName lastName email phoneNumber createdAt')
        .populate('order')
    ]);

    const transaction = order || payment;
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Calculate comprehensive risk factors
    const riskFactors = [];
    let riskScore = 0;

    if (order) {
      // Order-specific risk factors
      if (order.totalAmount > 10000) {
        riskFactors.push('High transaction value (>৳10,000)');
        riskScore += 30;
      }

      if (order.user && !order.user.verification?.status === 'verified') {
        riskFactors.push('Unverified user account');
        riskScore += 25;
      }

      // Check account age
      if (order.user?.createdAt) {
        const accountAge = (new Date() - order.user.createdAt) / (1000 * 60 * 60 * 24);
        if (accountAge < 7) {
          riskFactors.push('New user account (less than 7 days old)');
          riskScore += 35;
        } else if (accountAge < 30) {
          riskFactors.push('Recent user account (less than 30 days old)');
          riskScore += 15;
        }
      }

      // Check user's order history
      const userOrderCount = await Order.countDocuments({ user: order.user._id });
      if (userOrderCount === 1) {
        riskFactors.push('First-time buyer');
        riskScore += 20;
      }

      // Check for rapid orders from same user
      const recentOrders = await Order.countDocuments({
        user: order.user._id,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      if (recentOrders > 3) {
        riskFactors.push(`Multiple orders in 24 hours (${recentOrders})`);
        riskScore += 25;
      }

      // Check vendor reputation
      if (order.vendor?.createdAt) {
        const vendorAge = (new Date() - order.vendor.createdAt) / (1000 * 60 * 60 * 24);
        if (vendorAge < 30) {
          riskFactors.push('New vendor (less than 30 days)');
          riskScore += 20;
        }
      }

    } else if (payment) {
      // Payment-specific risk factors
      if (payment.status === 'failed') {
        riskFactors.push('Failed payment transaction');
        riskScore += 40;
      }

      if (payment.amount > 5000) {
        riskFactors.push('High payment amount (>৳5,000)');
        riskScore += 20;
      }

      if (payment.gateway === 'unknown' || !payment.gateway) {
        riskFactors.push('Unknown or unspecified payment gateway');
        riskScore += 15;
      }

      // Check for multiple failed payments from same user
      const failedPayments = await Payment.countDocuments({
        user: payment.user._id,
        status: 'failed',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      if (failedPayments > 2) {
        riskFactors.push(`Multiple failed payments (${failedPayments} in 24h)`);
        riskScore += 30;
      }
    }

    // Determine risk level
    let riskLevel;
    if (riskScore >= 70) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    const assessment = {
      transactionId,
      transactionType: order ? 'order' : 'payment',
      riskLevel,
      riskScore,
      riskFactors,
      recommendation: getRiskRecommendation(riskLevel, riskScore),
      assessmentDate: new Date(),
      details: {
        amount: order ? order.totalAmount : payment.amount,
        user: transaction.user,
        vendor: order?.vendor || null,
        status: transaction.status,
        paymentMethod: order?.paymentMethod || payment?.method
      }
    };

    res.json(assessment);

    // Log risk assessment
    await AuditEvent.create({
      type: 'risk_assessment_performed',
      userId: req.user.id,
      description: `Performed risk assessment for transaction ${transactionId}`,
      meta: { 
        transactionId, 
        riskLevel, 
        riskScore, 
        transactionType: order ? 'order' : 'payment'
      }
    });

  } catch (error) {
    console.error('Error assessing transaction risk:', error);
    res.status(500).json({ message: 'Error assessing transaction risk' });
  }
});

// Helper functions
function calculateTransactionRisk(order) {
  let riskScore = 0;
  
  if (order.totalAmount > 10000) riskScore += 30;
  if (order.totalAmount > 5000) riskScore += 15;
  if (order.paymentMethod === 'cash_on_delivery') riskScore += 10;
  
  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  return 'low';
}

function calculatePaymentRisk(payment) {
  let riskScore = 0;
  
  if (payment.status === 'failed') riskScore += 40;
  if (payment.amount > 5000) riskScore += 20;
  if (!payment.gateway || payment.gateway === 'unknown') riskScore += 15;
  
  if (riskScore >= 40) return 'high';
  if (riskScore >= 20) return 'medium';
  return 'low';
}

function getOrderRiskFactors(order) {
  const factors = [];
  
  if (order.totalAmount > 10000) factors.push('High value transaction');
  if (order.paymentMethod === 'cash_on_delivery') factors.push('Cash on delivery');
  if (order.items && order.items.length > 10) factors.push('Large quantity order');
  
  return factors;
}

function getPaymentRiskFactors(payment) {
  const factors = [];
  
  if (payment.status === 'failed') factors.push('Failed payment');
  if (payment.amount > 5000) factors.push('High amount');
  if (!payment.gateway) factors.push('Unknown gateway');
  
  return factors;
}

function getRiskRecommendation(riskLevel, riskScore) {
  switch (riskLevel) {
    case 'high':
      if (riskScore >= 80) {
        return 'IMMEDIATE ACTION REQUIRED: Block transaction and require manual verification';
      }
      return 'HIGH RISK: Requires immediate review and additional verification';
    case 'medium':
      return 'MODERATE RISK: Monitor closely and consider additional verification steps';
    case 'low':
      return 'LOW RISK: Normal processing with routine monitoring';
    default:
      return 'Continue standard monitoring procedures';
  }
}

module.exports = router;
