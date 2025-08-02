const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const router = express.Router();

// GET /api/messages/conversations - Get all conversations for a user
router.get('/conversations', async (req, res) => {
  try {
    const { uid, role } = req.query;
    
    if (!uid || !role) {
      return res.status(400).json({ error: 'uid and role are required' });
    }
    
    const userModel = role === 'vendor' ? 'Vendor' : 'User';
    
    const conversations = await Conversation.find({
      'participants.uid': uid,
      'participants.isActive': true,
      isActive: true
    })
    .populate('participants.user', 'name email businessName storeId')
    .sort({ 'lastMessage.timestamp': -1 })
    .lean();
    
    // Calculate unread count based on actual message read status
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        // Get the user's ObjectId for this conversation
        const participant = conv.participants.find(p => p.uid === uid);
        if (!participant) {
          return { ...conv, unreadCount: 0 };
        }
        
        // Count messages not read by this user
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          senderUid: { $ne: uid }, // Not sent by current user
          $or: [
            { readBy: { $not: { $elemMatch: { user: participant.user } } } }, // Not in readBy array
            { readBy: { $exists: false } }, // readBy field doesn't exist
            { readBy: { $size: 0 } } // readBy array is empty
          ]
        });
        
        return {
          ...conv,
          unreadCount: unreadCount
        };
      })
    );
    
    res.json(conversationsWithUnread);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/conversations/:conversationId - Get messages in a conversation
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.uid': uid,
      'participants.isActive': true
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false
    })
    .populate('replyTo', 'content senderName messageType')
    .populate('negotiationData.productId', 'name images price')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
    
    // Don't auto-mark as read when just fetching messages
    // This allows users to see unread status
    
    res.json({
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === parseInt(limit),
      conversation: conversation
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages/send - Send a new message
router.post('/send', async (req, res) => {
  try {
    const { 
      conversationId, 
      content, 
      senderUid, 
      senderRole,
      messageType = 'text',
      attachments = [],
      replyTo = null,
      negotiationData = null,
      productContext = null
    } = req.body;
    
    if (!conversationId || !content || !senderUid || !senderRole) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    
    // Get sender info
    const senderModel = senderRole === 'vendor' ? 'Vendor' : 'User';
    const SenderModel = senderRole === 'vendor' ? Vendor : User;
    const sender = await SenderModel.findOne({ uid: senderUid });
    
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }
    
    // Verify conversation exists and sender is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.uid': senderUid,
      'participants.isActive': true
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }
    
    // Create message
    const messageData = {
      content,
      messageType,
      sender: sender._id,
      senderModel,
      senderUid,
      senderName: sender.name || sender.businessName,
      senderRole,
      conversation: conversationId,
      attachments,
      replyTo,
      negotiationData,
      productContext
    };
    
    const message = new Message(messageData);
    await message.save();
    
    // Update conversation last message
    await conversation.updateLastMessage(message);
    
    // Populate message for response
    await message.populate('replyTo', 'content senderName messageType');
    if (negotiationData?.productId) {
      await message.populate('negotiationData.productId', 'name images price');
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/messages/conversations/create - Create a new conversation
router.post('/conversations/create', async (req, res) => {
  try {
    const { 
      participant1, // { uid, role }
      participant2, // { uid, role }
      productId = null,
      initialMessage = null
    } = req.body;
    
    if (!participant1 || !participant2) {
      return res.status(400).json({ error: 'Both participants are required' });
    }
    
    // Get participant details
    const getParticipantInfo = async (participantData) => {
      const { uid, role } = participantData;
      const Model = role === 'vendor' ? Vendor : User;
      const user = await Model.findOne({ uid });
      
      if (!user) {
        throw new Error(`${role} not found`);
      }
      
      return {
        userId: user._id,
        userModel: role === 'vendor' ? 'Vendor' : 'User',
        uid: user.uid,
        name: role === 'vendor' ? (user.businessName || user.name) : user.name,
        role: role
      };
    };
    
    const p1Info = await getParticipantInfo(participant1);
    const p2Info = await getParticipantInfo(participant2);
    
    // Get product context if provided
    let productContext = null;
    if (productId) {
      const product = await Product.findById(productId);
      if (product) {
        productContext = {
          product: product._id,
          productName: product.name,
          productImage: product.images?.[0] || null,
          vendorStoreId: product.storeId
        };
      }
    }
    
    // Find or create conversation (without product context - one conversation per user pair)
    const conversation = await Conversation.findOrCreateConversation(
      p1Info, 
      p2Info
    );
    
    // Send initial message if provided
    if (initialMessage) {
      const messageData = {
        content: initialMessage.content,
        messageType: initialMessage.messageType || 'text',
        sender: p1Info.userId,
        senderModel: p1Info.userModel,
        senderUid: p1Info.uid,
        senderName: p1Info.name,
        senderRole: p1Info.role,
        conversation: conversation._id,
        productContext: initialMessage.productContext || null
      };
      
      const message = new Message(messageData);
      await message.save();
      await conversation.updateLastMessage(message);
    }
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: error.message || 'Failed to create conversation' });
  }
});

// POST /api/messages/upload - Upload attachment for message
router.post('/upload', async (req, res) => {
  try {
    const { file, fileType, senderUid } = req.body;
    
    if (!file || !fileType || !senderUid) {
      return res.status(400).json({ error: 'File, fileType, and senderUid are required' });
    }
    
    // Upload to cloudinary
    const uploadOptions = {
      folder: `chat_attachments/${senderUid}`,
      resource_type: fileType === 'image' ? 'image' : 'raw'
    };
    
    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    const attachment = {
      type: fileType,
      url: result.secure_url,
      filename: result.original_filename || 'file',
      size: result.bytes,
      mimeType: result.format
    };
    
    res.json(attachment);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// PUT /api/messages/:messageId/read - Mark message as read
router.put('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { uid, role } = req.body;
    
    if (!uid || !role) {
      return res.status(400).json({ error: 'uid and role are required' });
    }
    
    const userModel = role === 'vendor' ? 'Vendor' : 'User';
    const UserModel = role === 'vendor' ? Vendor : User;
    const user = await UserModel.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    await message.markAsRead(user._id, userModel);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// DELETE /api/messages/:messageId - Delete a message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const message = await Message.findOne({
      _id: messageId,
      senderUid: uid
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }
    
    message.isDeleted = true;
    await message.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// GET /api/messages/search - Search messages
router.get('/search', async (req, res) => {
  try {
    const { uid, query, conversationId, messageType, limit = 20 } = req.query;
    
    if (!uid || !query) {
      return res.status(400).json({ error: 'uid and query are required' });
    }
    
    const searchQuery = {
      content: new RegExp(query, 'i'),
      isDeleted: false
    };
    
    if (conversationId) {
      searchQuery.conversation = conversationId;
    } else {
      // Only search in conversations where user is participant
      const userConversations = await Conversation.find({
        'participants.uid': uid,
        'participants.isActive': true
      }).select('_id');
      
      searchQuery.conversation = { $in: userConversations.map(c => c._id) };
    }
    
    if (messageType) {
      searchQuery.messageType = messageType;
    }
    
    const messages = await Message.find(searchQuery)
      .populate('conversation', 'type title participants')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(messages);
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// GET /api/messages/unread-count - Get total unread message count for user
router.get('/unread-count', async (req, res) => {
  try {
    const { uid, role } = req.query;
    
    if (!uid || !role) {
      return res.status(400).json({ error: 'uid and role are required' });
    }
    
    // Get the user's ObjectId from the UID
    const userModel = role === 'vendor' ? 'Vendor' : 'User';
    const UserModelClass = userModel === 'vendor' ? require('../models/Vendor') : require('../models/User');
    const user = await UserModelClass.findOne({ uid: uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // First get all conversations where the user is a participant
    const conversations = await Conversation.find({
      'participants.uid': uid,
      'participants.isActive': true,
      isActive: true
    }).select('_id').lean();
    
    const conversationIds = conversations.map(conv => conv._id);
    
    // Count all unread messages for this user in their conversations only
    const totalUnreadCount = await Message.countDocuments({
      conversation: { $in: conversationIds }, // Only from user's conversations
      senderUid: { $ne: uid }, // Not sent by current user
      $or: [
        { readBy: { $not: { $elemMatch: { user: user._id } } } }, // Not in readBy array
        { readBy: { $exists: false } }, // readBy field doesn't exist
        { readBy: { $size: 0 } } // readBy array is empty
      ]
    });
    
    res.json({ unreadCount: totalUnreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PUT /api/messages/conversations/:conversationId/mark-read - Mark conversation as read
router.put('/conversations/:conversationId/mark-read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { uid, role } = req.body;
    
    if (!uid || !role) {
      return res.status(400).json({ error: 'uid and role are required' });
    }
    
    const userModel = role === 'vendor' ? 'Vendor' : 'User';
    
    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.uid': uid,
      'participants.isActive': true
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }
    
    // Mark messages as read for current user
    const participant = conversation.participants.find(p => p.uid === uid);
    if (participant) {
      await conversation.markAsRead(participant.user, participant.userModel);
      
      // Also mark individual messages as read
      await Message.updateMany(
        { 
          conversation: conversationId,
          senderUid: { $ne: uid }, // Don't mark own messages as read
          'readBy.user': { $ne: participant.user } // Only update messages not already read by this user
        },
        {
          $push: {
            readBy: {
              user: participant.user,
              userModel: participant.userModel,
              readAt: new Date()
            }
          }
        }
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

module.exports = router;
