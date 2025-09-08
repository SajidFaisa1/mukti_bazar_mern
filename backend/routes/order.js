const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { record: recordAudit } = require('../services/auditService');
const { scoreOrderContext } = require('../services/riskScoringService');
const { evaluateRules } = require('../services/ruleEngine');
const DeviceFingerprintService = require('../services/deviceFingerprintService');

const { rateLimit } = require('../middleware/rateLimit');
// pdfkit will be required lazily inside invoice endpoint to avoid startup crash if not installed
// Limit checkouts: 30 per 15 minutes per user/IP (basic)
const checkoutLimiter = rateLimit({ windowMs: 15*60*1000, max: 30, keyGenerator: (req) => req.user ? `checkout:${req.user.id}` : req.ip });

// Create order from cart (checkout) with fraud detection
router.post('/checkout', protect, checkoutLimiter, validateBody({
  paymentMethod: { required: true, type: 'string' }
}), async (req, res) => {
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

    // Enforce ban / verification for client users
    if (req.user.role === 'client') {
      if (userDoc.banned) {
        return res.status(403).json({ success:false, message: 'Account banned. Contact support.', code:'BANNED' });
      }
      const vStatus = userDoc.verification?.status;
      if (['required','pending','rejected'].includes(vStatus)) {
        return res.status(403).json({ success:false, message: vStatus === 'required' ? 'Verification required before purchase.' : vStatus === 'pending' ? 'Verification under review.' : 'Verification rejected. Resubmit required.', code:'VERIFICATION_BLOCK', verificationStatus: vStatus });
      }
    }

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

    // Prevent vendors from purchasing their own products (self-purchase / fake sales)
    // Also prevent if user (vendor role) tries to buy any product they own
    if (req.user.role === 'vendor') {
      const selfOwnedItems = cart.items.filter(it => it.product && it.product.vendorUid === uid);
      if (selfOwnedItems.length > 0) {
        // Audit the attempt
        recordAudit({
          type: 'self_purchase_attempt',
          actorId: uid,
          actorRole: req.user.role,
          ip: req.ip,
          requestId: req.requestId,
          resourceType: 'Cart',
          resourceId: cart._id.toString(),
          meta: {
            productIds: selfOwnedItems.map(i => i.productId),
            count: selfOwnedItems.length
          }
        });
        return res.status(400).json({
          success: false,
          message: 'Vendors cannot purchase their own products',
          products: selfOwnedItems.map(i => ({ id: i.productId, name: i.name }))
        });
      }
    }

    // Validate cart has required information
    if (!cart.deliveryAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Delivery address is required' 
      });
    }

    // Validate delivery address has required fields
    const deliveryAddr = cart.deliveryAddress;
    if (!deliveryAddr.zip || deliveryAddr.zip.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'ZIP code is required for delivery address. Please update your address to include a postal code.' 
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

      // 🛡️ Enhanced fraud detection with device fingerprinting
      const { deviceFingerprint } = req.body; // Expecting device fingerprint from client
      
      const securityReport = await DeviceFingerprintService.generateSecurityReport(
        req, 
        deviceFingerprint || {}, 
        uid
      );

      // Create order for this vendor with enhanced fraud detection
  const { order, fraudFlags } = await Order.createFromCart(
        vendorCart, 
        paymentMethod, 
        securityReport.securityInfo, 
        notes, 
        specialInstructions
      );
      
      // Add additional fraud flags from device analysis
      if (securityReport.fraudIndicators.length > 0) {
        order.suspiciousFlags.push(...securityReport.fraudIndicators);
        
        // Require approval if high risk
        if (securityReport.requiresReview) {
          order.requiresApproval = true;
          order.adminApproval.status = 'pending';
        }
        
        await order.save();
      }

      // Additional consolidated risk scoring (combine contextual + device + base indicators)
      const quantityTotal = items.reduce((t, i) => t + i.quantity, 0);
      const deviceReuse = securityReport.deviceReuseAnalysis;
      const ipReuseUsers = deviceReuse ? deviceReuse.userCount : 0; // simplification
      const userRecentOrders = fraudFlags.filter(f => f.type === 'rapid_ordering');
      const ctxScore = scoreOrderContext({
        total: order.total,
        subtotal: order.subtotal,
        itemCount: order.items.length,
        quantityTotal,
        userOrderCount24h: userRecentOrders.length ? (userRecentOrders[0].count || userRecentOrders.length) : 0,
        deviceReuse,
        ipReuseUsers,
        flags: fraudFlags
      });

      // Rule engine evaluation context (flatten relevant fields)
      const ruleContext = {
        total: order.total,
        subtotal: order.subtotal,
        itemCount: order.items.length,
        quantityTotal,
        uid: order.uid,
        vendorId: order.vendor?.toString(),
        role: order.role,
        riskScore: order.securityInfo?.riskScore || ctxScore.score,
        velocity: order.velocity,
        negotiated: order.negotiated,
        ip: securityReport.securityInfo?.ipAddress,
        deviceFingerprint: securityReport.securityInfo?.deviceFingerprint,
        flags: fraudFlags.map(f=>f.type)
      };
      let ruleEval = { applied:[], extraRisk:0, addedReasons:[], addedFlags:[], requireApproval:false };
      try { ruleEval = await evaluateRules(ruleContext); } catch(e) { console.warn('Rule evaluation failed', e.message); }

      // Merge reasons: contextual + existing + device analysis derived reasons
  const reasons = new Set([...(order.securityInfo.riskReasons||[]), ...ctxScore.reasons, ...ruleEval.addedReasons]);
  if (securityReport.riskScore >= 50) reasons.add('DEVICE_SECURITY_RISK');
      if (deviceReuse?.deviceReused) reasons.add('DEVICE_REUSE_OBSERVED');
      if (deviceReuse?.userCount > 5) reasons.add('DEVICE_SHARED_WIDELY');
  ruleEval.applied.forEach(rn => reasons.add(`RULE_${rn.toUpperCase().replace(/[^A-Z0-9]+/g,'_')}`));

      // Combine scores (not just max) but keep cap for unrealistic inflation
      const combinedScore = Math.min((securityReport.riskScore || 0) + ctxScore.score + ruleEval.extraRisk, 200);
      order.securityInfo.riskScore = combinedScore;
      order.securityInfo.riskLevel = combinedScore < 30 ? 'low' : combinedScore < 60 ? 'medium' : combinedScore < 90 ? 'high' : 'critical';
      order.securityInfo.riskReasons = Array.from(reasons);
      if (ruleEval.addedFlags.length) {
        order.suspiciousFlags.push(...ruleEval.addedFlags);
        order.requiresApproval = order.requiresApproval || ruleEval.requireApproval;
      } else if (ruleEval.requireApproval) {
        order.requiresApproval = true;
      }
      await order.save();

      orders.push(order);
      orderNumbers.push(order.orderNumber);
      totalOrderValue += order.total;
      
      // Log comprehensive fraud analysis
      if (fraudFlags.length > 0 || securityReport.fraudIndicators.length > 0) {
        console.log(`🚨 Security Analysis for order ${order.orderNumber}:`);
        console.log(`  - Risk Level: ${securityReport.riskLevel} (Score: ${securityReport.riskScore})`);
        console.log(`  - Device Hash: ${securityReport.securityInfo.deviceFingerprint}`);
        console.log(`  - IP: ${securityReport.securityInfo.ipAddress}`);
        console.log(`  - Flags: ${[...fraudFlags, ...securityReport.fraudIndicators].map(f => f.type).join(', ')}`);
        if (securityReport.deviceReuseAnalysis.deviceReused) {
          console.log(`  - Device Reuse: ${securityReport.deviceReuseAnalysis.userCount} users, ${securityReport.deviceReuseAnalysis.ipCount} IPs`);
        }
      }
    }

    // Clear the cart after successful order creation
    await Cart.findByIdAndDelete(cart._id);

    // Check if any orders require admin approval
    const requiresApproval = orders.some(order => order.requiresApproval);
    const totalFraudFlags = orders.reduce((total, order) => total + order.suspiciousFlags.length, 0);

  res.json({
      success: true,
      message: requiresApproval 
        ? 'Orders submitted for admin review due to security flags'
        : 'Orders placed successfully',
      orderNumbers,
      orderIds: orders.map(o => o._id),
      totalOrders: orders.length,
      totalValue: totalOrderValue,
      securityInfo: {
        requiresApproval,
        totalFraudFlags,
        message: requiresApproval 
          ? '🛡️ Your order has been flagged for security review. You will be notified once approved.'
          : '✅ Order passed security checks'
      },
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        orderId: order._id,
        total: order.total,
        estimatedDelivery: order.estimatedDelivery,
        vendor: order.vendor,
        requiresApproval: order.requiresApproval,
  suspiciousFlags: order.suspiciousFlags.length,
  riskScore: order.securityInfo?.riskScore,
  riskLevel: order.securityInfo?.riskLevel,
  riskReasons: order.securityInfo?.riskReasons
      }))
    });

    // Audit each order created
    for (const o of orders) {
      recordAudit({
        type: 'order_created',
        actorId: uid,
        actorRole: req.user.role,
        ip: req.ip,
        requestId: req.requestId,
        resourceType: 'Order',
        resourceId: o._id.toString(),
        meta: {
          orderNumber: o.orderNumber,
          total: o.total,
            riskScore: o.securityInfo?.riskScore,
          flags: o.suspiciousFlags.length,
          requiresApproval: o.requiresApproval
        }
      });
    }

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

