const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const AuditEvent = require('../models/AuditEvent');
const mongoose = require('mongoose');

// Product management with advanced filtering
router.get('/products/management', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      category = 'all',
      riskLevel = 'all',
      priceRange = 'all',
      limit = 100,
      page = 1
    } = req.query;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (category !== 'all') {
      query.category = category;
    }

    if (riskLevel !== 'all') {
      query.riskLevel = riskLevel;
    }

    if (priceRange !== 'all') {
      const ranges = {
        'low': { $lt: 1000 },
        'medium': { $gte: 1000, $lt: 5000 },
        'high': { $gte: 5000 }
      };
      if (ranges[priceRange]) {
        query.price = ranges[priceRange];
      }
    }

    const products = await Product.find(query)
      .populate('vendor', 'businessName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Product.countDocuments(query);

    // Enhance products with risk assessment
    const enrichedProducts = products.map(product => ({
      ...product.toObject(),
      riskLevel: calculateProductRiskLevel(product),
      salesCount: product.salesCount || 0
    }));

    res.json({
      products: enrichedProducts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Vendor management with advanced filtering
router.get('/vendors/management', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      riskLevel = 'all',
      limit = 100,
      page = 1
    } = req.query;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (riskLevel !== 'all') {
      query.riskLevel = riskLevel;
    }

    const vendors = await Vendor.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Vendor.countDocuments(query);

    // Enhance vendors with additional data
    const enrichedVendors = await Promise.all(vendors.map(async (vendor) => {
      const productCount = await Product.countDocuments({ vendor: vendor._id });
      const totalSales = await calculateVendorTotalSales(vendor._id);
      
      return {
        ...vendor.toObject(),
        productCount,
        totalSales,
        rating: vendor.rating || 0,
        riskLevel: calculateVendorRiskLevel(vendor)
      };
    }));

    res.json({
      vendors: enrichedVendors,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Error fetching vendors' });
  }
});

// Content reports (placeholder for content moderation)
router.get('/content/reports', async (req, res) => {
  try {
    // This would integrate with a content reporting system
    // For now, return mock data
    const reports = [
      {
        id: '1',
        type: 'inappropriate_content',
        targetType: 'product',
        targetId: '507f1f77bcf86cd799439011',
        reportedBy: '507f1f77bcf86cd799439012',
        reason: 'Misleading product description',
        status: 'pending',
        createdAt: new Date(),
        priority: 'high'
      }
    ];

    res.json({ reports });

  } catch (error) {
    console.error('Error fetching content reports:', error);
    res.status(500).json({ message: 'Error fetching content reports' });
  }
});

// Bulk actions for products
router.post('/products/bulk-action', async (req, res) => {
  try {
    const { action, itemIds } = req.body;

    if (!action || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ message: 'Invalid action or item IDs' });
    }

    let updateQuery = {};
    let auditAction = '';

    switch (action) {
      case 'approve':
        updateQuery = { 
          status: 'approved', 
          approvedAt: new Date(),
          approvedBy: req.user.id 
        };
        auditAction = 'BULK_APPROVE_PRODUCTS';
        break;
      case 'reject':
        updateQuery = { 
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: req.user.id
        };
        auditAction = 'BULK_REJECT_PRODUCTS';
        break;
      case 'flag':
        updateQuery = { 
          status: 'flagged',
          flaggedAt: new Date(),
          flaggedBy: req.user.id
        };
        auditAction = 'BULK_FLAG_PRODUCTS';
        break;
      case 'delete':
        // Soft delete
        updateQuery = { 
          deleted: true,
          deletedAt: new Date(),
          deletedBy: req.user.id
        };
        auditAction = 'BULK_DELETE_PRODUCTS';
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    const result = await Product.updateMany(
      { _id: { $in: itemIds } },
      updateQuery
    );

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: auditAction,
      targetType: 'PRODUCT',
      targetIds: itemIds,
      details: {
        action,
        affectedCount: result.modifiedCount
      }
    });

    res.json({
      message: `Bulk action completed successfully`,
      affectedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ message: 'Error performing bulk action' });
  }
});

