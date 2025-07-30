const express = require('express');
const router = express.Router();
const { sslcz } = require('../config/sslcommerz');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');

// Middleware to log all incoming requests to payment routes
router.use((req, res, next) => {
  console.log('=== Payment Route Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Raw Body Length:', req.get('Content-Length'));
  console.log('===============================');
  next();
});

// Add middleware to parse different body types for SSLCommerz callbacks
router.use('/success', express.raw({ type: '*/*' }));
router.use('/fail', express.raw({ type: '*/*' }));
router.use('/cancel', express.raw({ type: '*/*' }));
router.use('/ipn', express.raw({ type: '*/*' }));

// Initiate payment session
router.post('/init', protect, async (req, res) => {
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

    // Validate payment method (only online payments go through SSLCommerz)
    const onlinePaymentMethods = ['card', 'mobile-banking', 'bank-transfer'];
    if (!onlinePaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment method for online payment' 
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

    // Group cart items by vendor and create orders
    const itemsByVendor = {};
    for (const item of cart.items) {
      const vendorUid = item.product.vendorUid;
      if (!itemsByVendor[vendorUid]) {
        itemsByVendor[vendorUid] = [];
      }
      itemsByVendor[vendorUid].push(item);
    }

    const orders = [];
    const payments = [];
    let totalAmount = 0;

    // Create orders for each vendor
    for (const [vendorUid, items] of Object.entries(itemsByVendor)) {
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
        total: subtotal + cart.deliveryFee,
        deliveryFee: cart.deliveryFee
      };

      // Create order for this vendor
      const order = await Order.createFromCart(vendorCart, paymentMethod, notes, specialInstructions);
      orders.push(order);
      totalAmount += order.total;

      // Create payment record for each order
      const tranId = Payment.generateTransactionId(order.orderNumber);
      const payment = new Payment({
        tran_id: tranId,
        order_id: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
        cus_name: cart.deliveryAddress.name,
        cus_email: cart.deliveryAddress.email || userDoc.email,
        cus_phone: cart.deliveryAddress.phone,
        cus_add1: cart.deliveryAddress.addressLine1,
        cus_city: cart.deliveryAddress.city,
        status: 'PENDING'
      });
      
      await payment.save();
      payments.push(payment);
    }

    // For multiple orders, we'll use the first payment for SSLCommerz session
    const primaryPayment = payments[0];
    const primaryOrder = orders[0];

    // Prepare SSLCommerz data
    const data = {
      total_amount: totalAmount,
      currency: 'BDT',
      tran_id: primaryPayment.tran_id,
      success_url: `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/payment/success`,
      fail_url: `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/payment/fail`,
      cancel_url: `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/payment/cancel`,
      ipn_url: `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/payment/ipn`,
      
      // Customer information
      cus_name: primaryPayment.cus_name,
      cus_email: primaryPayment.cus_email,
      cus_add1: primaryPayment.cus_add1,
      cus_city: primaryPayment.cus_city,
      cus_state: cart.deliveryAddress.state || 'Dhaka',
      cus_postcode: cart.deliveryAddress.zip || '1000',
      cus_country: 'Bangladesh',
      cus_phone: primaryPayment.cus_phone,
      
      // Shipping information (required by SSLCommerz)
      shipping_method: 'YES', // Required field - indicates shipping is needed
      ship_name: primaryPayment.cus_name,
      ship_add1: primaryPayment.cus_add1,
      ship_city: primaryPayment.cus_city,
      ship_state: cart.deliveryAddress.state || 'Dhaka',
      ship_postcode: cart.deliveryAddress.zip || '1000',
      ship_country: 'Bangladesh',
      
      // Product information
      product_name: `Order ${primaryOrder.orderNumber}${orders.length > 1 ? ` +${orders.length - 1} more` : ''}`,
      product_category: 'Agriculture',
      product_profile: 'general',
      
      // Additional info
      value_a: JSON.stringify(orders.map(o => o.orderNumber)), // Store all order numbers
      value_b: uid, // Store user uid
      value_c: paymentMethod,
      value_d: cart._id.toString() // Store cart id for cleanup
    };

    // Initialize SSLCommerz session
    const sslczResponse = await sslcz.init(data);
    
    if (sslczResponse.status === 'SUCCESS') {
      // Clear the cart after successful payment initialization
      await Cart.findByIdAndDelete(cart._id);
      
      res.json({
        success: true,
        message: 'Payment session initiated successfully',
        sessionkey: sslczResponse.sessionkey,
        gateway_url: sslczResponse.GatewayPageURL,
        redirect_url: sslczResponse.redirectGatewayURL,
        orders: orders.map(order => ({
          orderNumber: order.orderNumber,
          orderId: order._id,
          total: order.total
        })),
        totalAmount,
        tranId: primaryPayment.tran_id
      });
    } else {
      // If SSLCommerz session fails, delete created orders and payments
      // First, restore stock for all orders before deleting them
      for (const order of orders) {
        await order.restoreStock();
      }
      
      await Order.deleteMany({ _id: { $in: orders.map(o => o._id) } });
      await Payment.deleteMany({ _id: { $in: payments.map(p => p._id) } });
      
      console.log('Restored stock and deleted orders due to payment initialization failure');
      
      throw new Error(sslczResponse.failedreason || 'Failed to initialize payment session');
    }

  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to initialize payment' 
    });
  }
});

