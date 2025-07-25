const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Address = require('../models/Address');
const { protect } = require('../middleware/auth');
const deliveryCalculator = require('../services/deliveryCalculator');

const router = express.Router();

// Public route for getting cart by uid (for guests/non-authenticated users)
router.get('/uid/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    let cart = await Cart.findOne({ uid })
      .populate('deliveryAddress')
      .populate('items.product');
      
    if (!cart) {
      // Create new cart if none exists
      // Determine user role and reference
      let userRef = null;
      let role = 'client';
      
      const user = await User.findOne({ uid });
      if (user) {
        userRef = user._id;
        role = 'client';
      } else {
        const vendor = await Vendor.findOne({ uid });
        if (vendor) {
          userRef = vendor._id;
          role = 'vendor';
        }
      }
      
      cart = new Cart({ 
        uid, 
        role,
        ...(role === 'client' ? { user: userRef } : { vendor: userRef })
      });
      
      // Try to set default address
      const defaultAddress = await Address.findOne({ uid, isDefault: true });
      if (defaultAddress) {
        cart.deliveryAddress = defaultAddress._id;
      }
      
      await cart.save();
      
      // Populate the address after saving
      await cart.populate('deliveryAddress');
    }
    
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route for adding item to cart
router.post('/uid/:uid/items', async (req, res) => {
  try {
    const { uid } = req.params;
    const { productId, quantity = 1 } = req.body;
    
    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Find or create cart
    let cart = await Cart.findOne({ uid });
    if (!cart) {
      // Determine user role and reference
      let userRef = null;
      let role = 'client';
      
      const user = await User.findOne({ uid });
      if (user) {
        userRef = user._id;
        role = 'client';
      } else {
        const vendor = await Vendor.findOne({ uid });
        if (vendor) {
          userRef = vendor._id;
          role = 'vendor';
        }
      }
      
      cart = new Cart({ 
        uid, 
        role,
        ...(role === 'client' ? { user: userRef } : { vendor: userRef })
      });
    }
    
    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId
    );
    
    const minQty = product.minOrderQty || 1;
    const qtyToAdd = Math.max(minQty, quantity);
    
    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity += qtyToAdd;
    } else {
      // Add new item
      const cartItem = {
        product: product._id,
        productId: product._id.toString(),
        name: product.name || product.title,
        price: product.price || 0,
        offerPrice: product.offerPrice,
        unitPrice: product.unitPrice,
        quantity: qtyToAdd,
        minOrderQty: product.minOrderQty || 1,
        unitType: product.unitType || 'pcs',
        images: product.images || [],
        category: product.category,
        productSnapshot: product.toObject()
      };
      cart.items.push(cartItem);
    }
    
    await cart.save();
    await cart.populate([
      { path: 'items.product' },
      { path: 'deliveryAddress' }
    ]);
    
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route for updating item quantity
router.put('/uid/:uid/items/:itemId', async (req, res) => {
  try {
    const { uid, itemId } = req.params;
    const { quantity } = req.body;
    
    const cart = await Cart.findOne({ uid });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    const minQty = item.minOrderQty || 1;
    item.quantity = Math.max(minQty, quantity);
    
    await cart.save();
    await cart.populate([
      { path: 'items.product' },
      { path: 'deliveryAddress' }
    ]);
    
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route for removing item from cart
router.delete('/uid/:uid/items/:itemId', async (req, res) => {
  try {
    const { uid, itemId } = req.params;
    
    const cart = await Cart.findOne({ uid });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    cart.items.pull(itemId);
    await cart.save();
    await cart.populate([
      { path: 'items.product' },
      { path: 'deliveryAddress' }
    ]);
    
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route for clearing cart
router.delete('/uid/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const cart = await Cart.findOne({ uid });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    cart.items = [];
    await cart.save();
    
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public route for updating delivery address
router.put('/uid/:uid/delivery-address', async (req, res) => {
  try {
    const { uid } = req.params;
    const { addressId } = req.body;
    
    const cart = await Cart.findOne({ uid });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    // Verify address belongs to user
    const address = await Address.findOne({ _id: addressId, uid });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    cart.deliveryAddress = addressId;
    await cart.save();
    await cart.populate([
      { path: 'items.product' },
      { path: 'deliveryAddress' }
    ]);
    
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available delivery methods for a cart
router.get('/uid/:uid/delivery-methods', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const cart = await Cart.findOne({ uid })
      .populate('items.product');
    
    if (!cart || !cart.items.length) {
      // If no cart found, return default delivery methods for empty cart
      const defaultMethods = [
        {
          id: 'pickup',
          name: 'Pickup by Yourself',
          description: 'Collect from our warehouse/farm',
          fee: 0,
          estimatedDays: '0',
          icon: '🏪'
        },
        {
          id: 'negotiated',
          name: 'Negotiated Delivery',
          description: 'Seller will arrange delivery with negotiated charges',
          fee: 0,
          estimatedDays: '2-5',
          icon: '🤝',
          isNegotiated: true
        },
        {
          id: 'standard',
          name: 'Standard Delivery',
          description: 'For small orders',
          fee: 70,
          estimatedDays: '3-5',
          icon: '📦'
        }
      ];
      
      return res.json({
        totalWeight: 0,
        deliveryMethods: defaultMethods,
        recommendedMethod: 'pickup'
      });
    }
    
    // Calculate total weight
    const totalWeight = deliveryCalculator.calculateTotalWeight(cart.items);
    
    // Get available delivery methods
    const deliveryMethods = deliveryCalculator.getAvailableDeliveryMethods(cart.items, totalWeight);
    
    // Get recommended method
    const recommendedMethod = deliveryCalculator.getRecommendedDeliveryMethod(cart.items, totalWeight);
    
    res.json({
      totalWeight,
      deliveryMethods,
      recommendedMethod
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Calculate delivery fee for a specific method
router.post('/uid/:uid/calculate-delivery', async (req, res) => {
  try {
    const { uid } = req.params;
    const { deliveryMethod, negotiatedFee = 0 } = req.body;
    
    const cart = await Cart.findOne({ uid })
      .populate('items.product');
    
    if (!cart || !cart.items.length) {
      // For empty cart, provide default calculation
      let deliveryFee = 0;
      
      switch (deliveryMethod) {
        case 'pickup':
          deliveryFee = 0;
          break;
        case 'negotiated':
          deliveryFee = negotiatedFee;
          break;
        case 'standard':
        default:
          deliveryFee = 70; // Default piece-based fee
          break;
      }
      
      return res.json({
        deliveryMethod,
        deliveryFee,
        totalWeight: 0,
        estimatedDays: deliveryMethod === 'pickup' ? '0' : '3-5',
        breakdown: {
          weightBasedFee: 0,
          pieceBasedFee: deliveryMethod === 'standard' ? 70 : 0,
          baseFee: 0,
          negotiatedFee: deliveryMethod === 'negotiated' ? negotiatedFee : 0
        }
      });
    }
    
    // Calculate total weight
    const totalWeight = deliveryCalculator.calculateTotalWeight(cart.items);
    
    // Validate delivery method is available
    if (!deliveryCalculator.isDeliveryMethodAvailable(deliveryMethod, cart.items, totalWeight)) {
      return res.status(400).json({ error: 'Delivery method not available for this cart' });
    }
    
    // Calculate delivery fee
    const deliveryFee = deliveryCalculator.calculateDeliveryFee(
      deliveryMethod, 
      cart.items, 
      totalWeight, 
      negotiatedFee
    );
    
    // Get estimated delivery days
    const estimatedDays = deliveryCalculator.getEstimatedDeliveryDays(deliveryMethod);
    
    res.json({
      deliveryMethod,
      deliveryFee,
      totalWeight,
      estimatedDays,
      breakdown: {
        weightBasedFee: totalWeight > 0 ? totalWeight * 7 : 0,
        pieceBasedFee: cart.items.some(item => {
          const unitType = (item.unitType || item.product?.unitType || 'pcs').toLowerCase();
          return unitType === 'pcs' || unitType === 'pieces';
        }) && totalWeight === 0 ? 70 : 0,
        baseFee: deliveryMethod === 'semi-truck' ? 200 : deliveryMethod === 'truck' ? 500 : 0,
        negotiatedFee: deliveryMethod === 'negotiated' ? negotiatedFee : 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update cart delivery details
router.put('/uid/:uid/delivery', async (req, res) => {
  try {
    const { uid } = req.params;
    const { deliveryMethod, deliveryFee, deliveryNotes, negotiatedFee } = req.body;
    
    const cart = await Cart.findOne({ uid });
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    // Calculate total weight
    const totalWeight = deliveryCalculator.calculateTotalWeight(cart.items);
    
    // Validate and calculate delivery fee if not provided
    let finalDeliveryFee = deliveryFee;
    if (!finalDeliveryFee && deliveryMethod) {
      finalDeliveryFee = deliveryCalculator.calculateDeliveryFee(
        deliveryMethod, 
        cart.items, 
        totalWeight, 
        negotiatedFee || 0
      );
    }
    
    // Update cart delivery details
    cart.deliveryMethod = deliveryMethod;
    cart.deliveryFee = finalDeliveryFee || 0;
    cart.totalWeight = totalWeight;
    cart.deliveryNotes = deliveryNotes || cart.deliveryNotes;
    
    await cart.save();
    await cart.populate([
      { path: 'items.product' },
      { path: 'deliveryAddress' }
    ]);
    
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected routes (require authentication)
router.use(protect);

// Get user's cart
router.get('/', async (req, res) => {
  try {
    let cart = await Cart.findOne({ 
      ...(req.user.role === 'client' ? { user: req.user.id } : { vendor: req.user.id })
    })
    .populate('deliveryAddress')
    .populate('items.product');
    
    if (!cart) {
      // Create new cart if none exists
      const userDoc = req.user.role === 'client' 
        ? await User.findById(req.user.id)
        : await Vendor.findById(req.user.id);
        
      cart = new Cart({ 
        uid: userDoc.uid,
        role: req.user.role,
        ...(req.user.role === 'client' ? { user: req.user.id } : { vendor: req.user.id })
      });
      await cart.save();
    }
    
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's order history
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = {
      ...(req.user.role === 'client' ? { user: req.user.id } : { vendor: req.user.id }),
      status: { $ne: 'cart' }
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const orders = await Cart.find(query)
      .populate('deliveryAddress')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Cart.countDocuments(query);
    
    res.json({
      orders,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific order
router.get('/orders/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Cart.findOne({
      orderNumber,
      ...(req.user.role === 'client' ? { user: req.user.id } : { vendor: req.user.id })
    })
    .populate('deliveryAddress')
    .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