// Bulk actions for vendors
router.post('/vendors/bulk-action', async (req, res) => {
  try {
    const { action, itemIds } = req.body;

    if (!action || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ message: 'Invalid action or item IDs' });
    }

    let updateQuery = {};
    let auditAction = '';

    switch (action) {
      case 'approve':
        updateQuery = { 
          status: 'active', 
          approvedAt: new Date(),
          approvedBy: req.user.id 
        };
        auditAction = 'BULK_APPROVE_VENDORS';
        break;
      case 'suspend':
        updateQuery = { 
          status: 'suspended',
          suspendedAt: new Date(),
          suspendedBy: req.user.id
        };
        auditAction = 'BULK_SUSPEND_VENDORS';
        break;
      case 'flag':
        updateQuery = { 
          status: 'flagged',
          flaggedAt: new Date(),
          flaggedBy: req.user.id
        };
        auditAction = 'BULK_FLAG_VENDORS';
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    const result = await Vendor.updateMany(
      { _id: { $in: itemIds } },
      updateQuery
    );

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: auditAction,
      targetType: 'VENDOR',
      targetIds: itemIds,
      details: {
        action,
        affectedCount: result.modifiedCount
      }
    });

    res.json({
      message: `Bulk action completed successfully`,
      affectedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ message: 'Error performing bulk action' });
  }
});

// Approve specific product
router.post('/products/:productId/approve', async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user.id
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'APPROVE_PRODUCT',
      targetType: 'PRODUCT',
      targetIds: [productId]
    });

    res.json({ message: 'Product approved successfully', product });

  } catch (error) {
    console.error('Error approving product:', error);
    res.status(500).json({ message: 'Error approving product' });
  }
});

// Reject specific product
router.post('/products/:productId/reject', async (req, res) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: req.user.id,
        rejectionReason: reason
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'REJECT_PRODUCT',
      targetType: 'PRODUCT',
      targetIds: [productId],
      details: { reason }
    });

    res.json({ message: 'Product rejected', product });

  } catch (error) {
    console.error('Error rejecting product:', error);
    res.status(500).json({ message: 'Error rejecting product' });
  }
});

// Flag content (products or vendors)
router.post('/products/:productId/flag', async (req, res) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        status: 'flagged',
        flaggedAt: new Date(),
        flaggedBy: req.user.id,
        flagReason: reason
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'FLAG_PRODUCT',
      targetType: 'PRODUCT',
      targetIds: [productId],
      details: { reason }
    });

    res.json({ message: 'Product flagged for review', product });

  } catch (error) {
    console.error('Error flagging product:', error);
    res.status(500).json({ message: 'Error flagging product' });
  }
});

router.post('/vendors/:vendorId/flag', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        status: 'flagged',
        flaggedAt: new Date(),
        flaggedBy: req.user.id,
        flagReason: reason
      },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'FLAG_VENDOR',
      targetType: 'VENDOR',
      targetIds: [vendorId],
      details: { reason }
    });

    res.json({ message: 'Vendor flagged for review', vendor });

  } catch (error) {
    console.error('Error flagging vendor:', error);
    res.status(500).json({ message: 'Error flagging vendor' });
  }
});

// Helper functions
function calculateProductRiskLevel(product) {
  let riskScore = 0;
  
  // Price factor (suspiciously low prices)
  if (product.price && product.price < 100) {
    riskScore += 0.3;
  }
  
  // New product without sales
  if (!product.salesCount || product.salesCount === 0) {
    riskScore += 0.2;
  }
  
  // Vendor factors
  if (product.vendor && product.vendor.status !== 'active') {
    riskScore += 0.4;
  }
  
  // Description quality (simple check)
  if (!product.description || product.description.length < 50) {
    riskScore += 0.2;
  }
  
  if (riskScore >= 0.7) return 'high';
  if (riskScore >= 0.4) return 'medium';
  return 'low';
}

function calculateVendorRiskLevel(vendor) {
  let riskScore = 0;
  
  // Account age factor
  const accountAge = (new Date() - vendor.createdAt) / (1000 * 60 * 60 * 24); // days
  if (accountAge < 30) riskScore += 0.3;
  
  // Verification status
  if (vendor.status !== 'active') {
    riskScore += 0.4;
  }
  
  // Rating factor
  if (!vendor.rating || vendor.rating < 3.0) {
    riskScore += 0.3;
  }
  
  if (riskScore >= 0.7) return 'high';
  if (riskScore >= 0.4) return 'medium';
  return 'low';
}

async function calculateVendorTotalSales(vendorId) {
  try {
    // This would integrate with your order/sales system
    // For now, return a mock value
    return Math.floor(Math.random() * 10000);
  } catch (error) {
    return 0;
  }
}

module.exports = router;
