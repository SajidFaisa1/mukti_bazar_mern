const express = require('express');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');
const Vendor = require('../models/Vendor');
const { randomUUID } = require('crypto');
const router = express.Router();

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

// GET /api/vendors/pending – list vendors awaiting approval
router.get('/pending', async (_req, res) => {
  try {
    const pending = await Vendor.find({ isApproved: false, profileCompleted: true });
    res.json(pending.map(v => ({ id: v._id, businessName: v.businessName, email: v.email, storeId: v.storeId, phone:v.phone,address:v.address,shopLogo:v.shopLogo,farmingLicense:v.farmingLicense,kycDocument:v.kycDocument,isApproved:v.isApproved,profileCompleted:v.profileCompleted,role:v.role,isActive:v.isActive,emailVerified:v.emailVerified,createdAt:v.createdAt,updatedAt:v.updatedAt })));
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

module.exports = router;
