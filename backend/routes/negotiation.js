const express = require('express');
const Negotiation = require('../models/Negotiation');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { sslcz } = require('../config/sslcommerz');
const Address = require('../models/Address');
const { protect } = require('../middleware/auth');
const deliveryCalculator = require('../services/deliveryCalculator');
const router = express.Router();

// POST /api/negotiations - Start a new negotiation
router.post('/', async (req, res) => {
  try {
    const {
      buyerUid,
      buyerRole,
      sellerUid,
      productId,
      proposedPrice,
      quantity = 1,
      message = '',
      conversationId
    } = req.body;

    // Validate required fields
    if (!buyerUid || !buyerRole || !sellerUid || !productId || !proposedPrice) {
      return res.status(400).json({ 
        error: 'Missing required fields: buyerUid, buyerRole, sellerUid, productId, proposedPrice' 
      });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate original price based on product pricing logic
    const originalPrice = (product.offerPrice && product.offerPrice > 0) 
      ? product.offerPrice 
      : product.unitPrice;

    // Get buyer details
    const BuyerModel = buyerRole === 'vendor' ? Vendor : User;
    const buyer = await BuyerModel.findOne({ uid: buyerUid });
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    // Get seller details (always vendor for now)
    const seller = await Vendor.findOne({ uid: sellerUid });
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Check if there's already an active negotiation for this product between these users
    const existingNegotiation = await Negotiation.findOne({
      buyerUid,
      sellerUid,
      productId,
      status: 'active',
      isActive: true
    });

    if (existingNegotiation) {
      return res.status(409).json({ 
        error: 'An active negotiation already exists for this product',
        negotiationId: existingNegotiation._id
      });
    }

    // Create new negotiation
    const negotiation = new Negotiation({
      buyerUid,
      buyerRole,
      buyer: buyer._id,
      buyerModel: buyerRole === 'vendor' ? 'Vendor' : 'User',
      sellerUid,
      sellerRole: 'vendor',
      seller: seller._id,
      productId,
      productName: product.name,
      productImage: product.images?.[0],
      originalPrice: originalPrice,
      currentPrice: proposedPrice,
      quantity,
      totalAmount: proposedPrice * quantity,
      conversationId
    });

    // Add initial offer
    await negotiation.addOffer(buyerUid, buyerRole, proposedPrice, quantity, message);

    await negotiation.save();

    // Populate the negotiation with related data
    const populatedNegotiation = await Negotiation.findById(negotiation._id)
      .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType description')
      .populate('buyer', 'name email businessName')
      .populate('seller', 'businessName email storeId');

    // Send notification to seller
    try {
      console.log('🔔 Creating negotiation notification for seller:', negotiation.sellerUid);
      await Notification.createNegotiationNotification(
        'new_negotiation',
        populatedNegotiation,
        buyerUid
      );
      console.log('✅ Negotiation notification created successfully');
    } catch (notificationError) {
      console.error('❌ Error sending notification:', notificationError);
      // Don't fail the negotiation creation if notification fails
    }

    // Send negotiation message to conversation if conversation exists
    if (conversationId) {
      try {
        const negotiationMessage = new Message({
          conversation: conversationId,
          content: `💰 New price negotiation started for ${product.name}`,
          sender: buyer._id,
          senderModel: buyerRole === 'vendor' ? 'Vendor' : 'User',
          senderUid: buyerUid,
          senderRole: buyerRole,
          senderName: buyerRole === 'vendor' ? buyer.businessName : buyer.name,
          messageType: 'negotiation',
          negotiationData: {
            productId: product._id,
            originalPrice: originalPrice,
            proposedPrice: proposedPrice,
            quantity: quantity,
            status: 'pending'
          },
          readBy: [{
            user: buyer._id,
            userModel: buyerRole === 'vendor' ? 'Vendor' : 'User',
            readAt: new Date()
          }]
        });

        await negotiationMessage.save();

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          'lastMessage.content': negotiationMessage.content,
          'lastMessage.timestamp': negotiationMessage.createdAt,
          'lastMessage.senderName': negotiationMessage.senderName
        });
      } catch (messageError) {
        console.error('Error sending negotiation message:', messageError);
        // Don't fail the negotiation creation if message fails
      }
    }

    res.status(201).json({
      success: true,
      negotiation: populatedNegotiation,
      message: 'Negotiation started successfully'
    });

  } catch (error) {
    console.error('Error creating negotiation:', error);
    res.status(500).json({ error: 'Failed to create negotiation' });
  }
});

