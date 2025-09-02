const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const router = express.Router();
const { rateLimit } = require('../middleware/rateLimit');
const { validateBody } = require('../middleware/validate');
const { record } = require('../services/auditService');

// Limit login attempts: 50 per 15 min per IP
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 50 });

// POST /api/auth/login
router.post('/login', loginLimiter, validateBody({
  email: { required: true, type: 'string' },
  password: { required: true, type: 'string' }
}), async (req, res) => {
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
    if (!account) {
      await record({ type: 'login_failed', actorId: req.body.email, ip: req.ip, requestId: req.requestId, meta: { reason: 'not_found' } });
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, account.password);
    if (!match) {
      await record({ type: 'login_failed', actorId: req.body.email, ip: req.ip, requestId: req.requestId, meta: { reason: 'bad_password' } });
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const payload = { id: account._id, role: account.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const obj = account.toObject();
    delete obj.password;
  await record({ type: 'login_success', actorId: account._id.toString(), actorRole: account.role, ip: req.ip, requestId: req.requestId });
  res.json({ token, user: obj });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/google-client – upsert client after Firebase Google sign-in
router.post('/google-client', validateBody({ uid: { required: true, type: 'string' }, email: { required: true, type: 'string' } }), async (req, res) => {
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
  await record({ type: 'login_oauth', actorId: user._id.toString(), actorRole: user.role, ip: req.ip, requestId: req.requestId });
  res.json({ token, user: obj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/vendor-jwt – issue JWT for vendor based on Firebase UID
router.post('/vendor-jwt', validateBody({ uid: { required: true, type: 'string' } }), async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const token = jwt.sign({ id: vendor._id, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  await record({ type: 'vendor_jwt_issue', actorId: vendor._id.toString(), actorRole: 'vendor', ip: req.ip, requestId: req.requestId });
  res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
