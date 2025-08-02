const mongoose = require('mongoose');
const emailService = require('../services/emailService');

const notificationSchema = new mongoose.Schema({
  // Recipient information
  recipientUid: {
    type: String,
    required: true,
    index: true
  },
  recipientRole: {
    type: String,
    enum: ['client', 'vendor'],
    required: true
  },
  
  // Sender information (optional)
  senderUid: {
    type: String
  },
  senderRole: {
    type: String,
    enum: ['client', 'vendor']
  },
  senderName: {
    type: String
  },
  
  // Notification content
  type: {
    type: String,
    enum: ['negotiation', 'barter', 'order', 'payment', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxLength: 100
  },
  message: {
    type: String,
    required: true,
    maxLength: 500
  },
  
  // Status
  read: {
    type: Boolean,
    default: false
  },
  
  // Related data
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    // Can reference different models based on type
  },
  relatedType: {
    type: String,
    enum: ['Negotiation', 'Barter', 'Order', 'Payment']
  },
  
  // Action URL for frontend navigation
  actionUrl: {
    type: String
  },
  
  // Priority and metadata
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Auto-expire notifications after 30 days
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipientUid: 1, createdAt: -1 });
notificationSchema.index({ recipientUid: 1, read: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Virtual for formatted time
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInMinutes = Math.floor((now - this.createdAt) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
});

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    console.log('📧 Creating notification:', data.title, 'for:', data.recipientUid);
    const notification = new this(data);
    await notification.save();
    console.log('💾 Notification saved to database');
    
    // Emit to WebSocket if available
    if (global.notificationWS && global.notificationWS.has(data.recipientUid)) {
      const ws = global.notificationWS.get(data.recipientUid);
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(notification));
        console.log('🔗 Notification sent via WebSocket');
      } else {
        console.log('❌ WebSocket not ready for user:', data.recipientUid);
      }
    } else {
      console.log('❌ No WebSocket connection for user:', data.recipientUid);
    }
    
    // Send email notification if enabled
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
      try {
        console.log('📧 Sending email notification...');
        await emailService.sendNotificationEmail(notification);
        console.log('✅ Email notification sent successfully');
      } catch (emailError) {
        console.error('❌ Error sending notification email:', emailError);
        // Don't fail notification creation if email fails
      }
    } else {
      console.log('📧 Email notifications disabled');
    }
    
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// Static method to create negotiation notifications
notificationSchema.statics.createNegotiationNotification = async function(type, negotiation, senderUid, additionalData = {}) {
  console.log('🔔 Creating negotiation notification:', type, 'for negotiation:', negotiation._id);
  const notifications = [];
  
  // Determine recipient (opposite of sender)
  const recipientUid = senderUid === negotiation.buyerUid ? negotiation.sellerUid : negotiation.buyerUid;
  const recipientRole = senderUid === negotiation.buyerUid ? negotiation.sellerRole : negotiation.buyerRole;
  
  const senderRole = senderUid === negotiation.buyerUid ? negotiation.buyerRole : negotiation.sellerRole;
  const senderName = senderUid === negotiation.buyerUid 
    ? (negotiation.buyer?.businessName || negotiation.buyer?.name)
    : negotiation.seller?.businessName;

  console.log('📤 Notification details:', {
    type,
    senderUid,
    recipientUid,
    senderName,
    productName: negotiation.productName
  });

  let title, message;

  switch (type) {
    case 'new_negotiation':
      title = 'New Negotiation Request';
      message = `${senderName} wants to negotiate on ${negotiation.productName}`;
      break;
    case 'counter_offer':
      title = 'New Counter Offer';
      message = `${senderName} made a counter offer of ৳${additionalData.price} for ${negotiation.productName}`;
      break;
    case 'offer_accepted':
      title = 'Offer Accepted! 🎉';
      message = `Your offer for ${negotiation.productName} has been accepted`;
      break;
    case 'offer_rejected':
      title = 'Offer Rejected';
      message = `Your offer for ${negotiation.productName} was rejected`;
      break;
    case 'negotiation_expired':
      title = 'Negotiation Expired';
      message = `Negotiation for ${negotiation.productName} has expired`;
      break;
    case 'negotiation_cancelled':
      title = 'Negotiation Cancelled';
      message = `Negotiation for ${negotiation.productName} was cancelled`;
      break;
    default:
      return notifications;
  }

  // Create notification for recipient
  const notification = await this.createNotification({
    recipientUid,
    recipientRole,
    senderUid,
    senderRole,
    senderName,
    type: 'negotiation',
    title,
    message,
    relatedId: negotiation._id,
    relatedType: 'Negotiation',
    actionUrl: `/negotiations?id=${negotiation._id}`,
    priority: type === 'offer_accepted' ? 'high' : 'medium'
  });

  notifications.push(notification);

  // For bilateral notifications (like expiry), notify both parties
  if (['negotiation_expired', 'negotiation_cancelled'].includes(type)) {
    const otherParticipantUid = recipientUid === negotiation.buyerUid ? negotiation.sellerUid : negotiation.buyerUid;
    const otherParticipantRole = recipientUid === negotiation.buyerUid ? negotiation.sellerRole : negotiation.buyerRole;
    
    const otherNotification = await this.createNotification({
      recipientUid: otherParticipantUid,
      recipientRole: otherParticipantRole,
      type: 'negotiation',
      title,
      message,
      relatedId: negotiation._id,
      relatedType: 'Negotiation',
      actionUrl: `/negotiations?id=${negotiation._id}`,
      priority: 'medium'
    });

    notifications.push(otherNotification);
  }

  return notifications;
};