// GET /api/negotiations - Get negotiations for a user
router.get('/', async (req, res) => {
  try {
    const { uid, role, status = 'all' } = req.query;

    if (!uid || !role) {
      return res.status(400).json({ error: 'uid and role are required' });
    }

    let baseQuery = { isActive: true };

    // Build base query based on role
    if (role === 'vendor') {
      baseQuery.$or = [ { buyerUid: uid }, { sellerUid: uid } ];
    } else {
      baseQuery.buyerUid = uid;
    }

    // Clone base query for modifications
    let query = { ...baseQuery };

    const now = new Date();
    const filterType = status.toLowerCase();

    if (filterType !== 'all') {
      switch (filterType) {
        case 'active':
          query.status = 'active';
          query.expiresAt = { $gt: now };
          break;
        case 'completed': // backward compatibility: accepted or rejected
          query.status = { $in: ['accepted', 'rejected'] };
          break;
        case 'accepted':
          query.status = 'accepted';
          break;
        case 'expired':
        case 'rejected':
        case 'cancelled':
          query.status = filterType;
          break;
        case 'paid':
        case 'cod':
          // We'll fetch accepted negotiations first then filter by associated orders below
          query.status = 'accepted';
          break;
        default:
          // Unknown filter -> treat as 'all'
          break;
      }
    }

  let negotiations = await Negotiation.find(query)
      .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType description')
      .populate('buyer', 'name email businessName')
      .populate('seller', 'businessName email storeId')
      .sort({ createdAt: -1 });

    let ordersSummary = {};

    // For any scenario where we need order/payment context (all, accepted, paid, cod) gather related orders
    const needOrderContext = ['all','accepted','paid','cod'].includes(filterType);
    if (needOrderContext) {
      const acceptedNegotiationIds = negotiations
        .filter(n => n.status === 'accepted')
        .map(n => n._id);
      if (acceptedNegotiationIds.length > 0) {
        const relatedOrders = await Order.find({ negotiation: { $in: acceptedNegotiationIds } })
          .select('negotiation paymentMethod paymentStatus isPaid orderNumber');
        relatedOrders.forEach(o => {
          ordersSummary[o.negotiation.toString()] = {
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            isPaid: o.isPaid,
            orderNumber: o.orderNumber,
            orderId: o._id.toString()
          };
        });
      }
    }

    // Apply post-filter for paid/cod tabs
    if (filterType === 'accepted') {
      // Only accepted negotiations without any order yet
      negotiations = negotiations.filter(n => !ordersSummary[n._id.toString()]);
    } else if (filterType === 'paid') {
      negotiations = negotiations.filter(n => {
        const ord = ordersSummary[n._id.toString()];
        return ord && ord.paymentMethod !== 'cod' && !!ord.isPaid;
      });
    } else if (filterType === 'cod') {
      negotiations = negotiations.filter(n => {
        const ord = ordersSummary[n._id.toString()];
        return ord && ord.paymentMethod === 'cod';
      });
    }

    res.json({ negotiations, ordersSummary: Object.keys(ordersSummary).length ? ordersSummary : undefined });

  } catch (error) {
    console.error('Error fetching negotiations:', error);
    res.status(500).json({ error: 'Failed to fetch negotiations' });
  }
});

// GET /api/negotiations/conversation/:conversationId - Get negotiations for a conversation
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const negotiations = await Negotiation.findByConversation(conversationId);

    res.json({ negotiations });

  } catch (error) {
    console.error('Error fetching conversation negotiations:', error);
    res.status(500).json({ error: 'Failed to fetch negotiations' });
  }
});

