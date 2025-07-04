const express = require('express');
const Product = require('../models/Product');
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
    const { vendorUid, storeId, ...data } = req.body;
    if (!vendorUid || !storeId) {
      return res.status(400).json({ error: 'vendorUid and storeId required' });
    }
    const saved = await Product.create({ vendorUid, storeId, ...data });
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

module.exports = router;
