const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Core message content
  content: { type: String, required: true },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'system', 'negotiation'], 
    default: 'text' 
  },
  
  // Sender information
  sender: { type: mongoose.Schema.Types.ObjectId, refPath: 'senderModel', required: true },
  senderModel: { type: String, enum: ['User', 'Vendor'], required: true },
  senderUid: { type: String, required: true }, // Firebase UID for quick lookup
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['client', 'vendor'], required: true },
  
  // Conversation reference
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  
  // Message metadata
  isRead: { type: Boolean, default: false },
  isDelivered: { type: Boolean, default: true }, // Set to true when message is saved
  deliveredAt: { type: Date, default: Date.now },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, refPath: 'readBy.userModel' },
    userModel: { type: String, enum: ['User', 'Vendor'] },
    readAt: { type: Date, default: Date.now }
  }],
  
  // File/Media attachments
  attachments: [{
    type: { type: String, enum: ['image', 'document', 'video'] },
    url: { type: String },
    filename: { type: String },
    size: { type: Number },
    mimeType: { type: String }
  }],
  
  // Negotiation specific data (if messageType is 'negotiation')
  negotiationData: {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    originalPrice: { type: Number },
    proposedPrice: { type: Number },
    quantity: { type: Number },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'counter'], default: 'pending' },
    expiresAt: { type: Date }
  },
  
  // Product context for messages (when discussing specific products)
  productContext: {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    productImage: { type: String },
    productPrice: { type: Number },
    vendorStoreId: { type: String }
  },
  
  // Reply functionality
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  
  // System fields
  isDeleted: { type: Boolean, default: false },
  editedAt: { type: Date },
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, senderModel: 1 });
messageSchema.index({ senderUid: 1 });
messageSchema.index({ isRead: 1, conversation: 1 });
messageSchema.index({ messageType: 1 });

// Virtual for sender info
messageSchema.virtual('senderInfo', {
  refPath: 'senderModel',
  localField: 'sender',
  foreignField: '_id',
  justOne: true
});

// Method to mark message as read by a user
messageSchema.methods.markAsRead = function(userId, userModel) {
  // Check if already read by this user
  const alreadyRead = this.readBy.some(read => 
    read.user.toString() === userId.toString() && read.userModel === userModel
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      userModel: userModel,
      readAt: new Date()
    });
  }
  
  // Update global read status if all participants have read
  this.isRead = true; // Simplified for now
  
  return this.save();
};

// Method to check if message is read by specific user
messageSchema.methods.isReadBy = function(userId, userModel) {
  return this.readBy.some(read => 
    read.user.toString() === userId.toString() && read.userModel === userModel
  );
};

module.exports = mongoose.model('Message', messageSchema);