// GET /api/negotiations/:id - Get specific negotiation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    const negotiation = await Negotiation.findById(id)
      .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType description')
      .populate('buyer', 'name email businessName')
      .populate('seller', 'businessName email storeId');

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Check if user is a participant
    if (uid && !negotiation.isParticipant(uid)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ negotiation });

  } catch (error) {
    console.error('Error fetching negotiation:', error);
    res.status(500).json({ error: 'Failed to fetch negotiation' });
  }
});

// POST /api/negotiations/:id/counter-offer - Make a counter offer
router.post('/:id/counter-offer', async (req, res) => {
  try {
    const { id } = req.params;
    const { fromUid, fromRole, price, quantity, message = '' } = req.body;

    if (!fromUid || !fromRole || !price || !quantity) {
      return res.status(400).json({ 
        error: 'Missing required fields: fromUid, fromRole, price, quantity' 
      });
    }

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Check if user is a participant
    if (!negotiation.isParticipant(fromUid)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if negotiation is still active
    if (negotiation.status !== 'active') {
      return res.status(400).json({ error: 'Negotiation is no longer active' });
    }

    // Check if negotiation has expired
    if (negotiation.expiresAt < new Date()) {
      await negotiation.updateOne({ status: 'expired' });
      return res.status(400).json({ error: 'Negotiation has expired' });
    }

    // Mark previous offers as countered
    if (negotiation.offers.length > 0) {
      negotiation.offers[negotiation.offers.length - 1].status = 'countered';
    }

    // Add counter offer
    await negotiation.addOffer(fromUid, fromRole, price, quantity, message);

    // Populate and return updated negotiation
    const updatedNegotiation = await Negotiation.findById(id)
      .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType description')
      .populate('buyer', 'name email businessName')
      .populate('seller', 'businessName email storeId');

    // Send notification for counter offer
    try {
      await Notification.createNegotiationNotification(
        'counter_offer',
        updatedNegotiation,
        fromUid,
        { price, quantity }
      );
    } catch (notificationError) {
      console.error('Error sending counter offer notification:', notificationError);
    }

    // Send counter offer message to conversation
    if (negotiation.conversationId) {
      try {
        const UserModel = fromRole === 'vendor' ? Vendor : User;
        const user = await UserModel.findOne({ uid: fromUid });
        const userName = fromRole === 'vendor' ? user.businessName : user.name;

        const counterOfferMessage = new Message({
          conversation: negotiation.conversationId,
          content: `💰 Counter offer: ৳${price} × ${quantity} = ৳${price * quantity}`,
          sender: user._id,
          senderModel: fromRole === 'vendor' ? 'Vendor' : 'User',
          senderUid: fromUid,
          senderRole: fromRole,
          senderName: userName,
          messageType: 'negotiation',
          negotiationData: {
            productId: negotiation.productId,
            originalPrice: negotiation.originalPrice,
            proposedPrice: price,
            quantity: quantity,
            status: 'counter'
          },
          readBy: [{
            user: user._id,
            userModel: fromRole === 'vendor' ? 'Vendor' : 'User',
            readAt: new Date()
          }]
        });

        await counterOfferMessage.save();

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(negotiation.conversationId, {
          'lastMessage.content': counterOfferMessage.content,
          'lastMessage.timestamp': counterOfferMessage.createdAt,
          'lastMessage.senderName': counterOfferMessage.senderName
        });
      } catch (messageError) {
        console.error('Error sending counter offer message:', messageError);
      }
    }

    res.json({
      success: true,
      negotiation: updatedNegotiation,
      message: 'Counter offer sent successfully'
    });

  } catch (error) {
    console.error('Error creating counter offer:', error);
    res.status(500).json({ error: 'Failed to create counter offer' });
  }
});

// POST /api/negotiations/:id/accept - Accept current offer
router.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Check if user is a participant
    if (!negotiation.isParticipant(uid)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if negotiation is still active
    if (negotiation.status !== 'active') {
      return res.status(400).json({ error: 'Negotiation is no longer active' });
    }

    // Accept the offer
    await negotiation.acceptOffer(uid);

    // Populate and return updated negotiation
    const updatedNegotiation = await Negotiation.findById(id)
      .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType description')
      .populate('buyer', 'name email businessName')
      .populate('seller', 'businessName email storeId');

    // Send notification for accepted offer
    try {
      await Notification.createNegotiationNotification(
        'offer_accepted',
        updatedNegotiation,
        uid
      );
    } catch (notificationError) {
      console.error('Error sending acceptance notification:', notificationError);
    }

    // Send acceptance message to conversation
    if (negotiation.conversationId) {
      try {
        // Determine who accepted
        const acceptorRole = negotiation.buyerUid === uid ? negotiation.buyerRole : 'vendor';
        const UserModel = acceptorRole === 'vendor' ? Vendor : User;
        const acceptor = await UserModel.findOne({ uid: uid });
        const acceptorName = acceptorRole === 'vendor' ? acceptor.businessName : acceptor.name;

        const acceptanceMessage = new Message({
          conversation: negotiation.conversationId,
          content: `✅ Offer accepted! Final price: ৳${negotiation.finalPrice} × ${negotiation.finalQuantity} = ৳${negotiation.finalTotalAmount}`,
          sender: acceptor._id,
          senderModel: acceptorRole === 'vendor' ? 'Vendor' : 'User',
          senderUid: uid,
          senderRole: acceptorRole,
          senderName: acceptorName,
          messageType: 'negotiation',
          negotiationData: {
            productId: negotiation.productId,
            originalPrice: negotiation.originalPrice,
            proposedPrice: negotiation.finalPrice,
            quantity: negotiation.finalQuantity,
            status: 'accepted'
          },
          readBy: [{
            user: acceptor._id,
            userModel: acceptorRole === 'vendor' ? 'Vendor' : 'User',
            readAt: new Date()
          }]
        });

        await acceptanceMessage.save();

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(negotiation.conversationId, {
          'lastMessage.content': acceptanceMessage.content,
          'lastMessage.timestamp': acceptanceMessage.createdAt,
          'lastMessage.senderName': acceptanceMessage.senderName
        });
      } catch (messageError) {
        console.error('Error sending acceptance message:', messageError);
      }
    }

    res.json({
      success: true,
      negotiation: updatedNegotiation,
      message: 'Offer accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// POST /api/negotiations/:id/reject - Reject current offer
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Check if user is a participant
    if (!negotiation.isParticipant(uid)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if negotiation is still active
    if (negotiation.status !== 'active') {
      return res.status(400).json({ error: 'Negotiation is no longer active' });
    }

    // Reject the offer
    await negotiation.rejectOffer();

    // Populate and return updated negotiation
    const updatedNegotiation = await Negotiation.findById(id)
      .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType description')
      .populate('buyer', 'name email businessName')
      .populate('seller', 'businessName email storeId');

    // Send notification for rejected offer
    try {
      await Notification.createNegotiationNotification(
        'offer_rejected',
        updatedNegotiation,
        uid
      );
    } catch (notificationError) {
      console.error('Error sending rejection notification:', notificationError);
    }

    // Send rejection message to conversation
    if (negotiation.conversationId) {
      try {
        // Determine who rejected
        const rejectorRole = negotiation.buyerUid === uid ? negotiation.buyerRole : 'vendor';
        const UserModel = rejectorRole === 'vendor' ? Vendor : User;
        const rejector = await UserModel.findOne({ uid: uid });
        const rejectorName = rejectorRole === 'vendor' ? rejector.businessName : rejector.name;

        const rejectionMessage = new Message({
          conversation: negotiation.conversationId,
          content: `❌ Offer rejected for ${negotiation.productName}`,
          sender: rejector._id,
          senderModel: rejectorRole === 'vendor' ? 'Vendor' : 'User',
          senderUid: uid,
          senderRole: rejectorRole,
          senderName: rejectorName,
          messageType: 'negotiation',
          negotiationData: {
            productId: negotiation.productId,
            originalPrice: negotiation.originalPrice,
            proposedPrice: negotiation.finalPrice || negotiation.proposedPrice,
            quantity: negotiation.finalQuantity || negotiation.quantity,
            status: 'rejected'
          },
          readBy: [{
            user: rejector._id,
            userModel: rejectorRole === 'vendor' ? 'Vendor' : 'User',
            readAt: new Date()
          }]
        });

        await rejectionMessage.save();

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(negotiation.conversationId, {
          'lastMessage.content': rejectionMessage.content,
          'lastMessage.timestamp': rejectionMessage.createdAt,
          'lastMessage.senderName': rejectionMessage.senderName
        });
      } catch (messageError) {
        console.error('Error sending rejection message:', messageError);
      }
    }

    res.json({
      success: true,
      negotiation: updatedNegotiation,
      message: 'Offer rejected'
    });

  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
});

// DELETE /api/negotiations/:id - Cancel negotiation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Check if user is a participant
    if (!negotiation.isParticipant(uid)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow cancellation if negotiation is active
    if (negotiation.status !== 'active') {
      return res.status(400).json({ error: 'Cannot cancel non-active negotiation' });
    }

    // Cancel the negotiation
    await negotiation.updateOne({ 
      status: 'cancelled',
      isActive: false 
    });

    res.json({
      success: true,
      message: 'Negotiation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling negotiation:', error);
    res.status(500).json({ error: 'Failed to cancel negotiation' });
  }
});

module.exports = router;

// ---------------- NEGOTIATION CHECKOUT EXTENSIONS ----------------
// Protected routes appended after export for minimal intrusion in existing logic

// Get available delivery methods for an accepted negotiation (mirrors cart logic for single item)
router.get('/:id/delivery-methods', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const negotiation = await Negotiation.findById(id).populate('productId');
    if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

    // Only participants can view
    if (!negotiation.isParticipant(req.user.uid)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Allow preview only when accepted and not already ordered
    if (negotiation.status !== 'accepted') {
      return res.status(400).json({ error: 'Negotiation not accepted yet' });
    }

    const quantity = negotiation.finalQuantity || (negotiation.offers?.length ? negotiation.offers[negotiation.offers.length - 1].quantity : negotiation.quantity) || 1;
    const price = negotiation.finalPrice || (negotiation.offers?.length ? negotiation.offers[negotiation.offers.length - 1].price : negotiation.proposedPrice);
    const product = negotiation.productId;
    if (!product) return res.status(400).json({ error: 'Product data missing' });

    // Build minimal cartItems array used by deliveryCalculator
    const cartItems = [{
      name: product.name,
      unitType: product.unitType || 'pcs',
      quantity,
      product: { unitType: product.unitType }
    }];

    const totalWeight = deliveryCalculator.calculateTotalWeight(cartItems);
    const deliveryMethods = deliveryCalculator.getAvailableDeliveryMethods(cartItems, totalWeight);
    const recommendedMethod = deliveryCalculator.getRecommendedDeliveryMethod(cartItems, totalWeight);

    res.json({
      totalWeight,
      deliveryMethods,
      recommendedMethod,
      subtotal: price * quantity
    });
  } catch (e) {
    console.error('Negotiation delivery-methods error:', e);
    res.status(500).json({ error: 'Failed to get delivery methods' });
  }
});

// Calculate delivery fee for a chosen method (single-item negotiation)
router.post('/:id/calculate-delivery', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryMethod, negotiatedFee = 0 } = req.body;
    const negotiation = await Negotiation.findById(id).populate('productId');
    if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
    if (!negotiation.isParticipant(req.user.uid)) return res.status(403).json({ error: 'Access denied' });
    if (negotiation.status !== 'accepted') return res.status(400).json({ error: 'Negotiation not accepted yet' });
    if (!deliveryMethod) return res.status(400).json({ error: 'deliveryMethod required' });

    const quantity = negotiation.finalQuantity || (negotiation.offers?.length ? negotiation.offers[negotiation.offers.length - 1].quantity : negotiation.quantity) || 1;
    const product = negotiation.productId;
    if (!product) return res.status(400).json({ error: 'Product data missing' });

    const cartItems = [{
      name: product.name,
      unitType: product.unitType || 'pcs',
      quantity,
      product: { unitType: product.unitType }
    }];

    const totalWeight = deliveryCalculator.calculateTotalWeight(cartItems);
    if (!deliveryCalculator.isDeliveryMethodAvailable(deliveryMethod, cartItems, totalWeight)) {
      return res.status(400).json({ error: 'Delivery method not available for this negotiation' });
    }

    const fee = deliveryCalculator.calculateDeliveryFee(deliveryMethod, cartItems, totalWeight, negotiatedFee);
    const estimatedDays = deliveryCalculator.getEstimatedDeliveryDays(deliveryMethod);

    res.json({
      deliveryMethod,
      deliveryFee: fee,
      totalWeight,
      estimatedDays,
      breakdown: {
        weightBasedFee: totalWeight > 0 ? totalWeight * 7 : 0,
        pieceBasedFee: (product.unitType || 'pcs').toLowerCase().startsWith('pc') && totalWeight === 0 ? 70 : 0,
        baseFee: deliveryMethod === 'semi-truck' ? 200 : deliveryMethod === 'truck' ? 500 : 0,
        negotiatedFee: deliveryMethod === 'negotiated' ? negotiatedFee : 0
      }
    });
  } catch (e) {
    console.error('Negotiation calculate-delivery error:', e);
    res.status(500).json({ error: 'Failed to calculate delivery fee' });
  }
});

