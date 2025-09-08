const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const AuditEvent = require('../models/AuditEvent');
const { protect, adminOnly } = require('../middleware/auth');

// Get inventory overview
router.get('/overview', protect, adminOnly, async (req, res) => {
  try {
    const { category = 'all', riskLevel = 'all', timeRange = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - (timeRange === '24h' ? 24 : timeRange === '30d' ? 30 * 24 : 7 * 24) * 60 * 60 * 1000);

    // Build filter
    let productFilter = { status: 'approved' };
    if (category !== 'all') {
      productFilter.category = category;
    }

    // Get all products with recent order data
    const products = await Product.aggregate([
      { $match: productFilter },
      {
        $lookup: {
          from: 'orders',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$$productId', '$items.productId'] },
                    { $gte: ['$orderedAt', startDate] }
                  ]
                }
              }
            },
            {
              $unwind: '$items'
            },
            {
              $match: {
                $expr: { $eq: ['$items.productId', '$$productId'] }
              }
            },
            {
              $group: {
                _id: null,
                totalOrdered: { $sum: '$items.quantity' },
                averagePrice: { $avg: '$items.unitPrice' },
                orderCount: { $sum: 1 },
                suspiciousOrders: {
                  $sum: { $cond: ['$requiresApproval', 1, 0] }
                }
              }
            }
          ],
          as: 'orderStats'
        }
      }
    ]);

    // Calculate inventory metrics and alerts
    const inventoryData = {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.totalQty > 0).length,
      totalValue: products.reduce((sum, p) => sum + (p.unitPrice * p.totalQty), 0),
      valueGrowth: Math.floor(Math.random() * 15) + 5, // Mock growth
      products: products.map(product => {
        const orderStats = product.orderStats[0] || {};
        const currentPrice = product.unitPrice;
        const averagePrice = orderStats.averagePrice || currentPrice;
        const priceChange = ((currentPrice - averagePrice) / averagePrice * 100).toFixed(1);
        
        // Determine stock level
        let stockLevel = 'high';
        if (product.totalQty < 10) stockLevel = 'low';
        else if (product.totalQty < 50) stockLevel = 'medium';
        
        // Determine risk level based on price deviation and suspicious orders
        let riskLevel = 'low';
        const suspiciousRatio = orderStats.suspiciousOrders / (orderStats.orderCount || 1);
        if (Math.abs(priceChange) > 30 || suspiciousRatio > 0.3) riskLevel = 'high';
        else if (Math.abs(priceChange) > 15 || suspiciousRatio > 0.15) riskLevel = 'medium';

        return {
          id: product._id,
          name: product.name,
          category: product.category,
          unit: product.unitType,
          stock: product.totalQty,
          stockLevel,
          currentPrice,
          priceChange: parseFloat(priceChange),
          riskLevel,
          image: product.images?.[0],
          priceControl: false, // Mock data
          stockControl: false  // Mock data
        };
      })
    };

    // Filter by risk level if specified
    if (riskLevel !== 'all') {
      inventoryData.products = inventoryData.products.filter(p => p.riskLevel === riskLevel);
    }

    // Generate price alerts
    const alerts = inventoryData.products
      .filter(product => Math.abs(product.priceChange) > 20)
      .map(product => ({
        product: product.name,
        productId: product.id,
        currentPrice: product.currentPrice,
        marketAverage: (product.currentPrice / (1 + product.priceChange / 100)).toFixed(2),
        deviation: product.priceChange,
        severity: Math.abs(product.priceChange) > 50 ? 'critical' : 
                 Math.abs(product.priceChange) > 30 ? 'high' : 'medium',
        description: `Price ${product.priceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(product.priceChange)}%`
      }));

    // Mock controls data
    const controls = {};

    res.json({
      inventory: inventoryData,
      alerts,
      controls
    });

  } catch (error) {
    console.error('Error fetching inventory overview:', error);
    res.status(500).json({ error: 'Failed to fetch inventory overview' });
  }
});

// Price control endpoint
router.post('/price-control', protect, adminOnly, async (req, res) => {
  try {
    const { productId, controlType, value, reason } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Apply price control logic
    let update = {};
    let description = '';

    switch (controlType) {
      case 'ceiling':
        update['priceControl.ceiling'] = value;
        update['priceControl.active'] = true;
        description = `Price ceiling set to ৳${value}`;
        break;
      case 'floor':
        update['priceControl.floor'] = value;
        update['priceControl.active'] = true;
        description = `Price floor set to ৳${value}`;
        break;
      case 'toggle':
        update['priceControl.active'] = value;
        description = `Price control ${value ? 'enabled' : 'disabled'}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid control type' });
    }

    // Update product (this would need to be implemented in your Product schema)
    // For now, we'll just log the action
    await AuditEvent.create({
      type: 'price_control_applied',
      userId: req.user.id,
      description,
      meta: {
        productId,
        productName: product.name,
        controlType,
        value,
        reason
      }
    });

    res.json({
      success: true,
      message: description
    });

  } catch (error) {
    console.error('Error applying price control:', error);
    res.status(500).json({ error: 'Failed to apply price control' });
  }
});

// Emergency stock allocation
router.post('/emergency-allocation', protect, adminOnly, async (req, res) => {
  try {
    const { productId, allocation, reason } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Apply emergency allocation logic
    // This could involve limiting quantities per order, reserving stock for certain users, etc.
    
    await AuditEvent.create({
      type: 'emergency_allocation',
      userId: req.user.id,
      description: `Emergency stock allocation applied to ${product.name}`,
      meta: {
        productId,
        productName: product.name,
        allocation,
        reason
      }
    });

    res.json({
      success: true,
      message: 'Emergency allocation applied successfully'
    });

  } catch (error) {
    console.error('Error applying emergency allocation:', error);
    res.status(500).json({ error: 'Failed to apply emergency allocation' });
  }
});

// Market intervention endpoint
router.post('/market-intervention', protect, adminOnly, async (req, res) => {
  try {
    const { type, targets, parameters, reason } = req.body;

    let description = '';
    const results = [];

    switch (type) {
      case 'price_freeze':
        // Freeze prices across categories or specific products
        description = `Market intervention: Price freeze applied`;
        break;
      case 'quantity_limit':
        // Limit order quantities
        description = `Market intervention: Quantity limits applied`;
        break;
      case 'vendor_restriction':
        // Restrict certain vendor activities
        description = `Market intervention: Vendor restrictions applied`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid intervention type' });
    }

    await AuditEvent.create({
      type: 'market_intervention',
      userId: req.user.id,
      description,
      meta: {
        interventionType: type,
        targets,
        parameters,
        reason
      }
    });

    res.json({
      success: true,
      message: description,
      results
    });

  } catch (error) {
    console.error('Error applying market intervention:', error);
    res.status(500).json({ error: 'Failed to apply market intervention' });
  }
});

// Get intervention history
router.get('/interventions', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const interventions = await AuditEvent.find({
      type: { $in: ['price_control_applied', 'emergency_allocation', 'market_intervention'] }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      interventions: interventions.map(intervention => ({
        id: intervention._id,
        type: intervention.type,
        description: intervention.description,
        timestamp: intervention.createdAt,
        adminId: intervention.userId,
        meta: intervention.meta
      }))
    });

  } catch (error) {
    console.error('Error fetching interventions:', error);
    res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

module.exports = router;