// Payment success callback (POST from SSLCommerz)
router.post('/success', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('Payment success callback received (POST)');
    console.log('req.body:', req.body);
    console.log('req.query:', req.query);
    
    // If body is a buffer, convert it to string and parse as URL-encoded
    let data = req.body;
    if (Buffer.isBuffer(req.body)) {
      const bodyString = req.body.toString('utf8');
      console.log('Raw body string:', bodyString);
      
      // Parse URL-encoded string manually
      data = {};
      const params = new URLSearchParams(bodyString);
      for (const [key, value] of params) {
        data[key] = value;
      }
      console.log('Parsed data from buffer:', data);
    } else if (req.body && Object.keys(req.body).length > 0) {
      data = req.body;
    } else {
      data = req.query;
    }
    
    console.log('Using data:', data);
    
    const { tran_id, val_id, status, bank_tran_id } = data || {};
    
    if (!tran_id) {
      console.log('No transaction ID found in request');
      console.log('Available data keys:', Object.keys(data || {}));
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=No+transaction+ID+found`);
    }
    
    // For sandbox/testing, we'll skip validation and directly update the payment
    console.log('Processing payment success for transaction:', tran_id);
    
    // Find payment record
    const payment = await Payment.findOne({ tran_id }).populate('order_id');
    
    if (!payment) {
      console.log('Payment record not found for transaction:', tran_id);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=Payment+record+not+found&tran_id=${tran_id}`);
    }
    
    console.log('Found payment record:', payment._id);
    
    // For sandbox testing, we'll treat any success callback as valid
    // In production, you would validate with SSLCommerz using sslcz.validate()
    
    // Update payment status
    await payment.updatePaymentStatus('VALID', data);
    console.log('Updated payment status to VALID');
    
    // Update order status and payment info
    const order = payment.order_id;
    order.paymentStatus = 'paid';
    order.isPaid = true;
    order.paymentId = bank_tran_id || tran_id;
    order.status = 'confirmed';
    await order.save();
    console.log('Updated order status to confirmed');
    
    // If there are multiple orders (stored in value_a), update them all
    try {
      let allOrderNumbers = [];
      const valueA = data.value_a || payment.validationData?.value_a;
      
      console.log('Raw value_a:', valueA);
      console.log('value_a type:', typeof valueA);
      console.log('value_a length:', valueA ? valueA.length : 'undefined');
      
      if (valueA && valueA.trim()) {
        try {
          allOrderNumbers = JSON.parse(valueA);
          console.log('Successfully parsed value_a:', allOrderNumbers);
        } catch (parseError) {
          console.log('Failed to parse value_a as JSON:', parseError.message);
          console.log('Raw value_a content:', JSON.stringify(valueA));
          // If it's not valid JSON, treat it as a single order number
          allOrderNumbers = [valueA];
        }
      } else {
        console.log('value_a is empty or undefined, skipping multiple order update');
      }
      
      if (Array.isArray(allOrderNumbers) && allOrderNumbers.length > 1) {
        console.log('Updating multiple orders:', allOrderNumbers);
        await Order.updateMany(
          { orderNumber: { $in: allOrderNumbers } },
          { 
            paymentStatus: 'paid',
            isPaid: true,
            paymentId: bank_tran_id || tran_id,
            status: 'confirmed'
          }
        );
        console.log('Updated multiple orders successfully');
      }
    } catch (e) {
      console.error('Error updating multiple orders:', e);
    }
    
    console.log('Redirecting to frontend success page');
    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?tran_id=${tran_id}`);
    
  } catch (error) {
    console.error('Payment success handling error:', error);
    const tran_id = (req.body && req.body.tran_id) || (req.query && req.query.tran_id) || '';
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=Payment+processing+error&tran_id=${tran_id}`);
  }
});

