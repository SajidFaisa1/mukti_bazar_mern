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

module.exports = router;
