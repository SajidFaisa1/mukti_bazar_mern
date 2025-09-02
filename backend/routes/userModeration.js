const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');
const { protect, adminOnly } = require('../middleware/auth');

// Admin: Ban user
router.post('/:userId/ban', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = 'Policy violation' } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.banned) return res.status(400).json({ error: 'User already banned' });
    user.banned = true;
    user.bannedAt = new Date();
    user.bannedReason = reason;
    user.bannedBy = req.user.id;
    await user.save();
    res.json({ success: true, message: 'User banned', user: { id: user._id, banned: user.banned, bannedAt: user.bannedAt, bannedReason: user.bannedReason } });
  } catch (e) {
    console.error('Ban user error', e);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Admin: Unban user
router.post('/:userId/unban', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.banned) return res.status(400).json({ error: 'User is not banned' });
    user.banned = false;
    user.bannedReason = undefined;
    user.bannedAt = undefined;
    user.bannedBy = undefined;
    await user.save();
    res.json({ success: true, message: 'User unbanned' });
  } catch (e) {
    console.error('Unban user error', e);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Admin: Require verification
router.post('/:userId/require-verification', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.verification) user.verification = {};
    user.verification.status = 'required';
    user.verification.requiredAt = new Date();
    await user.save();
    // Send notification to user by uid
    if (user.uid) {
      await Notification.createNotification({
        recipientUid: user.uid,
        recipientRole: 'client',
        type: 'system',
        title: 'Verification Required',
        message: 'Please submit your business verification documents to continue purchasing.',
        actionUrl: '/account/verification',
        priority: 'high'
      });
    }
    res.json({ success: true, message: 'Verification required', status: user.verification.status });
  } catch (e) {
    console.error('Require verification error', e);
    res.status(500).json({ error: 'Failed to set verification required' });
  }
});

// User: Submit verification documents
router.post('/:userId/submit-verification', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== String(userId)) {
      console.warn('Submit verification 403', { authUserId: req.user.id, paramUserId: userId, role: req.user.role });
      return res.status(403).json({ error: 'Not allowed' });
    }
    const { documents = [] } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.verification) user.verification = {};
    user.verification.status = 'pending';
    user.verification.submittedAt = new Date();
    if (!Array.isArray(user.verification.documents)) user.verification.documents = [];
    documents.forEach(doc => {
      if (doc.type && doc.url) user.verification.documents.push({ type: doc.type, url: doc.url });
    });
    await user.save();
    res.json({ success: true, message: 'Verification submitted', status: user.verification.status });
  } catch (e) {
    console.error('Submit verification error', e);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// Admin: Review verification
router.post('/:userId/review-verification', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params; const { approve = false, rejectionReason } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.verification) user.verification = {};
    user.verification.status = approve ? 'verified' : 'rejected';
    user.verification.reviewedAt = new Date();
    user.verification.reviewedBy = req.user.id;
    if (!approve) user.verification.rejectionReason = rejectionReason || 'Not approved'; else user.verification.rejectionReason = undefined;
    await user.save();
    res.json({ success: true, message: approve ? 'User verified' : 'Verification rejected', status: user.verification.status });
  } catch (e) {
    console.error('Review verification error', e);
    res.status(500).json({ error: 'Failed to review verification' });
  }
});

module.exports = router;

/**
 * NOTE: Additional endpoint appended below export for clarity in diff. It will still be picked up because
 * module.exports was already assigned above; we append route definitions earlier than export normally, but
 * keeping minimal change footprint. Move if refactoring later.
 */

// User/Admin: Upload single verification document (base64 data URI or remote URL)
// POST /api/user-moderation/:userId/verification/upload
// Body: { file: <base64>, docType: 'nid_front' }
router.post('/:userId/verification/upload', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { file, docType } = req.body || {};
    if (!file || !docType) return res.status(400).json({ error: 'file and docType required' });
    // Permission: only owner or admin
    if (req.user.role !== 'admin' && String(req.user.id) !== String(userId)) {
      console.warn('Upload verification 403', { authUserId: req.user.id, paramUserId: userId, role: req.user.role });
      return res.status(403).json({ error: 'Not allowed' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Basic size guard (if data URI) ~ (length * 3/4) bytes
    if (file.startsWith('data:')) {
      const approxBytes = Math.ceil((file.length - file.indexOf(',')) * 0.75);
      if (approxBytes > 7 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large (max 7MB)' });
      }
    }

    const uploadRes = await cloudinary.uploader.upload(file, {
      folder: `verification/${user.uid || user._id}`,
      resource_type: 'image'
    });
    res.json({ success: true, url: uploadRes.secure_url, docType });
  } catch (e) {
    console.error('Verification upload error', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Phone availability + format validation (Bangladesh)
router.get('/validation/check-phone', protect, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'phone required' });
    const normalized = phone.replace(/\D/g,'');
    // Accept 11-digit local format starting 01 and digits 3-9, or 13/14 with country code variants
    let core = normalized;
    if (core.startsWith('880') && core.length === 13) core = core.slice(2); // 8801XXXXXXXXX -> 01XXXXXXXXX
    if (core.startsWith('88') && core.length === 13) core = core.slice(2);
    if (core.startsWith('88') && core.length === 14) core = core.slice(2);
    const formatOk = /^01[3-9]\d{8}$/.test(core);
    if (!formatOk) return res.json({ validFormat:false, available:false, reason:'Invalid Bangladeshi phone format' });
    const variants = [core, '+88'+core, '88'+core];
    const Vendor = require('../models/Vendor');
    const userHit = await User.findOne({ phone: { $in: variants }}).select('_id');
    const vendorHit = await Vendor.findOne({ phone: { $in: variants }}).select('_id');
    const available = !userHit && !vendorHit;
    res.json({ validFormat:true, available });
  } catch (e) { console.error('check-phone', e); res.status(500).json({ error:'Failed' }); }
});

// Basic NID validation (format + simple checksum placeholder)
router.get('/validation/check-nid', protect, async (req, res) => {
  try {
    const { nid } = req.query;
    if (!nid) return res.status(400).json({ error:'nid required' });
    const digits = nid.replace(/\D/g,'');
    if (digits.length !== 16) {
      return res.json({ validFormat:false, reason:'NID must be exactly 16 digits' });
    }
    // No checksum – spec provided: fixed 16-digit numeric identifier
    res.json({ validFormat:true, normalized:digits });
  } catch (e) { console.error('check-nid', e); res.status(500).json({ error:'Failed' }); }
});