// Payment success callback (GET for direct access)
router.get('/success', async (req, res) => {
  try {
    console.log('Payment success callback received (GET):', req.query);
    const { tran_id, val_id, status, bank_tran_id } = req.query;
    
    // For sandbox/testing, we'll skip validation and directly update the payment
    console.log('Processing payment success for transaction:', tran_id);
    
    // Find payment record
    const payment = await Payment.findOne({ tran_id }).populate('order_id');
    
    if (!payment) {
      console.log('Payment record not found for transaction:', tran_id);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=Payment+record+not+found&tran_id=${tran_id}`);
    }
    
    console.log('Found payment record:', payment._id);
    
    // For sandbox testing, we'll treat any success callback as valid
    // In production, you would validate with SSLCommerz using sslcz.validate()
    
    // Update payment status
    await payment.updatePaymentStatus('VALID', req.query);
    console.log('Updated payment status to VALID');
    
    // Update order status and payment info
    const order = payment.order_id;
    order.paymentStatus = 'paid';
    order.isPaid = true;
    order.paymentId = bank_tran_id || tran_id;
    order.status = 'confirmed';
    await order.save();
    console.log('Updated order status to confirmed');
    
    // If there are multiple orders (stored in value_a), update them all
    try {
      const allOrderNumbers = JSON.parse(req.query.value_a || payment.validationData?.value_a || '[]');
      if (Array.isArray(allOrderNumbers) && allOrderNumbers.length > 1) {
        console.log('Updating multiple orders:', allOrderNumbers);
        await Order.updateMany(
          { orderNumber: { $in: allOrderNumbers } },
          { 
            paymentStatus: 'paid',
            isPaid: true,
            paymentId: bank_tran_id || tran_id,
            status: 'confirmed'
          }
        );
        console.log('Updated multiple orders successfully');
      }
    } catch (e) {
      console.error('Error updating multiple orders:', e);
    }
    
    console.log('Redirecting to frontend success page');
    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?tran_id=${tran_id}`);
    
  } catch (error) {
    console.error('Payment success handling error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=Payment+processing+error&tran_id=${req.query.tran_id || ''}`);
  }
});

// Payment failure callback (POST from SSLCommerz)
router.post('/fail', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('Payment failure callback received (POST)');
    console.log('req.body:', req.body);
    console.log('req.query:', req.query);
    
    // If body is a buffer, convert it to string and parse as URL-encoded
    let data = req.body;
    if (Buffer.isBuffer(req.body)) {
      const bodyString = req.body.toString('utf8');
      console.log('Raw body string:', bodyString);
      
      // Parse URL-encoded string manually
      data = {};
      const params = new URLSearchParams(bodyString);
      for (const [key, value] of params) {
        data[key] = value;
      }
      console.log('Parsed data from buffer:', data);
    } else if (req.body && Object.keys(req.body).length > 0) {
      data = req.body;
    } else {
      data = req.query;
    }
    const { tran_id, status, failedreason } = data || {};
    
    console.log('Processing payment failure for transaction:', tran_id);
    
    // Find and update payment record
    if (tran_id) {
      const payment = await Payment.findOne({ tran_id });
      if (payment) {
        await payment.updatePaymentStatus('FAILED', data);
        console.log('Updated payment status to FAILED');
        
        // Update order status
        const order = await Order.findById(payment.order_id);
        if (order) {
          order.paymentStatus = 'failed';
          order.status = 'cancelled';
          await order.save();
          
          // Restore stock for cancelled order
          await order.restoreStock();
          
          console.log('Updated order status to cancelled and restored stock');
        }
      }
    }
    
    const errorMsg = failedreason || 'Payment failed';
    console.log('Redirecting to frontend fail page with error:', errorMsg);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=${encodeURIComponent(errorMsg)}&tran_id=${tran_id || ''}`);
    
  } catch (error) {
    console.error('Payment failure handling error:', error);
    const tran_id = (req.body && req.body.tran_id) || (req.query && req.query.tran_id) || '';
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=Payment+processing+error&tran_id=${tran_id}`);
  }
});

