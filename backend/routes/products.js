const express = require('express');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const router = express.Router();

// GET /api/products/vendor/:storeId – list products for a vendor (public)
router.get('/vendor/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const items = await Product.find({ storeId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products – vendor adds a product
router.post('/', async (req, res) => {
  try {
    const { vendorUid, storeId, businessName, ...data } = req.body;
    if (!vendorUid || !storeId || !businessName) {
      return res.status(400).json({ error: 'vendorUid, storeId and businessName required' });
    }
    // Handle images – accept array of base64 strings or objects {data:"base64"}
    let imageUrls = [];
    if (Array.isArray(data.images)) {
      for (const imgItem of data.images.slice(0, 3)) {
        let base64Str = null;
        if (typeof imgItem === 'string' && imgItem.startsWith('data:')) {
          base64Str = imgItem;
        } else if (typeof imgItem === 'object' && typeof imgItem.data === 'string') {
          base64Str = imgItem.data;
        }
        if (base64Str) {
          try {
            const uploadRes = await cloudinary.uploader.upload(base64Str, {
              folder: 'products',
            });
            imageUrls.push(uploadRes.secure_url);
          } catch (err) {
            console.error('Cloudinary upload failed:', err);
          }
        }
      }
    }

    const saved = await Product.create({ vendorUid, storeId, businessName, ...data, images: imageUrls });
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save product' });
  }
});

// DELETE /api/products/:id – vendor deletes own product (no auth check yet)
router.delete('/:id', async (req, res) => {
  try {
    const removed = await Product.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete' });
  }
});

// -------------------------
// Admin review endpoints
// -------------------------

// GET /api/products?status=pending|approved
// Returns products filtered by approval status. If no status provided, returns all (non-deleted) products.
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (status === 'pending') {
      filter.isApproved = false;
    } else if (status === 'approved') {
      filter.isApproved = true;
    }

    const items = await Product.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/products/:id – update product (vendor)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // If images array provided, process uploads
    if (Array.isArray(updates.images)) {
      const imageUrls = [];
      for (const imgItem of updates.images.slice(0, 3)) {
        if (typeof imgItem === 'string' && imgItem.startsWith('http')) {
          imageUrls.push(imgItem);
        } else if (typeof imgItem === 'string' && imgItem.startsWith('data:')) {
          try {
            const uploadRes = await cloudinary.uploader.upload(imgItem, { folder: 'products' });
            imageUrls.push(uploadRes.secure_url);
          } catch (err) {
            console.error('Cloudinary upload failed:', err);
          }
        } else if (typeof imgItem === 'object' && typeof imgItem.data === 'string') {
          try {
            const uploadRes = await cloudinary.uploader.upload(imgItem.data, { folder: 'products' });
            imageUrls.push(uploadRes.secure_url);
          } catch (err) {
            console.error('Cloudinary upload failed:', err);
          }
        }
      }
      updates.images = imageUrls;
    }

    const updated = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/products/approve/:id – mark product as approved
router.patch('/approve/:id', async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products/decline/:id – optionally soft-delete or keep record unapproved
router.post('/decline/:id', async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, isApproved: false },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/products/feature/:id – use one vendor credit & mark product featured
router.patch('/feature/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Get vendor via storeId
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findOne({ storeId: product.storeId });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    if (vendor.featuredCredit <= 0) {
      return res.status(400).json({ error: 'No feature credits left' });
    }

    vendor.featuredCredit -= 1;
    product.isFeatured = true;

    await vendor.save();
    await product.save();

    res.json({ success: true, product, featuredCredit: vendor.featuredCredit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