// Static method to create barter notifications
notificationSchema.statics.createBarterNotification = async function(type, barter, senderUid, additionalData = {}) {
  console.log('🔄 Creating barter notification:', type, 'for barter:', barter._id);
  console.log('🔍 Barter data inspection:', {
    proposingVendorUid: barter.proposingVendorUid,
    targetVendorUid: barter.targetVendorUid,
    proposingVendor: barter.proposingVendor,
    targetVendor: barter.targetVendor,
    targetProduct: barter.targetProduct
  });
  
  const notifications = [];
  
  // Determine recipient (opposite of sender)
  const recipientUid = senderUid === barter.proposingVendorUid ? barter.targetVendorUid : barter.proposingVendorUid;
  const recipientRole = 'vendor'; // Both participants are vendors in barter
  
  const senderRole = 'vendor';
  const senderName = senderUid === barter.proposingVendorUid 
    ? (barter.proposingVendor?.businessName || 'A vendor')
    : (barter.targetVendor?.businessName || 'A vendor');

  const targetProductName = barter.targetProduct?.name || 'a product';

  console.log('📤 Barter notification details:', {
    type,
    senderUid,
    recipientUid,
    senderName,
    targetProduct: targetProductName
  });

  let title, message;

  switch (type) {
    case 'new_barter_offer':
      title = 'New Barter Offer Received';
      message = `${senderName} wants to barter for your ${targetProductName}`;
      break;
    case 'barter_accepted':
      title = 'Barter Offer Accepted! 🎉';
      message = `Your barter offer for ${targetProductName} has been accepted`;
      break;
    case 'barter_rejected':
      title = 'Barter Offer Rejected';
      message = `Your barter offer for ${targetProductName} was rejected`;
      break;
    case 'barter_counter_offer':
      title = 'New Counter Offer';
      message = `${senderName} made a counter offer for your ${targetProductName}`;
      break;
    case 'barter_expired':
      title = 'Barter Offer Expired';
      message = `Barter offer for ${targetProductName} has expired`;
      break;
    case 'barter_cancelled':
      title = 'Barter Offer Cancelled';
      message = `Barter offer for ${targetProductName} was cancelled`;
      break;
    default:
      return notifications;
  }

  // Create notification for recipient
  const notification = await this.createNotification({
    recipientUid,
    recipientRole,
    senderUid,
    senderRole,
    senderName,
    type: 'barter',
    title,
    message,
    relatedId: barter._id,
    relatedType: 'Barter',
    actionUrl: `/barter-management?id=${barter._id}`,
    priority: type === 'barter_accepted' ? 'high' : 'medium'
  });

  notifications.push(notification);

  // For bilateral notifications (like expiry), notify both parties
  if (['barter_expired', 'barter_cancelled'].includes(type)) {
    const otherParticipantUid = recipientUid === barter.proposingVendorUid ? barter.targetVendorUid : barter.proposingVendorUid;
    
    const otherNotification = await this.createNotification({
      recipientUid: otherParticipantUid,
      recipientRole: 'vendor',
      type: 'barter',
      title,
      message,
      relatedId: barter._id,
      relatedType: 'Barter',
      actionUrl: `/barter-management?id=${barter._id}`,
      priority: 'medium'
    });

    notifications.push(otherNotification);
  }

  return notifications;
};

module.exports = mongoose.model('Notification', notificationSchema);