// Payment failure callback (GET for direct access)
router.get('/fail', async (req, res) => {
  try {
    console.log('Payment failure callback received (GET):', req.query);
    const { tran_id, status, failedreason } = req.query;
    
    // Find and update payment record
    const payment = await Payment.findOne({ tran_id });
    if (payment) {
      await payment.updatePaymentStatus('FAILED', req.query);
      console.log('Updated payment status to FAILED');
      
      // Update order status
      const order = await Order.findById(payment.order_id);
      if (order) {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        await order.save();
        
        // Restore stock for cancelled order
        await order.restoreStock();
        
        console.log('Updated order status to cancelled and restored stock');
      }
    }
    
    const errorMsg = failedreason || 'Payment failed';
    console.log('Redirecting to frontend fail page with error:', errorMsg);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=${encodeURIComponent(errorMsg)}&tran_id=${tran_id || ''}`);
    
  } catch (error) {
    console.error('Payment failure handling error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/fail?error=Payment+processing+error&tran_id=${req.query.tran_id || ''}`);
  }
});

// Payment cancellation callback (POST from SSLCommerz)
router.post('/cancel', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('Payment cancellation callback received (POST)');
    console.log('req.body:', req.body);
    console.log('req.query:', req.query);
    
    // If body is a buffer, convert it to string and parse as URL-encoded
    let data = req.body;
    if (Buffer.isBuffer(req.body)) {
      const bodyString = req.body.toString('utf8');
      console.log('Raw body string:', bodyString);
      
      // Parse URL-encoded string manually
      data = {};
      const params = new URLSearchParams(bodyString);
      for (const [key, value] of params) {
        data[key] = value;
      }
      console.log('Parsed data from buffer:', data);
    } else if (req.body && Object.keys(req.body).length > 0) {
      data = req.body;
    } else {
      data = req.query;
    }
    const { tran_id, status } = data || {};
    
    console.log('Processing payment cancellation for transaction:', tran_id);
    
    // Find and update payment record
    if (tran_id) {
      const payment = await Payment.findOne({ tran_id });
      if (payment) {
        await payment.updatePaymentStatus('CANCELLED', data);
        console.log('Updated payment status to CANCELLED');
        
        // Update order status
        const order = await Order.findById(payment.order_id);
        if (order) {
          order.paymentStatus = 'failed';
          order.status = 'cancelled';
          await order.save();
          
          // Restore stock for cancelled order
          await order.restoreStock();
          
          console.log('Updated order status to cancelled and restored stock');
        }
      }
    }
    
    console.log('Redirecting to frontend cancel page');
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel?tran_id=${tran_id || ''}`);
    
  } catch (error) {
    console.error('Payment cancellation handling error:', error);
    const tran_id = (req.body && req.body.tran_id) || (req.query && req.query.tran_id) || '';
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel?error=Payment+processing+error&tran_id=${tran_id}`);
  }
});

