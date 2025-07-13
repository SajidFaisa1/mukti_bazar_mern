const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email & password required' });
    }

    // Look in Users then Vendors
    let account = await User.findOne({ email });
    if (!account) {
      account = await Vendor.findOne({ email });
    }
    if (!account) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, account.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const payload = { id: account._id, role: account.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const obj = account.toObject();
    delete obj.password;
    res.json({ token, user: obj });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/google-client – upsert client after Firebase Google sign-in
router.post('/google-client', async (req, res) => {
  try {
    const { uid, email, name } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'uid and email required' });
    }

    let user = await User.findOne({ uid });
    if (!user) {
      // create new
      user = await User.create({
        uid,
        email,
        name: name || email,
        emailVerified: true,
        role: 'client',
        password: '', // no password for OAuth accounts
      });
    }

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const obj = user.toObject();
    delete obj.password;
    res.json({ token, user: obj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/vendor-jwt – issue JWT for vendor based on Firebase UID
router.post('/vendor-jwt', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const token = jwt.sign({ id: vendor._id, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
