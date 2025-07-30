const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');

// Create order from cart (checkout)
router.post('/checkout', protect, async (req, res) => {
  try {
    const { paymentMethod, notes = '', specialInstructions = '' } = req.body;
    
    // Get the user's uid from the database
    const userDoc = req.user.role === 'client' 
      ? await User.findById(req.user.id)
      : await Vendor.findById(req.user.id);
      
    if (!userDoc || !userDoc.uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const uid = userDoc.uid;

    // Validate payment method
    const validPaymentMethods = ['cod', 'card', 'mobile-banking', 'bank-transfer'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment method' 
      });
    }

    // Find user's active cart with populated products
    const cart = await Cart.findOne({ uid })
      .populate('deliveryAddress')
      .populate('items.product');
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cart is empty' 
      });
    }

    // Validate cart has required information
    if (!cart.deliveryAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Delivery address is required' 
      });
    }

    if (!cart.deliveryMethod) {
      return res.status(400).json({ 
        success: false, 
        message: 'Delivery method is required' 
      });
    }

    // Group cart items by vendor
    const itemsByVendor = {};
    for (const item of cart.items) {
      const vendorUid = item.product.vendorUid;
      if (!itemsByVendor[vendorUid]) {
        itemsByVendor[vendorUid] = [];
      }
      itemsByVendor[vendorUid].push(item);
    }

    // Create separate orders for each vendor
    const orders = [];
    const orderNumbers = [];
    let totalOrderValue = 0;

    for (const [vendorUid, items] of Object.entries(itemsByVendor)) {
      // Find vendor
      const vendor = await Vendor.findOne({ uid: vendorUid });
      if (!vendor) {
        return res.status(400).json({ 
          success: false, 
          message: `Vendor not found for some products` 
        });
      }

      // Calculate order totals for this vendor
      const subtotal = items.reduce((total, item) => {
        const price = item.offerPrice || item.unitPrice || item.price || 0;
        return total + (price * item.quantity);
      }, 0);

      // Create cart snapshot for this vendor
      const vendorCart = {
        ...cart.toObject(),
        items,
        vendor: vendor._id,
        subtotal,
        total: subtotal + cart.deliveryFee, // Simplified - each vendor gets same delivery fee
        deliveryFee: cart.deliveryFee
      };

      // Create order for this vendor
      const order = await Order.createFromCart(vendorCart, paymentMethod, notes, specialInstructions);
      orders.push(order);
      orderNumbers.push(order.orderNumber);
      totalOrderValue += order.total;
    }

    // Clear the cart after successful order creation
    await Cart.findByIdAndDelete(cart._id);

    res.json({
      success: true,
      message: 'Orders placed successfully',
      orderNumbers,
      orderIds: orders.map(o => o._id),
      totalOrders: orders.length,
      totalValue: totalOrderValue,
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        orderId: order._id,
        total: order.total,
        estimatedDelivery: order.estimatedDelivery,
        vendor: order.vendor
      }))
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create order' 
    });
  }
});

// Get user's orders
router.get('/', protect, async (req, res) => {
  try {
    // Get the user's uid from the database
    const userDoc = req.user.role === 'client' 
      ? await User.findById(req.user.id)
      : await Vendor.findById(req.user.id);
      
    if (!userDoc || !userDoc.uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const uid = userDoc.uid;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { uid };
    if (status) {
      query.status = status;
    }

    const options = {
      sort: { orderedAt: -1 },
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const orders = await Order.find(query, null, options);
    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
});

// Get specific order by order number
router.get('/:orderNumber', protect, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    // Get the user's uid from the database
    const userDoc = req.user.role === 'client' 
      ? await User.findById(req.user.id)
      : await Vendor.findById(req.user.id);
      
    if (!userDoc || !userDoc.uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const uid = userDoc.uid;

    const order = await Order.findOne({ orderNumber, uid });
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch order' 
    });
  }
});

// Update order status (admin only)
router.patch('/:orderNumber/status', protect, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status, note = '', trackingNumber, courier } = req.body;
    const { uid, role } = req.user;

    // Check if user is admin (you may need to adjust this based on your auth system)
    if (role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Update tracking information if provided
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (courier) order.courier = courier;

    // Update status with history
    await order.updateStatus(status, note, uid);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status' 
    });
  }
});

// Cancel order (customer can cancel pending/confirmed orders)
router.patch('/:orderNumber/cancel', protect, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { reason = '' } = req.body;
    
    // Get the user's uid from the database
    const userDoc = req.user.role === 'client' 
      ? await User.findById(req.user.id)
      : await Vendor.findById(req.user.id);
      
    if (!userDoc || !userDoc.uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const uid = userDoc.uid;

    const order = await Order.findOne({ orderNumber, uid });
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    // Update status to cancelled
    await order.updateStatus('cancelled', `Cancelled by customer: ${reason}`, uid);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel order' 
    });
  }
});

// Get order tracking
router.get('/:orderNumber/tracking', protect, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    // Get the user's uid from the database
    const userDoc = req.user.role === 'client' 
      ? await User.findById(req.user.id)
      : await Vendor.findById(req.user.id);
      
    if (!userDoc || !userDoc.uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const uid = userDoc.uid;

    const order = await Order.findOne({ orderNumber, uid }, {
      orderNumber: 1,
      status: 1,
      statusHistory: 1,
      trackingNumber: 1,
      courier: 1,
      trackingUrl: 1,
      orderedAt: 1,
      confirmedAt: 1,
      shippedAt: 1,
      deliveredAt: 1,
      estimatedDelivery: 1
    });

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.json({
      success: true,
      tracking: order
    });

  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tracking information' 
    });
  }
});

// VENDOR ENDPOINTS

// Get vendor's orders
router.get('/vendor/orders', protect, async (req, res) => {
  try {
    // Get the vendor's uid from the database
    const vendorDoc = await Vendor.findById(req.user.id);
    
    if (!vendorDoc || !vendorDoc.uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }
    
    const uid = vendorDoc.uid;
    const { status, page = 1, limit = 10 } = req.query;

    // Find vendor by uid to get vendor ObjectId
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    const query = { vendor: vendor._id };
    if (status) {
      query.status = status;
    }

    const options = {
      sort: { orderedAt: -1 },
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const orders = await Order.find(query, null, options)
      .populate('deliveryAddress')
      .populate('user', 'name email phone')
      .populate({
        path: 'items.product',
        select: 'name images productSnapshot'
      });
    
    // Ensure images are available in the response
    const processedOrders = orders.map(order => {
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.map(item => {
        // Ensure image is available from multiple sources
        if (!item.images || item.images.length === 0) {
          if (item.product && item.product.images) {
            item.images = item.product.images;
          } else if (item.productSnapshot && item.productSnapshot.images) {
            item.images = item.productSnapshot.images;
          }
        }
        return item;
      });
      return orderObj;
    });
    
    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders: processedOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
});

// Update order status (vendor only)
router.put('/vendor/orders/:orderNumber/status', protect, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status, notes } = req.body;
    
    // Get the vendor's uid from the database
    const vendorDoc = await Vendor.findById(req.user.id);
    
    if (!vendorDoc || !vendorDoc.uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }
    
    const uid = vendorDoc.uid;

    // Find vendor by uid
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    // Find order that belongs to this vendor
    const order = await Order.findOne({ 
      orderNumber, 
      vendor: vendor._id 
    });

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    // Update order status
    await order.updateStatus(status, notes, uid);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status' 
    });
  }
});

module.exports = router;