// Payment cancellation callback (GET for direct access)
router.get('/cancel', async (req, res) => {
  try {
    console.log('Payment cancellation callback received (GET):', req.query);
    const { tran_id, status } = req.query;
    
    // Find and update payment record
    const payment = await Payment.findOne({ tran_id });
    if (payment) {
      await payment.updatePaymentStatus('CANCELLED', req.query);
      console.log('Updated payment status to CANCELLED');
      
      // Update order status
      const order = await Order.findById(payment.order_id);
      if (order) {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        await order.save();
        
        // Restore stock for cancelled order
        await order.restoreStock();
        
        console.log('Updated order status to cancelled and restored stock');
      }
    }
    
    console.log('Redirecting to frontend cancel page');
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel?tran_id=${tran_id || ''}`);
    
  } catch (error) {
    console.error('Payment cancellation handling error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel?error=Payment+processing+error&tran_id=${req.query.tran_id || ''}`);
  }
});

// IPN (Instant Payment Notification) endpoint
router.post('/ipn', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('IPN callback received:', req.body);
    
    // If body is a buffer, convert it to string and parse as URL-encoded
    let data = req.body;
    if (Buffer.isBuffer(req.body)) {
      const bodyString = req.body.toString('utf8');
      console.log('Raw IPN body string:', bodyString);
      
      // Parse URL-encoded string manually
      data = {};
      const params = new URLSearchParams(bodyString);
      for (const [key, value] of params) {
        data[key] = value;
      }
      console.log('Parsed IPN data from buffer:', data);
    }
    
    const { tran_id, val_id, status } = data;
    
    // Process IPN
    if (status === 'VALID') {
      const validationResponse = await sslcz.validate({ val_id });
      
      if (validationResponse.status === 'VALID') {
        const payment = await Payment.findOne({ tran_id });
        if (payment && payment.status !== 'VALID') {
          await payment.updatePaymentStatus('VALID', validationResponse);
          
          // Update order
          const order = await Order.findById(payment.order_id);
          if (order) {
            order.paymentStatus = 'paid';
            order.isPaid = true;
            order.paymentId = validationResponse.bank_tran_id;
            order.status = 'confirmed';
            await order.save();
          }
        }
      }
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('IPN processing error:', error);
    res.status(500).send('ERROR');
  }
});

// Payment verification endpoint (for frontend)
router.get('/verify/:transactionId', protect, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
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
    
    // Find the payment record
    const payment = await Payment.findOne({ 
      tran_id: transactionId
    }).populate('order_id');
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Get all orders for this payment (if multiple orders)
    let orderNumbers = [payment.orderNumber];
    
    try {
      if (payment.validationData && payment.validationData.value_a) {
        const allOrderNumbers = JSON.parse(payment.validationData.value_a);
        if (Array.isArray(allOrderNumbers) && allOrderNumbers.length > 0) {
          orderNumbers = allOrderNumbers;
        }
      }
    } catch (e) {
      // Keep the single order number
    }
    
    res.json({
      success: true,
      transactionId: payment.tran_id,
      amount: payment.amount,
      status: payment.status,
      orderNumbers,
      createdAt: payment.createdAt
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify payment' 
    });
  }
});

// Get payment status (public endpoint for payment verification)
router.get('/status/:tran_id', async (req, res) => {
  try {
    const { tran_id } = req.params;
    
    const payment = await Payment.findOne({ tran_id }).populate('order_id');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Only return basic payment info for security
    res.json({
      success: true,
      transactionId: payment.tran_id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      order: payment.order_id ? {
        orderNumber: payment.order_id.orderNumber,
        status: payment.order_id.status,
        paymentStatus: payment.order_id.paymentStatus
      } : null
    });
    
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status'
    });
  }
});

module.exports = router;
