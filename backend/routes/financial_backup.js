const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const AuditEvent = require('../models/AuditEvent');

// Mock financial data - replace with actual database queries
const generateMockTransactions = (count = 50) => {
  const transactions = [];
  const statuses = ['completed', 'pending', 'flagged', 'failed'];
  const riskLevels = ['low', 'medium', 'high'];
  const buyers = ['John Doe', 'Jane Smith', 'Ahmed Rahman', 'Fatima Khan', 'Mohammad Ali'];
  const vendors = ['Fresh Mart', 'Green Valley', 'Golden Harvest', 'Pure Organic', 'Nature\'s Best'];

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    transactions.push({
      id: `TXN${String(i + 1).padStart(6, '0')}`,
      amount: Math.floor(Math.random() * 50000) + 1000, // 1000-51000 BDT
      buyerName: buyers[Math.floor(Math.random() * buyers.length)],
      vendorName: vendors[Math.floor(Math.random() * vendors.length)],
      riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt,
      type: 'product_purchase',
      paymentMethod: 'digital_wallet'
    });
  }

  return transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const generateSuspiciousActivity = () => {
  return [
    {
      id: '1',
      title: 'Unusual Large Transaction Volume',
      description: 'Vendor "Fresh Mart" processed 15 transactions above 25,000 BDT in the last hour',
      riskLevel: 'high',
      amount: 375000,
      detectedAt: new Date(Date.now() - 30 * 60 * 1000),
      type: 'volume_anomaly',
      affectedEntities: ['vendor_12345'],
      status: 'investigating'
    },
    {
      id: '2',
      title: 'Price Manipulation Detected',
      description: 'Multiple vendors selling identical products with 40% price variations',
      riskLevel: 'medium',
      amount: 0,
      detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: 'price_manipulation',
      affectedEntities: ['vendor_12345', 'vendor_67890', 'vendor_11111'],
      status: 'pending_review'
    },
    {
      id: '3',
      title: 'Rapid Account Creation with Purchases',
      description: '8 new accounts created and made purchases within 5 minutes',
      riskLevel: 'high',
      amount: 96000,
      detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      type: 'account_manipulation',
      affectedEntities: ['multiple_users'],
      status: 'resolved'
    }
  ];
};

const generateChartData = (timeframe) => {
  const days = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toLocaleDateString(),
      volume: Math.floor(Math.random() * 500000) + 100000,
      count: Math.floor(Math.random() * 200) + 50,
      highRisk: Math.floor(Math.random() * 20) + 5,
      mediumRisk: Math.floor(Math.random() * 50) + 20,
      lowRisk: Math.floor(Math.random() * 100) + 150
    });
  }

  return data;
};

// Get financial statistics
router.get('/statistics', protect, adminOnly, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    // Mock calculations - replace with actual database aggregations
    const transactions = generateMockTransactions(1000);
    const timeframeDays = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const cutoffDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);
    
    const recentTransactions = transactions.filter(t => new Date(t.createdAt) > cutoffDate);
    
    const stats = {
      totalVolume: recentTransactions.reduce((sum, t) => sum + t.amount, 0),
      totalTransactions: recentTransactions.length,
      suspiciousCount: generateSuspiciousActivity().length,
      flaggedCount: recentTransactions.filter(t => t.status === 'flagged').length,
      volumeChange: Math.floor(Math.random() * 20) + 5, // Mock percentage change
      transactionChange: Math.floor(Math.random() * 15) + 3,
      suspiciousChange: Math.floor(Math.random() * 10) - 5,
      lowRisk: recentTransactions.filter(t => t.riskLevel === 'low').length,
      mediumRisk: recentTransactions.filter(t => t.riskLevel === 'medium').length,
      highRisk: recentTransactions.filter(t => t.riskLevel === 'high').length,
    };

    res.json({ stats });

    // Log access
    await AuditEvent.create({
      type: 'financial_statistics_accessed',
      userId: req.user.id,
      description: `Viewed financial statistics for ${timeframe}`,
      meta: { timeframe }
    });

  } catch (error) {
    console.error('Error fetching financial statistics:', error);
    res.status(500).json({ error: 'Failed to fetch financial statistics' });
  }
});

// Get recent transactions
router.get('/transactions', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 50, offset = 0, riskLevel, status } = req.query;
    
    let transactions = generateMockTransactions(200);
    
    // Apply filters
    if (riskLevel) {
      transactions = transactions.filter(t => t.riskLevel === riskLevel);
    }
    
    if (status) {
      transactions = transactions.filter(t => t.status === status);
    }
    
    // Apply pagination
    const paginatedTransactions = transactions.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      transactions: paginatedTransactions,
      total: transactions.length,
      hasMore: parseInt(offset) + parseInt(limit) < transactions.length
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get suspicious activity
router.get('/suspicious-activity', protect, adminOnly, async (req, res) => {
  try {
    const activities = generateSuspiciousActivity();
    
    res.json({
      activities,
      total: activities.length,
      summary: {
        high: activities.filter(a => a.riskLevel === 'high').length,
        medium: activities.filter(a => a.riskLevel === 'medium').length,
        low: activities.filter(a => a.riskLevel === 'low').length
      }
    });

    // Log access
    await AuditEvent.create({
      type: 'suspicious_activity_reviewed',
      userId: req.user.id,
      description: 'Reviewed suspicious financial activity',
      meta: { activityCount: activities.length }
    });

  } catch (error) {
    console.error('Error fetching suspicious activity:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious activity' });
  }
});

