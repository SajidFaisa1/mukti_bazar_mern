const express = require('express');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');
const Vendor = require('../models/Vendor');
const { protect, adminOnly } = require('../middleware/auth');
const { randomUUID } = require('crypto');
const router = express.Router();

// GET /api/vendors/discover?limit=12 – top rated / recent hybrid list
router.get('/discover', async (req, res) => {
  try {
    const rawLimit = req.query.limit || '12';
    if (rawLimit === 'all') {
      const all = await Vendor.find({})
        .sort({ storeRatingAvg: -1, storeRatingCount: -1, createdAt: -1 })
        .select('businessName storeId shopLogo storeRatingAvg storeRatingCount trustScore certifications address isApproved');
      return res.json({ vendors: all, total: all.length });
    }
    const limit = Math.min(parseInt(rawLimit,10), 100);
    const filterRated = { storeRatingCount: { $gte: 1 } };
    const top = await Vendor.find(filterRated)
      .sort({ storeRatingAvg: -1, storeRatingCount: -1, createdAt: -1 })
      .limit(limit)
      .select('businessName storeId shopLogo storeRatingAvg storeRatingCount trustScore certifications address isApproved');
    if (top.length >= limit) return res.json({ vendors: top, total: top.length });
    const remaining = limit - top.length;
    if (remaining > 0) {
      const recent = await Vendor.find({ storeRatingCount: { $lt: 1 } })
        .sort({ createdAt: -1 })
        .limit(remaining)
        .select('businessName storeId shopLogo storeRatingAvg storeRatingCount trustScore certifications address isApproved');
      return res.json({ vendors: [...top, ...recent], total: top.length + recent.length });
    }
    return res.json({ vendors: top, total: top.length });
  } catch (e) {
    console.error('Discover vendors error', e);
    res.status(500).json({ error: 'Failed to load discover vendors' });
  }
});

