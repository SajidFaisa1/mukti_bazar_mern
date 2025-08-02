const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Conversation type
  type: { 
    type: String, 
    enum: ['user_vendor', 'vendor_vendor', 'group'], 
    required: true 
  },
  
  // Participants
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, refPath: 'participants.userModel', required: true },
    userModel: { type: String, enum: ['User', 'Vendor'], required: true },
    uid: { type: String, required: true }, // Firebase UID
    name: { type: String, required: true },
    role: { type: String, enum: ['client', 'vendor'], required: true },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    // Permissions for group chats
    isAdmin: { type: Boolean, default: false },
    canAddMembers: { type: Boolean, default: false }
  }],
  
  // Conversation metadata
  title: { type: String }, // For group chats or custom titles
  description: { type: String }, // For group chats
  avatar: { type: String }, // Group avatar URL
  
  // Last message info for quick display
  lastMessage: {
    content: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, refPath: 'lastMessage.senderModel' },
    senderModel: { type: String, enum: ['User', 'Vendor'] },
    senderName: { type: String },
    messageType: { type: String, enum: ['text', 'image', 'file', 'system', 'negotiation'] },
    timestamp: { type: Date }
  },
  
  // Message count and unread tracking
  messageCount: { type: Number, default: 0 },
  unreadCount: [{
    user: { type: mongoose.Schema.Types.ObjectId, refPath: 'unreadCount.userModel' },
    userModel: { type: String, enum: ['User', 'Vendor'] },
    count: { type: Number, default: 0 }
  }],
  
  // Product context removed - we now store product context at message level only
  // This allows one conversation per user pair regardless of products discussed
  // productContext: {
  //   product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  //   productName: { type: String },
  //   productImage: { type: String },
  //   vendorStoreId: { type: String }
  // },
  
  // Group-specific settings
  groupSettings: {
    isPrivate: { type: Boolean, default: false },
    allowMemberInvites: { type: Boolean, default: true },
    maxMembers: { type: Number, default: 50 },
    category: { type: String }, // e.g., 'regional', 'category-based', 'business'
    tags: [{ type: String }]
  },
  
  // Conversation status
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  archivedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, refPath: 'archivedBy.userModel' },
    userModel: { type: String, enum: ['User', 'Vendor'] },
    archivedAt: { type: Date, default: Date.now }
  }],
  
  // System fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel' },
  createdByModel: { type: String, enum: ['User', 'Vendor'] },
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
conversationSchema.index({ 'participants.uid': 1 });
conversationSchema.index({ 'participants.user': 1, 'participants.userModel': 1 });
conversationSchema.index({ type: 1, isActive: 1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });
// conversationSchema.index({ 'productContext.product': 1 }); // Removed since we don't use productContext at conversation level
conversationSchema.index({ createdAt: -1 });

// Virtual for active participants count
conversationSchema.virtual('activeParticipantsCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Method to add participant
conversationSchema.methods.addParticipant = function(userInfo) {
  const { userId, userModel, uid, name, role, isAdmin = false } = userInfo;
  
  // Check if user is already a participant
  const existingParticipant = this.participants.find(p => 
    p.user.toString() === userId.toString() && p.userModel === userModel
  );
  
  if (existingParticipant) {
    existingParticipant.isActive = true;
    existingParticipant.joinedAt = new Date();
  } else {
    this.participants.push({
      user: userId,
      userModel: userModel,
      uid: uid,
      name: name,
      role: role,
      isAdmin: isAdmin,
      canAddMembers: isAdmin || this.groupSettings.allowMemberInvites
    });
  }
  
  return this.save();
};

// Method to remove participant
conversationSchema.methods.removeParticipant = function(userId, userModel) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString() && p.userModel === userModel
  );
  
  if (participant) {
    participant.isActive = false;
  }
  
  return this.save();
};

// Method to update last message
conversationSchema.methods.updateLastMessage = function(message) {
  this.lastMessage = {
    content: message.content,
    sender: message.sender,
    senderModel: message.senderModel,
    senderName: message.senderName,
    messageType: message.messageType,
    timestamp: message.createdAt || new Date()
  };
  
  this.messageCount += 1;
  
  // Update unread count for all participants except sender
  this.participants.forEach(participant => {
    if (participant.user.toString() !== message.sender.toString() || 
        participant.userModel !== message.senderModel) {
      
      let unreadEntry = this.unreadCount.find(u => 
        u.user.toString() === participant.user.toString() && 
        u.userModel === participant.userModel
      );
      
      if (!unreadEntry) {
        this.unreadCount.push({
          user: participant.user,
          userModel: participant.userModel,
          count: 1
        });
      } else {
        unreadEntry.count += 1;
      }
    }
  });
  
  return this.save();
};

// Method to mark messages as read for a user
conversationSchema.methods.markAsRead = function(userId, userModel) {
  const unreadEntry = this.unreadCount.find(u => 
    u.user.toString() === userId.toString() && u.userModel === userModel
  );
  
  if (unreadEntry) {
    unreadEntry.count = 0;
  }
  
  return this.save();
};

// Method to get unread count for a user
conversationSchema.methods.getUnreadCount = function(userId, userModel) {
  const unreadEntry = this.unreadCount.find(u => 
    u.user.toString() === userId.toString() && u.userModel === userModel
  );
  
  return unreadEntry ? unreadEntry.count : 0;
};

// Static method to find or create conversation between two users
conversationSchema.statics.findOrCreateConversation = async function(participant1, participant2, productContext = null) {
  // For user-vendor conversations, check if conversation already exists between these two users
  const existingConversation = await this.findOne({
    type: 'user_vendor',
    'participants.user': { $all: [participant1.userId, participant2.userId] },
    'participants.userModel': { $all: [participant1.userModel, participant2.userModel] }
  });
  
  if (existingConversation) {
    return existingConversation;
  }
  
  // Create new conversation
  const conversationData = {
    type: 'user_vendor',
    participants: [
      {
        user: participant1.userId,
        userModel: participant1.userModel,
        uid: participant1.uid,
        name: participant1.name,
        role: participant1.role
      },
      {
        user: participant2.userId,
        userModel: participant2.userModel,
        uid: participant2.uid,
        name: participant2.name,
        role: participant2.role
      }
    ],
    createdBy: participant1.userId,
    createdByModel: participant1.userModel
  };
  
  // Note: We don't store productContext at conversation level anymore
  // Product context will be stored at message level for individual messages
  
  const conversation = new this(conversationData);
  return await conversation.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
