const express = require('express');
const Feedback = require('../models/Feedback');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const cloudinary = require('../config/cloudinary');
const { protect, adminOnly } = require('../middleware/auth');
const { scheduleVendorAggregate } = require('../services/ratingAggregator');

const router = express.Router();

// Create or update feedback for a product
router.post('/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment = '', title = '', images = [] } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating 1-5 required' });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    // Resolve vendor ObjectId from product (product stores storeId & vendorUid, not vendor ObjectId)
    let vendorDoc = null;
    if (product.storeId) {
      vendorDoc = await Vendor.findOne({ storeId: product.storeId }).select('_id');
    }
    if (!vendorDoc && product.vendorUid) {
      vendorDoc = await Vendor.findOne({ uid: product.vendorUid }).select('_id');
    }
    if (!vendorDoc) {
      return res.status(422).json({ error: 'Vendor not found for product' });
    }
    // Prevent vendor reviewing own product
    if (req.user.role === 'vendor' && String(vendorDoc._id) === String(req.user.id)) {
      return res.status(403).json({ error: 'Vendors cannot review their own products' });
    }
    const vendorObjectId = vendorDoc._id;

    // Upsert feedback
    const existing = await Feedback.findOne({ productId, userId: req.user.id });
    // Verify purchase: user (client) must have delivered order containing product OR vendor (other) allowed by business rules (currently only clients)
    if (req.user.role !== 'client') {
      return res.status(403).json({ error: 'Only customers who purchased can review' });
    }
    const purchased = await Order.exists({ user: req.user.id, status: 'delivered', 'items.product': product._id });
    if (!purchased) {
      return res.status(403).json({ error: 'Purchase required to review this product' });
    }

    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      existing.title = title;
      existing.images = images;
      existing.purchased = true;
      await existing.save();
    } else {
      await Feedback.create({
        productId,
        vendorId: vendorObjectId,
        userId: req.user.id,
        userUid: req.user.uid,
        rating,
        comment,
        title,
        images,
        purchased: true
      });
    }

    // Recompute aggregates for product
    const agg = await Feedback.aggregate([
      { $match: { productId: product._id, moderationStatus: 'visible' } },
      { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    if (agg[0]) {
      product.avgRating = +agg[0].avg.toFixed(2);
      product.ratingCount = agg[0].count;
      await product.save();
    }

  // Debounced vendor-level aggregate update
  scheduleVendorAggregate(vendorObjectId);

    res.json({ success: true, product: { id: product._id, avgRating: product.avgRating, ratingCount: product.ratingCount } });
  } catch (e) {
    console.error('Feedback upsert error', e);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get feedback list + distribution for product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [list, total, distributionData] = await Promise.all([
      Feedback.find({ productId, moderationStatus: 'visible' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('rating comment title images helpfulVotes createdAt purchased'),
      Feedback.countDocuments({ productId, moderationStatus: 'visible' }),
      Feedback.buildDistribution(productId)
    ]);

    res.json({
      feedback: list,
      total,
      page,
      pages: Math.ceil(total / limit),
      distribution: distributionData
    });
  } catch (e) {
    console.error('Feedback list error', e);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

// Mark helpful
router.post('/helpful/:id', protect, async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ error: 'Feedback not found' });
    if (fb.helpfulVoters.includes(String(req.user.id))) {
      return res.json({ success: true, helpfulVotes: fb.helpfulVotes });
    }
    fb.helpfulVoters.push(String(req.user.id));
    fb.helpfulVotes += 1;
    await fb.save();
    res.json({ success: true, helpfulVotes: fb.helpfulVotes });
  } catch (e) {
    console.error('Helpful vote error', e);
    res.status(500).json({ error: 'Failed to vote helpful' });
  }
});

// Simple testimonials (top helpful & recent with meaningful comments)
router.get('/testimonials/sample', async (req, res) => {
  try {
    const sample = await Feedback.find({ moderationStatus: 'visible', comment: { $exists: true, $ne: '' } })
      .sort({ helpfulVotes: -1, createdAt: -1 })
      .limit(12)
      .select('rating comment createdAt');
    res.json({ testimonials: sample });
  } catch (e) {
    console.error('Testimonials sample error', e);
    res.status(500).json({ error: 'Failed to load testimonials' });
  }
});

module.exports = router;
// Moderation: hide feedback (admin)
router.post('/moderate/hide/:id', protect, adminOnly, async (req, res) => {
  try {
    const fb = await Feedback.findByIdAndUpdate(req.params.id, { moderationStatus: 'hidden' }, { new: true });
    if (!fb) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to hide feedback' });
  }
});

// Moderation: mark reported
router.post('/moderate/report/:id', protect, async (req, res) => {
  try {
    const { reason = 'unspecified' } = req.body;
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ error: 'Not found' });
    fb.reported = true;
    if (!fb.reportReasons.includes(reason)) fb.reportReasons.push(reason);
    if (fb.reportReasons.length >= 3) fb.moderationStatus = 'pending';
    await fb.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to report feedback' });
  }
});

// Vendor rating summary (store page) – average of all product feedback for vendor
router.get('/vendor/:vendorId/summary', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const pipeline = [
      { $match: { vendorId: new (require('mongoose').Types.ObjectId)(vendorId), moderationStatus: 'visible' } },
      { $group: { _id: '$vendorId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ];
    const rows = await Feedback.aggregate(pipeline);
    if (!rows[0]) return res.json({ average: 0, count: 0 });
    res.json({ average: +rows[0].avg.toFixed(2), count: rows[0].count });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load vendor rating summary' });
  }
});

// Upload review images (base64 array) -> returns hosted URLs
router.post('/upload-images', protect, async (req, res) => {
  try {
    const { images = [] } = req.body;
    if (!Array.isArray(images) || images.length === 0) return res.status(400).json({ error: 'No images provided' });
    const out = [];
    for (const img of images.slice(0,3)) {
      if (typeof img === 'string' && img.startsWith('data:')) {
        try {
          const up = await cloudinary.uploader.upload(img, { folder: 'reviews' });
          out.push(up.secure_url);
        } catch(e) { console.error('Review image upload failed', e); }
      }
    }
    res.json({ urls: out });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Moderation queue: list feedback by status or reported
router.get('/moderate/list', protect, adminOnly, async (req, res) => {
  try {
    const { status, reported } = req.query; // status=pending|hidden|visible, reported=true
    const filter = {};
    if (status) filter.moderationStatus = status;
    if (reported === 'true') filter.reported = true;
    const items = await Feedback.find(filter).sort({ createdAt: -1 }).limit(200).select('rating comment title helpfulVotes reported moderationStatus reportReasons createdAt productId vendorId');
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load moderation list' });
  }
});

// Moderation approve (set visible & clear reported flags optionally)
router.post('/moderate/approve/:id', protect, adminOnly, async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ error: 'Not found' });
    fb.moderationStatus = 'visible';
    if (req.body.clearReports) { fb.reported = false; fb.reportReasons = []; }
    await fb.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to approve feedback' });
  }
});

// Moderation: soft delete (hide & mark) - already have hide; add unhide restore
router.post('/moderate/unhide/:id', protect, adminOnly, async (req, res) => {
  try {
    const fb = await Feedback.findByIdAndUpdate(req.params.id, { moderationStatus: 'visible' }, { new: true });
    if (!fb) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to unhide feedback' });
  }
});