// Create order from an accepted negotiation (COD or initiate online payment)
router.post('/:id/checkout', protect, async (req, res) => {
  try {
    const { id } = req.params;
  const { paymentMethod = 'cod', addressId, notes = '', specialInstructions = '', deviceFingerprint, deliveryMethod: providedDeliveryMethod, negotiatedFee = 0, deliveryNotes } = req.body;

    const validPaymentMethods = ['cod', 'card', 'mobile-banking', 'bank-transfer'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ success:false, message:'Invalid payment method' });
    }

    const negotiation = await Negotiation.findById(id)
      .populate('productId')
      .populate('buyer')
      .populate('seller');
    if (!negotiation) return res.status(404).json({ success:false, message:'Negotiation not found' });
    if (negotiation.status !== 'accepted') return res.status(400).json({ success:false, message:'Negotiation not accepted yet' });

    // Determine acting user uid from DB auth context
    const authUid = req.user.uid; // set by auth middleware
    if (!negotiation.isParticipant(authUid)) {
      return res.status(403).json({ success:false, message:'Not authorized for this negotiation' });
    }

    // Only buyer can checkout
    if (authUid !== negotiation.buyerUid) {
      return res.status(403).json({ success:false, message:'Only buyer can place order' });
    }

    // Refresh user doc for latest verification / ban status
    const buyerDoc = negotiation.buyerRole === 'vendor'
      ? await Vendor.findOne({ uid: negotiation.buyerUid })
      : await User.findOne({ uid: negotiation.buyerUid });
    if (!buyerDoc) return res.status(400).json({ success:false, message:'Buyer account not found' });

    // Ban / verification enforcement (mirror order checkout logic)
    if (negotiation.buyerRole === 'client') {
      if (buyerDoc.banned) {
        return res.status(403).json({ success:false, message:'Account banned. Contact support.', code:'BANNED' });
      }
      const vStatus = buyerDoc.verification?.status;
      if (['required','pending','rejected'].includes(vStatus)) {
        return res.status(403).json({ success:false, message: vStatus === 'required' ? 'Verification required before purchase.' : vStatus === 'pending' ? 'Verification under review.' : 'Verification rejected. Resubmit required.', code:'VERIFICATION_BLOCK', verificationStatus: vStatus });
      }
    }

    // Build a pseudo-cart snapshot for order creation
    const product = negotiation.productId;
    if (!product) return res.status(400).json({ success:false, message:'Product data missing' });

    // Prevent vendor purchasing own product
    if (negotiation.buyerRole === 'vendor' && product.vendorUid === negotiation.buyerUid) {
      return res.status(400).json({ success:false, message:'Vendors cannot purchase their own products' });
    }

    // Fetch address (required)
    let addressDoc = null;
    if (addressId) {
      addressDoc = await Address.findById(addressId);
    } else {
      addressDoc = await Address.findOne({ uid: negotiation.buyerUid, isDefault: true });
    }
    if (!addressDoc) {
      return res.status(400).json({ success:false, message:'Delivery address required' });
    }

    // Basic address ownership check
    if (addressDoc.uid !== negotiation.buyerUid) {
      return res.status(403).json({ success:false, message:'Address does not belong to buyer' });
    }

    // Determine delivery method & fee (default negotiated)
    let deliveryMethod = providedDeliveryMethod || 'negotiated';
    let deliveryFee = 0;

    try {
      const quantity = negotiation.finalQuantity || (negotiation.offers?.length ? negotiation.offers[negotiation.offers.length - 1].quantity : negotiation.quantity) || 1;
      const product = negotiation.productId;
      const cartItems = [{ name: product.name, unitType: product.unitType || 'pcs', quantity, product: { unitType: product.unitType } }];
      const totalWeight = deliveryCalculator.calculateTotalWeight(cartItems);
      if (!deliveryCalculator.isDeliveryMethodAvailable(deliveryMethod, cartItems, totalWeight)) {
        // Fallback to recommended if invalid
        deliveryMethod = deliveryCalculator.getRecommendedDeliveryMethod(cartItems, totalWeight);
      }
      deliveryFee = deliveryCalculator.calculateDeliveryFee(deliveryMethod, cartItems, totalWeight, negotiatedFee || 0);
    } catch (calcErr) {
      console.warn('Delivery fee calculation failed, defaulting to 0:', calcErr.message);
      deliveryMethod = 'negotiated';
      deliveryFee = 0;
    }

    const subtotal = negotiation.finalPrice * negotiation.finalQuantity;
    const total = subtotal + deliveryFee;

    const vendorDoc = negotiation.seller; // already populated vendor

  const pseudoCart = {
      user: negotiation.buyerRole === 'vendor' ? negotiation.buyer._id : negotiation.buyer._id,
      vendor: vendorDoc._id,
      uid: negotiation.buyerUid,
      role: negotiation.buyerRole,
      items: [{
        product: product._id,
        productId: product._id.toString(),
        name: product.name,
        price: negotiation.finalPrice,
        offerPrice: undefined,
        unitPrice: product.unitPrice,
        quantity: negotiation.finalQuantity,
        unitType: product.unitType || 'unit',
        images: product.images || [],
        category: product.category,
        productSnapshot: {
          name: product.name,
          images: product.images,
          unitPrice: product.unitPrice,
          offerPrice: product.offerPrice,
          unitType: product.unitType,
          vendorUid: product.vendorUid
        }
      }],
      subtotal,
      tax: 0,
      deliveryFee,
      discount: 0,
      total,
  // Pass string id so createFromCart will populate snapshot
  deliveryAddress: addressDoc._id.toString(),
      deliveryMethod,
      estimatedDelivery: null,
      totalWeight: 0,
  deliveryNotes: deliveryNotes || notes || '',
    };

    // Minimal security info (reuse existing structure)
    const securityInfo = {
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      deviceFingerprint: deviceFingerprint || undefined
    };

    // Create order (stock decrement etc.)
    const { order } = await Order.createFromCart(pseudoCart, paymentMethod, securityInfo, notes, specialInstructions);
    order.negotiation = negotiation._id;
    // Fill negotiated metadata for admin visibility
    order.negotiated = {
      isNegotiated: true,
      negotiationId: negotiation._id,
      finalPrice: negotiation.finalPrice || negotiation.currentPrice || pseudoCart.items[0].price,
      finalQuantity: negotiation.finalQuantity || pseudoCart.items[0].quantity,
      agreedSubtotal: subtotal,
      agreedAt: new Date(),
      participants: { buyerUid: negotiation.buyerUid, sellerUid: negotiation.sellerUid }
    };
    // Compute negotiation discount percentage if original price available
    if (negotiation.originalPrice && (negotiation.finalPrice || negotiation.currentPrice)) {
      const orig = Number(negotiation.originalPrice);
      const fin = Number(negotiation.finalPrice || negotiation.currentPrice);
      if (orig > 0 && fin >= 0) {
        order.negotiated.deltaPct = ((orig - fin) / orig) * 100;
      }
    }
    await order.save();

    // If COD simply respond success
    const onlinePaymentMethods = ['card','mobile-banking','bank-transfer'];
    if (paymentMethod === 'cod') {
      return res.json({ success:true, message:'Order placed with COD', orderNumber: order.orderNumber, orderId: order._id });
    }

    // Create payment record and initialize SSLCommerz session
    const tranId = Payment.generateTransactionId(order.orderNumber);

    // Address documents currently don't store email; use buyer account email
    const customerEmail = buyerDoc.email; 
    if (!customerEmail) {
      // Roll back order if email missing for online payment
      await order.restoreStock();
      await Order.deleteOne({ _id: order._id });
      return res.status(400).json({ success:false, message:'Buyer email required before initiating online payment. Please update profile.' });
    }

    const payment = new Payment({
      tran_id: tranId,
      order_id: order._id,
      orderNumber: order.orderNumber,
      amount: order.total,
      cus_name: addressDoc.name,
      cus_email: customerEmail,
      cus_phone: addressDoc.phone,
      cus_add1: addressDoc.addressLine1,
      cus_city: addressDoc.city,
      status: 'PENDING'
    });
    await payment.save();

    const data = {
      total_amount: order.total,
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/payment/success`,
      fail_url: `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/payment/fail`,
      cancel_url: `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/payment/cancel`,
      ipn_url: `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/payment/ipn`,
      cus_name: addressDoc.name,
      cus_email: customerEmail,
      cus_add1: addressDoc.addressLine1,
      cus_city: addressDoc.city,
      cus_state: addressDoc.state || 'Dhaka',
      cus_postcode: addressDoc.zip || '1000',
      cus_country: 'Bangladesh',
      cus_phone: addressDoc.phone,
      shipping_method: 'YES',
      ship_name: addressDoc.name,
      ship_add1: addressDoc.addressLine1,
      ship_city: addressDoc.city,
      ship_state: addressDoc.state || 'Dhaka',
      ship_postcode: addressDoc.zip || '1000',
      ship_country: 'Bangladesh',
      product_name: `Negotiated Order ${order.orderNumber}`,
      product_category: 'Negotiated',
      product_profile: 'general',
      value_a: JSON.stringify([order.orderNumber]),
      value_b: negotiation.buyerUid,
      value_c: paymentMethod,
      value_d: negotiation._id.toString()
    };

    const sslczResponse = await sslcz.init(data);
    if (sslczResponse.status === 'SUCCESS') {
      return res.json({ success:true, gateway_url: sslczResponse.GatewayPageURL, redirect_url: sslczResponse.redirectGatewayURL, tranId, orderNumber: order.orderNumber });
    } else {
      // rollback order & restore stock
      await order.restoreStock();
      await Order.deleteOne({ _id: order._id });
      await Payment.deleteOne({ _id: payment._id });
      return res.status(500).json({ success:false, message:'Failed to init payment session' });
    }
  } catch (e) {
    console.error('Negotiation checkout error:', e);
    return res.status(500).json({ success:false, message:e.message || 'Checkout failed' });
  }
});

