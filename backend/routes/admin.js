const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const router = express.Router();

// helper middleware to verify JWT sent in Authorization header
const verifyToken = async (req, res, next) => {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) return res.status(401).json({ error: 'Invalid token' });
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /api/admin/login

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const admin = await Admin.findOne({ email });
    console.log(admin);
    if (!admin) return res.status(401).json({ error: 'Invalid Email' });

    const ok = await admin.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid Password' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    res.json({ token, admin: { id: admin._id, email: admin.email, role: 'admin' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/me – returns profile based on token
router.get('/me', verifyToken, (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;