// Get chart data
router.get('/charts', protect, adminOnly, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    const chartData = generateChartData(timeframe);
    
    res.json({
      chartData,
      timeframe,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generating chart data:', error);
    res.status(500).json({ error: 'Failed to generate chart data' });
  }
});

// Flag a transaction
router.post('/transactions/:transactionId/flag', protect, adminOnly, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for flagging' });
    }

    // In production, update the actual transaction in database
    // For now, just log the action
    
    res.json({
      success: true,
      message: 'Transaction flagged successfully',
      transactionId,
      flaggedBy: req.user.id,
      flaggedAt: new Date()
    });

    // Log the flagging action
    await AuditEvent.create({
      type: 'transaction_flagged',
      userId: req.user.id,
      description: `Flagged transaction ${transactionId} for: ${reason}`,
      meta: { 
        transactionId, 
        reason, 
        notes,
        action: 'manual_flag'
      }
    });

  } catch (error) {
    console.error('Error flagging transaction:', error);
    res.status(500).json({ error: 'Failed to flag transaction' });
  }
});

// Start investigation on a transaction
router.post('/transactions/:transactionId/investigate', protect, adminOnly, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { priority = 'normal', assignedTo } = req.body;

    // In production, create investigation record in database
    
    res.json({
      success: true,
      message: 'Investigation started successfully',
      investigationId: `INV${Date.now()}`,
      transactionId,
      startedBy: req.user.id,
      startedAt: new Date(),
      priority
    });

    // Log the investigation start
    await AuditEvent.create({
      type: 'transaction_investigation_started',
      userId: req.user.id,
      description: `Started investigation for transaction ${transactionId}`,
      meta: { 
        transactionId, 
        priority,
        assignedTo,
        action: 'start_investigation'
      }
    });

  } catch (error) {
    console.error('Error starting investigation:', error);
    res.status(500).json({ error: 'Failed to start investigation' });
  }
});

// Get transaction details
router.get('/transactions/:transactionId', protect, adminOnly, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Mock detailed transaction data
    const transaction = {
      id: transactionId,
      amount: 25000,
      buyerName: 'John Doe',
      buyerId: 'user_12345',
      vendorName: 'Fresh Mart',
      vendorId: 'vendor_67890',
      productName: 'Organic Rice 25kg',
      productId: 'product_11111',
      riskLevel: 'high',
      riskFactors: [
        'Large amount for new account',
        'Vendor has multiple flagged transactions',
        'Unusual purchasing pattern'
      ],
      status: 'flagged',
      paymentMethod: 'digital_wallet',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000),
      flags: [
        {
          id: 'flag_1',
          reason: 'manual_review',
          flaggedBy: 'admin_001',
          flaggedAt: new Date(Date.now() - 30 * 60 * 1000),
          notes: 'Requires verification due to high amount'
        }
      ],
      investigations: [],
      metadata: {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        deviceFingerprint: 'abc123def456',
        location: 'Dhaka, Bangladesh'
      }
    };

    res.json({ transaction });

    // Log access to transaction details
    await AuditEvent.create({
      type: 'transaction_details_accessed',
      userId: req.user.id,
      description: `Accessed details for transaction ${transactionId}`,
      meta: { transactionId }
    });

  } catch (error) {
    console.error('Error fetching transaction details:', error);
    res.status(500).json({ error: 'Failed to fetch transaction details' });
  }
});

// Generate financial report
router.post('/reports/generate', protect, adminOnly, async (req, res) => {
  try {
    const { 
      reportType, 
      timeframe, 
      includeTransactions = true, 
      includeSuspicious = true,
      format = 'json' 
    } = req.body;

    if (!reportType || !timeframe) {
      return res.status(400).json({ error: 'Report type and timeframe are required' });
    }

    // Generate report ID
    const reportId = `RPT${Date.now()}`;
    
    // In production, generate actual report and store in database
    const report = {
      id: reportId,
      type: reportType,
      timeframe,
      generatedBy: req.user.id,
      generatedAt: new Date(),
      status: 'generating',
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      format,
      summary: {
        totalTransactions: 1250,
        totalVolume: 45750000,
        suspiciousActivities: 23,
        flaggedTransactions: 45
      }
    };

    res.json({
      success: true,
      report,
      message: 'Report generation started. You will be notified when complete.'
    });

    // Log report generation
    await AuditEvent.create({
      type: 'financial_report_generated',
      userId: req.user.id,
      description: `Generated ${reportType} financial report for ${timeframe}`,
      meta: { 
        reportId, 
        reportType, 
        timeframe, 
        format 
      }
    });

  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
});

module.exports = router;
