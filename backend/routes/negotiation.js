const express = require('express');
const Negotiation = require('../models/Negotiation');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
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

    // Send negotiation message to conversation if conversation exists
    if (conversationId) {
      try {
        const negotiationMessage = new Message({
          conversation: conversationId,
          content: `💰 New price negotiation started for ${product.name}`,
          senderUid: buyerUid,
          senderRole: buyerRole,
          senderName: buyerRole === 'vendor' ? buyer.businessName : buyer.name,
          messageType: 'negotiation',
          negotiationContext: {
            negotiationId: negotiation._id,
            productName: product.name,
            productImage: product.images?.[0],
            proposedPrice: proposedPrice,
            originalPrice: originalPrice,
            quantity: quantity,
            totalAmount: proposedPrice * quantity
          },
          readBy: [{
            user: buyer._id,
            userModel: buyerRole === 'vendor' ? 'Vendor' : 'User',
            timestamp: new Date()
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

    let query = { isActive: true };

    // Build query based on role
    if (role === 'vendor') {
      // Vendor can be both buyer and seller
      query.$or = [
        { buyerUid: uid },
        { sellerUid: uid }
      ];
    } else {
      // Client can only be buyer
      query.buyerUid = uid;
    }

    // Filter by status if specified
    if (status !== 'all') {
      if (status === 'active') {
        query.status = 'active';
        query.expiresAt = { $gt: new Date() };
      } else {
        query.status = status;
      }
    }

    const negotiations = await Negotiation.find(query)
      .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType description')
      .populate('buyer', 'name email businessName')
      .populate('seller', 'businessName email storeId')
      .sort({ createdAt: -1 });

    res.json({ negotiations });

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

    // Send counter offer message to conversation
    if (negotiation.conversationId) {
      try {
        const UserModel = fromRole === 'vendor' ? Vendor : User;
        const user = await UserModel.findOne({ uid: fromUid });
        const userName = fromRole === 'vendor' ? user.businessName : user.name;

        const counterOfferMessage = new Message({
          conversation: negotiation.conversationId,
          content: `💰 Counter offer: ৳${price} × ${quantity} = ৳${price * quantity}`,
          senderUid: fromUid,
          senderRole: fromRole,
          senderName: userName,
          messageType: 'negotiation',
          negotiationContext: {
            negotiationId: negotiation._id,
            productName: negotiation.productName,
            productImage: negotiation.productImage,
            proposedPrice: price,
            originalPrice: negotiation.originalPrice,
            quantity: quantity,
            totalAmount: price * quantity,
            message: message
          },
          readBy: [{
            user: user._id,
            userModel: fromRole === 'vendor' ? 'Vendor' : 'User',
            timestamp: new Date()
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
          senderUid: uid,
          senderRole: acceptorRole,
          senderName: acceptorName,
          messageType: 'negotiation',
          negotiationContext: {
            negotiationId: negotiation._id,
            productName: negotiation.productName,
            productImage: negotiation.productImage,
            finalPrice: negotiation.finalPrice,
            originalPrice: negotiation.originalPrice,
            quantity: negotiation.finalQuantity,
            totalAmount: negotiation.finalTotalAmount,
            status: 'accepted'
          },
          readBy: [{
            user: acceptor._id,
            userModel: acceptorRole === 'vendor' ? 'Vendor' : 'User',
            timestamp: new Date()
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
          senderUid: uid,
          senderRole: rejectorRole,
          senderName: rejectorName,
          messageType: 'negotiation',
          negotiationContext: {
            negotiationId: negotiation._id,
            productName: negotiation.productName,
            productImage: negotiation.productImage,
            status: 'rejected'
          },
          readBy: [{
            user: rejector._id,
            userModel: rejectorRole === 'vendor' ? 'Vendor' : 'User',
            timestamp: new Date()
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