// POST /api/vendors/signup  – minimal vendor registration
router.post('/signup', async (req, res) => {
  try {
    const { businessName, email, password, confirmPassword, uid } = req.body;
    if (!businessName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    const exists = await Vendor.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const vendor = await Vendor.create({
      uid,
      storeId: randomUUID().slice(0, 8),
      businessName,
      sellerName: '',
      email,
      password: hashed,
      phone: '+880',
      address: { region: '', city: '', district: '' },
      shopLogo: {},
      farmingLicense: {},
      kycDocument: {},
      isApproved: false,
      profileCompleted: false,
    });
    const obj = vendor.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/vendors/store/:storeId – fetch vendor basic info
router.get('/store/:storeId', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ storeId: req.params.storeId }).select('-password');
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/vendors/uid/:uid – fetch vendor by Firebase UID
router.get('/uid/:uid', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ uid: req.params.uid }).select('-password');
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/vendors/pending – list vendors awaiting approval
router.get('/pending', async (_req, res) => {
  try {
    const pending = await Vendor.find({ isApproved: false, isSubmitted: true });
    res.json(pending.map(v => ({ 
      id: v._id, 
      businessName: v.businessName, 
      sellerName: v.sellerName,
      email: v.email, 
      storeId: v.storeId, 
      phone: v.phone,
      address: v.address,
      businessType: v.businessType,
      yearsInBusiness: v.yearsInBusiness,
      expectedMonthlyVolume: v.expectedMonthlyVolume,
      primaryProducts: v.primaryProducts,
      certifications: v.certifications,
      description: v.description,
      businessRegistrationNumber: v.businessRegistrationNumber,
      taxIdentificationNumber: v.taxIdentificationNumber,
      bankAccountDetails: v.bankAccountDetails,
      socialMediaLinks: v.socialMediaLinks,
      shopLogo: v.shopLogo,
      farmingLicense: v.farmingLicense,
      kycDocument: v.kycDocument,
      isApproved: v.isApproved,
      isSubmitted: v.isSubmitted,
      profileCompleted: v.profileCompleted,
      verificationStatus: v.verificationStatus,
      verificationLevel: v.verificationLevel,
      trustScore: v.trustScore,
      securityInfo: v.securityInfo,
      fraudFlags: v.fraudFlags,
      requiresManualReview: v.requiresManualReview,
      adminReviewNotes: v.adminReviewNotes,
      role: v.role,
      isActive: v.isActive,
      emailVerified: v.emailVerified,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt 
    })));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// PUT /api/vendors/:uid/profile – vendor completes or updates profile
router.put('/:uid/profile', async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'UID param required' });

    // Start with incoming body and ensure the profileCompleted flag is true
    const updates = { ...req.body, profileCompleted: true };

    // Re-use same helper to push any base64 images to Cloudinary
    const uploadIfNeeded = async (field) => {
      const obj = req.body[field];
      if (obj) {
        let base64Str = null;
        if (typeof obj === 'string' && obj.startsWith('data:')) {
          base64Str = obj;
        } else if (typeof obj === 'object' && typeof obj.data === 'string') {
          base64Str = obj.data;
        }
        if (base64Str) {
          const uploadRes = await cloudinary.uploader.upload(base64Str, { folder: 'vendors' });
          updates[field] = { public_id: uploadRes.public_id, url: uploadRes.secure_url };
        }
      }
    };

    await Promise.all(['shopLogo', 'farmingLicense', 'kycDocument'].map(uploadIfNeeded));

    const vendor = await Vendor.findOneAndUpdate({ uid }, updates, { new: true }).select('-password');
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    res.json(vendor);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

// PATCH /profile – vendor completes profile (requires auth in production)
router.patch('/profile', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    const updates = { ...req.body, profileCompleted: true };

    // Upload base64 images to Cloudinary if provided
    const uploadIfNeeded = async (field) => {
      const obj = req.body[field];
      if (obj) {
        let base64Str = null;
        if (typeof obj === 'string' && obj.startsWith('data:')) {
          base64Str = obj;
        } else if (typeof obj === 'object' && typeof obj.data === 'string') {
          base64Str = obj.data;
        }
        if (base64Str) {
          const res = await cloudinary.uploader.upload(base64Str, { folder: 'vendors' });
          updates[field] = { public_id: res.public_id, url: res.secure_url };
        }
      }
    };
    await Promise.all(['shopLogo', 'farmingLicense', 'kycDocument'].map(uploadIfNeeded));
    delete updates.uid; // UID should not be mutated

    const vendor = await Vendor.findOneAndUpdate({ uid }, updates, {
      new: true,
    }).select('-password');

    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    res.json(vendor);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

// PATCH /api/vendors/approve/:id – approve vendor
router.patch('/approve/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).select('-password');
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (e) {
    res.status(500).json({ error: 'Could not approve vendor' });
  }
});

// GET /api/vendors?search=query - Search vendors for group invitations
router.get('/', async (req, res) => {
  try {
    const { search, limit = 20, debug, admin } = req.query;
    
    // Admin mode - return all vendors as array
    if (admin === 'true') {
      const allVendors = await Vendor.find()
        .select('-password')
        .sort({ createdAt: -1 });
      return res.json(allVendors);
    }
    
    // Debug mode - return all vendors
    if (debug === 'true') {
      const allVendors = await Vendor.find({ isActive: true })
        .select('uid businessName sellerName email isApproved address.city address.district')
        .limit(10);
      return res.json({ 
        vendors: allVendors.map(vendor => ({
          uid: vendor.uid,
          businessName: vendor.businessName,
          sellerName: vendor.sellerName,
          email: vendor.email,
          city: vendor.address?.city,
          district: vendor.address?.district,
          isApproved: vendor.isApproved
        })),
        debug: true
      });
    }
    
    if (!search || search.trim().length < 2) {
      return res.json({ vendors: [] });
    }
    
    const searchRegex = new RegExp(search.trim(), 'i');
    
    const vendors = await Vendor.find({
      $or: [
        { businessName: searchRegex },
        { sellerName: searchRegex },
        { email: searchRegex }
      ],
      isApproved: true, // Only approved vendors
      isActive: true
    })
    .select('uid businessName sellerName email address.city address.district')
    .limit(parseInt(limit));
    
    const formattedVendors = vendors.map(vendor => ({
      uid: vendor.uid,
      businessName: vendor.businessName,
      sellerName: vendor.sellerName,
      email: vendor.email,
      city: vendor.address?.city,
      district: vendor.address?.district
    }));
    
    res.json({ vendors: formattedVendors });
  } catch (error) {
    console.error('Error searching vendors:', error);
    res.status(500).json({ error: 'Failed to search vendors' });
  }
});

// GET /api/vendors/customers - Get customers for a vendor (both users and other vendors who bought)
router.get('/customers', protect, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const Order = require('../models/Order');
    const User = require('../models/User');
    
    // Get all orders for this vendor
    const orders = await Order.find({
      'items.vendor': vendorId,
      status: { $in: ['delivered', 'processing', 'shipped', 'confirmed'] }
    }).populate('user', 'firstName lastName email phone address')
      .populate('vendor', 'businessName email phone address')
      .sort({ createdAt: -1 });

    // Group orders by customer and calculate stats
    const customerMap = new Map();

    orders.forEach(order => {
      let customerId, customerData, customerType;
      
      if (order.role === 'client' && order.user) {
        customerId = order.user._id.toString();
        customerType = 'user';
        customerData = {
          id: order.user._id,
          name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
          email: order.user.email,
          phone: order.user.phone,
          address: order.user.address,
          type: 'User'
        };
      } else if (order.role === 'vendor' && order.vendor) {
        customerId = order.vendor._id.toString();
        customerType = 'vendor';
        customerData = {
          id: order.vendor._id,
          name: order.vendor.businessName,
          email: order.vendor.email,
          phone: order.vendor.phone,
          address: order.vendor.address,
          type: 'Vendor'
        };
      }

      if (customerId && customerData) {
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            ...customerData,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: null,
            firstOrderDate: null,
            averageOrderValue: 0,
            status: 'active',
            customerType
          });
        }

        const customer = customerMap.get(customerId);
        customer.totalOrders++;
        customer.totalSpent += order.totalAmount || 0;
        
        const orderDate = new Date(order.createdAt);
        if (!customer.lastOrderDate || orderDate > customer.lastOrderDate) {
          customer.lastOrderDate = orderDate;
        }
        if (!customer.firstOrderDate || orderDate < customer.firstOrderDate) {
          customer.firstOrderDate = orderDate;
        }
      }
    });

    // Calculate average order value and determine status
    const customers = Array.from(customerMap.values()).map(customer => {
      customer.averageOrderValue = customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0;
      
      // Determine if customer is active (ordered in last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      customer.status = customer.lastOrderDate > threeMonthsAgo ? 'active' : 'inactive';
      
      return customer;
    });

    // Sort by total spent descending
    customers.sort((a, b) => b.totalSpent - a.totalSpent);

    // Calculate summary stats
    const stats = {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.status === 'active').length,
      totalUsers: customers.filter(c => c.customerType === 'user').length,
      totalVendors: customers.filter(c => c.customerType === 'vendor').length,
      averageOrderValue: customers.length > 0 ? customers.reduce((sum, c) => sum + c.averageOrderValue, 0) / customers.length : 0,
      totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0)
    };

    res.json({
      customers,
      stats,
      success: true
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/vendors/customers/:customerId - Get detailed customer info
router.get('/customers/:customerId', protect, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const customerId = req.params.customerId;
    const { customerType } = req.query; // 'user' or 'vendor'
    
    const Order = require('../models/Order');
    const User = require('../models/User');

    // Get customer details
    let customer;
    if (customerType === 'user') {
      customer = await User.findById(customerId);
    } else if (customerType === 'vendor') {
      customer = await Vendor.findById(customerId);
    }

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get customer's order history with this vendor
    const orders = await Order.find({
      $or: [
        { user: customerId, role: 'client' },
        { vendor: customerId, role: 'vendor' }
      ],
      'items.vendor': vendorId
    }).populate('items.product', 'name images')
      .sort({ createdAt: -1 });

    // Calculate customer metrics
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Get favorite products
    const productFrequency = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const productName = item.name;
        productFrequency[productName] = (productFrequency[productName] || 0) + item.quantity;
      });
    });

    const favoriteProducts = Object.entries(productFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    const customerDetails = {
      id: customer._id,
      name: customerType === 'user' ? 
        `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 
        customer.businessName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      type: customerType === 'user' ? 'User' : 'Vendor',
      totalOrders,
      totalSpent,
      averageOrderValue,
      firstOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
      lastOrderDate: orders.length > 0 ? orders[0].createdAt : null,
      favoriteProducts,
      recentOrders: orders.slice(0, 10).map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        amount: order.totalAmount,
        status: order.status,
        itemCount: order.items.length
      }))
    };

    res.json({
      customer: customerDetails,
      success: true
    });

  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

module.exports = router;
