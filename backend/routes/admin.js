const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');
const CarouselSlide = require('../models/CarouselSlide');
const { protect, adminOnly } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/logos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `logo-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Admin login attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email });
    console.log('Found admin:', admin ? 'Yes' : 'No');
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if admin account is enabled and active
    if (!admin.enabled || admin.status !== 'active') {
      return res.status(401).json({ error: 'Account is disabled or inactive' });
    }

    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      // Increment login attempts (if metadata exists)
      if (admin.metadata) {
        admin.metadata.loginAttempts = (admin.metadata.loginAttempts || 0) + 1;
        admin.metadata.lastFailedLogin = new Date();
        await admin.save();
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    if (admin.metadata) {
      admin.metadata.loginAttempts = 0;
      admin.metadata.lastFailedLogin = null;
    }
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: 'admin', email: admin.email }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true,
      token, 
      admin: { 
        id: admin._id, 
        email: admin.email, 
        name: admin.name,
        role: admin.role, // Return the actual admin role (super_admin, admin, etc.)
        adminRole: admin.role,
        permissions: admin.permissions
      } 
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/me – returns profile based on token
router.get('/me', protect, adminOnly, (req, res) => {
  res.json({ 
    success: true,
    admin: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.adminRole || req.user.role,
      adminRole: req.user.adminRole,
      permissions: req.user.permissions
    }
  });
});

// POST /api/admin/create-first - Create first admin (only if no admins exist)
router.post('/create-first', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if any admin already exists
    const existingAdminCount = await Admin.countDocuments();
    if (existingAdminCount > 0) {
      return res.status(403).json({ error: 'Admin already exists. Use admin login.' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create first admin
    const admin = new Admin({
      email,
      password: hashedPassword,
      role: 'admin'
    });
    
    await admin.save();
    
    // Generate token for immediate login
    const token = jwt.sign(
      { id: admin._id, role: 'admin', email: admin.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      success: true,
      message: 'First admin created successfully',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('Create first admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/logo - Get current logo
router.get('/logo', protect, adminOnly, async (req, res) => {
  try {
    // In a real app, you might store this in database
    // For now, we'll check if custom logo exists in uploads/logos
    const logoDir = 'uploads/logos';
    const defaultLogo = '/src/assets/Mukti.png';
    
    if (!fs.existsSync(logoDir)) {
      return res.json({ logoUrl: defaultLogo });
    }
    
    const files = fs.readdirSync(logoDir);
    const logoFiles = files.filter(file => file.startsWith('logo-')).sort();
    
    if (logoFiles.length === 0) {
      return res.json({ logoUrl: defaultLogo });
    }
    
    // Return the most recent logo
    const latestLogo = logoFiles[logoFiles.length - 1];
    res.json({ logoUrl: `http://localhost:5005/uploads/logos/${latestLogo}` });
    
  } catch (error) {
    console.error('Error fetching logo:', error);
    res.status(500).json({ error: 'Failed to fetch logo' });
  }
});

// POST /api/admin/logo - Upload new logo
router.post('/logo', protect, adminOnly, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    // Clean up old logo files (keep only the latest 3)
    const logoDir = 'uploads/logos';
    const files = fs.readdirSync(logoDir);
    const logoFiles = files.filter(file => file.startsWith('logo-')).sort();
    
    if (logoFiles.length > 3) {
      const filesToDelete = logoFiles.slice(0, logoFiles.length - 3);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(path.join(logoDir, file));
        } catch (err) {
          console.error('Error deleting old logo:', err);
        }
      });
    }

    const logoUrl = `http://localhost:5005/uploads/logos/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl: logoUrl
    });
    
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// DELETE /api/admin/logo - Reset to default logo
router.delete('/logo', protect, adminOnly, async (req, res) => {
  try {
    // Delete all custom logos
    const logoDir = 'uploads/logos';
    
    if (fs.existsSync(logoDir)) {
      const files = fs.readdirSync(logoDir);
      const logoFiles = files.filter(file => file.startsWith('logo-'));
      
      logoFiles.forEach(file => {
        try {
          fs.unlinkSync(path.join(logoDir, file));
        } catch (err) {
          console.error('Error deleting logo:', err);
        }
      });
    }

    res.json({
      success: true,
      message: 'Logo reset to default',
      logoUrl: '/src/assets/Mukti.png'
    });
    
  } catch (error) {
    console.error('Error resetting logo:', error);
    res.status(500).json({ error: 'Failed to reset logo' });
  }
});

// GET /api/admin/carousel - list slides
router.get('/carousel', protect, adminOnly, async (req, res) => {
  try {
    const slides = await CarouselSlide.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, slides });
  } catch (err) {
    console.error('Fetch carousel slides error:', err);
    res.status(500).json({ error: 'Failed to fetch slides' });
  }
});

// POST /api/admin/carousel - create slide (multipart form: image, title, tagline, order)
router.post('/carousel', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });

    // Upload to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(req.file.path, { folder: 'carousel' });

    const { title = '', tagline = '', order } = req.body;
    const slide = await CarouselSlide.create({
      imageUrl: uploadRes.secure_url,
      publicId: uploadRes.public_id,
      title,
      tagline,
      order: order !== undefined ? Number(order) : undefined
    });

    res.status(201).json({ success: true, slide });
  } catch (err) {
    console.error('Create carousel slide error:', err);
    res.status(500).json({ error: 'Failed to create slide' });
  }
});

// PUT /api/admin/carousel/:id - update text/order or replace image
router.put('/carousel/:id', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const slide = await CarouselSlide.findById(req.params.id);
    if (!slide) return res.status(404).json({ error: 'Slide not found' });

    if (req.file) {
      // Replace image in Cloudinary
      try {
        if (slide.publicId) await cloudinary.uploader.destroy(slide.publicId);
      } catch (e) { console.warn('Cloudinary destroy old slide failed:', e.message); }
      const uploadRes = await cloudinary.uploader.upload(req.file.path, { folder: 'carousel' });
      slide.imageUrl = uploadRes.secure_url;
      slide.publicId = uploadRes.public_id;
    }

    const { title, tagline, order, active } = req.body;
    if (title !== undefined) slide.title = title;
    if (tagline !== undefined) slide.tagline = tagline;
    if (active !== undefined) slide.active = active === 'true' || active === true;
    if (order !== undefined) slide.order = Number(order);

    await slide.save();
    res.json({ success: true, slide });
  } catch (err) {
    console.error('Update carousel slide error:', err);
    res.status(500).json({ error: 'Failed to update slide' });
  }
});

// DELETE /api/admin/carousel/:id - delete slide
router.delete('/carousel/:id', protect, adminOnly, async (req, res) => {
  try {
    const slide = await CarouselSlide.findById(req.params.id);
    if (!slide) return res.status(404).json({ error: 'Slide not found' });

    try {
      if (slide.publicId) await cloudinary.uploader.destroy(slide.publicId);
    } catch (e) { console.warn('Cloudinary destroy failed:', e.message); }

    await slide.deleteOne();
    res.json({ success: true, message: 'Slide deleted' });
  } catch (err) {
    console.error('Delete carousel slide error:', err);
    res.status(500).json({ error: 'Failed to delete slide' });
  }
});

// PUBLIC: GET /api/admin/carousel/public - active slides for all users
router.get('/carousel/public', async (req, res) => {
  try {
    const slides = await CarouselSlide.find({ active: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, slides });
  } catch (err) {
    console.error('Public fetch carousel slides error:', err);
    res.status(500).json({ error: 'Failed to fetch slides' });
  }
});

module.exports = router;
