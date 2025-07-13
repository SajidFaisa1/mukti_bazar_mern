const express = require('express');
const Address = require('../models/Address');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All address routes require auth
router.use(protect);

// GET /api/addresses – list logged-in user addresses
router.get('/', async (req, res) => {
  try {
    const list = await Address.find({ user: req.user.id, role: req.user.role }).sort({ isDefault: -1, createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/addresses – add new address
router.post('/', async (req, res) => {
  try {
    const { isDefault, ...data } = req.body;
    const address = await Address.create({ ...data, user: req.user.id, role: req.user.role, isDefault: !!isDefault });

    // If this address is set as default, unset others
    if (isDefault) {
      await Address.updateMany({ user: req.user.id, role: req.user.role, _id: { $ne: address._id } }, { isDefault: false });
    }

    res.status(201).json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/addresses/:id – update existing address
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isDefault, ...data } = req.body;
    const address = await Address.findOneAndUpdate({ _id: id, user: req.user.id, role: req.user.role }, { ...data, role: req.user.role }, { new: true });
    if (!address) return res.status(404).json({ error: 'Address not found' });

    if (isDefault !== undefined) {
      if (isDefault) {
        await Address.updateMany({ user: req.user.id, _id: { $ne: id } }, { isDefault: false });
      }
      address.isDefault = !!isDefault;
      await address.save();
    }

    res.json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/addresses/:id/default – mark address as default
router.patch('/:id/default', async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { isDefault: true },
      { new: true }
    );
    if (!address) return res.status(404).json({ error: 'Address not found' });
    await Address.updateMany({ user: req.user.id, _id: { $ne: id } }, { isDefault: false });
    res.json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/addresses/:id – delete address
router.delete('/:id', async (req, res) => {
  try {
    const removed = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!removed) return res.status(404).json({ error: 'Address not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
