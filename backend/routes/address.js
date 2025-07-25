const express = require('express');
const Address = require('../models/Address');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public route for getting default address by uid
router.get('/default/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const defaultAddress = await Address.findOne({ uid, isDefault: true });
    
    if (!defaultAddress) {
      return res.status(404).json({ error: 'No default address found' });
    }
    
    res.json(defaultAddress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route for creating address (for cart functionality)
router.post('/', async (req, res) => {
  try {
    const { isDefault, uid, role, ...data } = req.body;
    
    // Find the user by uid in the appropriate collection based on role
    let user = null;
    if (role === 'vendor') {
      user = await Vendor.findOne({ uid });
    } else {
      // Default to client/user collection
      user = await User.findOne({ uid });
    }
    
    if (!user) {
      return res.status(404).json({ error: `${role === 'vendor' ? 'Vendor' : 'User'} not found` });
    }
    
    // If this is set as default, unset other default addresses for this user
    if (isDefault) {
      await Address.updateMany({ uid, _id: { $exists: true } }, { isDefault: false });
    }
    
    const address = await Address.create({ 
      ...data, 
      user: user._id, // Use the MongoDB ObjectId
      uid,
      role: role || 'client', // Save the role in the address
      isDefault: !!isDefault 
    });

    res.status(201).json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// All other address routes require auth
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

// POST /api/addresses – add new address (protected route)
router.post('/protected', async (req, res) => {
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
