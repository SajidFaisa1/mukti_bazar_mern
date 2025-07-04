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

module.exports = router;
