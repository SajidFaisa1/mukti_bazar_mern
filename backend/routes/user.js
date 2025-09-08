const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/users - Get all users (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/by-uid/:uid (admin only)
router.get('/by-uid/:uid', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    console.error('User lookup error', e);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// POST /api/users/signup – minimal client registration
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, phone, uid } = req.body;
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      uid: uid || undefined,
      name: `${firstName} ${lastName}`.trim(),
      email,
      password: hashed,
      phone,
      role: 'client',
    });
    const obj = user.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/profile – update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    // Validate input
    if (name && name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    if (phone && !/^\+?[\d\s\-\(\)]{10,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Update user profile
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