// Download invoice PDF
router.get('/:orderNumber/invoice', protect, async (req, res) => {
  try {
    // Lazy require
    let PDFDocument;
    try { PDFDocument = require('pdfkit'); } catch (e) {
      return res.status(500).json({ success:false, message:'Invoice generator not available (pdfkit not installed).' });
    }
    const { orderNumber } = req.params;
    const userDoc = req.user.role === 'client'
      ? await User.findById(req.user.id)
      : await Vendor.findById(req.user.id);
    if (!userDoc || !userDoc.uid) {
      return res.status(400).json({ success:false, message:'User not found' });
    }
    const uid = userDoc.uid;
    const order = await Order.findOne({ orderNumber, uid });
    if (!order) return res.status(404).json({ success:false, message:'Order not found' });
    // Basic authorization already by uid; vendors can only access their portion via vendor route; allow here for simplicity
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order: ${order.orderNumber}`);
    doc.text(`Date: ${new Date(order.orderedAt).toLocaleString()}`);
    doc.text(`Status: ${order.status}`);
    doc.moveDown();
    doc.fontSize(14).text('Bill To');
    const a = order.deliveryAddress || {};
    doc.fontSize(10).text(`${a.name || ''}`);
    doc.text(`${a.addressLine1 || ''}`);
    doc.text(`${a.city || ''}, ${a.state || ''} ${a.zip || ''}`);
    doc.moveDown();
    doc.fontSize(14).text('Items');
    doc.moveDown(0.5);
    order.items.forEach(it => {
      doc.fontSize(10).text(`${it.name} (x${it.quantity}) - ${(it.price || 0).toFixed(2)}`);
    });
    doc.moveDown();
    doc.fontSize(12).text(`Subtotal: ${order.subtotal.toFixed(2)}`);
    doc.text(`Delivery: ${order.deliveryFee.toFixed(2)}`);
    if (order.discount) doc.text(`Discount: -${order.discount.toFixed(2)}`);
    doc.fontSize(14).text(`Total: ${order.total.toFixed(2)}`);
    doc.end();
  } catch (e) {
    console.error('Invoice generation error', e);
    res.status(500).json({ success:false, message:'Failed to generate invoice' });
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
