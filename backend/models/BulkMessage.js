const mongoose = require('mongoose');

const bulkMessageSchema = new mongoose.Schema({
  // Basic message info
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  messageType: {
    type: String,
    enum: ['announcement', 'promotion', 'update', 'notification', 'reminder'],
    default: 'announcement'
  },
  
  // Media attachments
  attachments: [{
    type: { type: String, enum: ['image', 'document', 'link'] },
    url: { type: String, required: true },
    filename: { type: String },
    size: { type: Number },
    description: { type: String }
  }],
  
  // Sender info
  sender: {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    uid: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true }
  },
  
  // Target groups and recipients
  targeting: {
    // Group-based targeting
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
    
    // Individual targeting
    specificVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    
    // Filter-based targeting
    filters: {
      categories: [{ type: String }], // Product categories
      regions: [{
        city: { type: String },
        district: { type: String },
        state: { type: String }
      }],
      businessTypes: [{ type: String }],
      membershipTier: [{ type: String, enum: ['bronze', 'silver', 'gold', 'platinum'] }],
      joinDateRange: {
        from: { type: Date },
        to: { type: Date }
      },
      activityLevel: {
        type: String,
        enum: ['active', 'moderate', 'inactive', 'all'],
        default: 'all'
      }
    },
    
    // Exclusions
    excludeVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    excludeGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }]
  },
  
  // Scheduling and delivery
  scheduling: {
    sendNow: { type: Boolean, default: true },
    scheduledFor: { type: Date },
    timezone: { type: String, default: 'Asia/Dhaka' },
    repeatSchedule: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      endDate: { type: Date },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday, 6=Saturday
      dayOfMonth: { type: Number, min: 1, max: 31 }
    }
  },
  
  // Delivery tracking
  delivery: {
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'partially_failed', 'failed', 'cancelled'],
      default: 'draft'
    },
    
    // Recipient statistics
    totalRecipients: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    pendingDeliveries: { type: Number, default: 0 },
    
    // Detailed delivery records
    recipients: [{
      vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
      uid: { type: String },
      name: { type: String },
      deliveryMethod: { type: String, enum: ['websocket', 'email', 'sms'] },
      status: {
        type: String,
        enum: ['pending', 'delivered', 'failed', 'bounced'],
        default: 'pending'
      },
      deliveredAt: { type: Date },
      readAt: { type: Date },
      error: { type: String },
      retryCount: { type: Number, default: 0 }
    }],
    
    // Delivery attempts
    attempts: [{
      attemptedAt: { type: Date, default: Date.now },
      successful: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      error: { type: String }
    }],
    
    startedAt: { type: Date },
    completedAt: { type: Date }
  },
  
  // Message options
  options: {
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    // Delivery methods
    deliveryMethods: {
      websocket: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false }
    },
    
    // Message behavior
    allowReplies: { type: Boolean, default: false },
    requireAcknowledgment: { type: Boolean, default: false },
    autoArchive: { type: Boolean, default: false },
    archiveAfterDays: { type: Number, default: 30 },
    
    // Rate limiting
    maxRecipientsPerBatch: { type: Number, default: 100 },
    delayBetweenBatches: { type: Number, default: 1000 }, // milliseconds
    
    // Tracking
    trackReads: { type: Boolean, default: true },
    trackClicks: { type: Boolean, default: true }
  },
  
  // Analytics and engagement
  analytics: {
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    uniqueClicks: { type: Number, default: 0 },
    acknowledgments: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    
    engagementRate: { type: Number, default: 0 },
    deliveryRate: { type: Number, default: 0 },
    readRate: { type: Number, default: 0 },
    
    // Peak engagement times
    peakEngagementHour: { type: Number },
    engagementByHour: [{
      hour: { type: Number },
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 }
    }]
  },
  
  // Campaign info (if part of a campaign)
  campaign: {
    id: { type: String },
    name: { type: String },
    tags: [{ type: String }]
  },
  
  // Admin and moderation
  isApproved: { type: Boolean, default: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: { type: Date },
  
  // Archive and deletion
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bulkMessageSchema.index({ 'sender.vendor': 1, createdAt: -1 });
bulkMessageSchema.index({ 'targeting.groups': 1 });
bulkMessageSchema.index({ 'delivery.status': 1, 'scheduling.scheduledFor': 1 });
bulkMessageSchema.index({ 'campaign.id': 1 });
bulkMessageSchema.index({ isArchived: 1, createdAt: -1 });

// Virtual for delivery success rate
bulkMessageSchema.virtual('deliverySuccessRate').get(function() {
  if (this.delivery.totalRecipients === 0) return 0;
  return (this.delivery.successfulDeliveries / this.delivery.totalRecipients) * 100;
});

// Virtual for engagement rate calculation
bulkMessageSchema.virtual('calculatedEngagementRate').get(function() {
  if (this.delivery.successfulDeliveries === 0) return 0;
  const engagements = this.analytics.uniqueViews + this.analytics.uniqueClicks + this.analytics.acknowledgments;
  return (engagements / this.delivery.successfulDeliveries) * 100;
});

// Method to add recipient
bulkMessageSchema.methods.addRecipient = function(vendorInfo, deliveryMethod = 'websocket') {
  const existingRecipient = this.delivery.recipients.find(r => 
    r.vendor.toString() === vendorInfo.vendorId.toString()
  );
  
  if (!existingRecipient) {
    this.delivery.recipients.push({
      vendor: vendorInfo.vendorId,
      uid: vendorInfo.uid,
      name: vendorInfo.name,
      deliveryMethod: deliveryMethod,
      status: 'pending'
    });
    
    this.delivery.totalRecipients = this.delivery.recipients.length;
    this.delivery.pendingDeliveries += 1;
  }
  
  return this.save();
};

// Method to mark recipient as delivered
bulkMessageSchema.methods.markDelivered = function(vendorId, success = true, error = null) {
  const recipient = this.delivery.recipients.find(r => 
    r.vendor.toString() === vendorId.toString()
  );
  
  if (recipient && recipient.status === 'pending') {
    recipient.status = success ? 'delivered' : 'failed';
    recipient.deliveredAt = new Date();
    
    if (error) {
      recipient.error = error;
    }
    
    if (success) {
      this.delivery.successfulDeliveries += 1;
    } else {
      this.delivery.failedDeliveries += 1;
    }
    
    this.delivery.pendingDeliveries -= 1;
    
    // Update delivery rate
    this.analytics.deliveryRate = (this.delivery.successfulDeliveries / this.delivery.totalRecipients) * 100;
  }
  
  return this.save();
};

// Method to track read
bulkMessageSchema.methods.trackRead = function(vendorId) {
  const recipient = this.delivery.recipients.find(r => 
    r.vendor.toString() === vendorId.toString()
  );
  
  if (recipient && !recipient.readAt) {
    recipient.readAt = new Date();
    this.analytics.totalViews += 1;
    this.analytics.uniqueViews += 1;
    
    // Update read rate
    this.analytics.readRate = (this.analytics.uniqueViews / this.delivery.successfulDeliveries) * 100;
    
    // Track engagement by hour
    const hour = new Date().getHours();
    let hourData = this.analytics.engagementByHour.find(h => h.hour === hour);
    if (!hourData) {
      hourData = { hour: hour, views: 0, clicks: 0 };
      this.analytics.engagementByHour.push(hourData);
    }
    hourData.views += 1;
  }
  
  return this.save();
};

// Method to track click
bulkMessageSchema.methods.trackClick = function(vendorId) {
  this.analytics.totalClicks += 1;
  
  const recipient = this.delivery.recipients.find(r => 
    r.vendor.toString() === vendorId.toString()
  );
  
  if (recipient) {
    this.analytics.uniqueClicks += 1;
    
    // Track engagement by hour
    const hour = new Date().getHours();
    let hourData = this.analytics.engagementByHour.find(h => h.hour === hour);
    if (!hourData) {
      hourData = { hour: hour, views: 0, clicks: 0 };
      this.analytics.engagementByHour.push(hourData);
    }
    hourData.clicks += 1;
  }
  
  // Update engagement rate
  this.analytics.engagementRate = this.calculatedEngagementRate;
  
  return this.save();
};

// Method to check if user can manage this message
bulkMessageSchema.methods.canManage = function(vendorId, userRole) {
  return this.sender.vendor.toString() === vendorId.toString() || 
         userRole === 'admin' || 
         userRole === 'moderator';
};

// Static method to get scheduled messages
bulkMessageSchema.statics.getScheduledMessages = function() {
  return this.find({
    'delivery.status': 'scheduled',
    'scheduling.scheduledFor': { $lte: new Date() }
  }).populate('sender.vendor targeting.groups');
};

// Static method to get messages by sender
bulkMessageSchema.statics.getBySender = function(vendorId, options = {}) {
  const query = { 'sender.vendor': vendorId };
  
  if (options.status) query['delivery.status'] = options.status;
  if (options.messageType) query.messageType = options.messageType;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .populate('targeting.groups', 'name category stats.totalMembers');
};

// Static method to get analytics summary
bulkMessageSchema.statics.getAnalyticsSummary = function(vendorId, dateRange = {}) {
  const matchQuery = { 'sender.vendor': mongoose.Types.ObjectId(vendorId) };
  
  if (dateRange.from || dateRange.to) {
    matchQuery.createdAt = {};
    if (dateRange.from) matchQuery.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) matchQuery.createdAt.$lte = new Date(dateRange.to);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        totalRecipients: { $sum: '$delivery.totalRecipients' },
        totalDelivered: { $sum: '$delivery.successfulDeliveries' },
        totalViews: { $sum: '$analytics.uniqueViews' },
        totalClicks: { $sum: '$analytics.uniqueClicks' },
        avgEngagementRate: { $avg: '$analytics.engagementRate' },
        avgDeliveryRate: { $avg: '$analytics.deliveryRate' }
      }
    }
  ]);
};

module.exports = mongoose.model('BulkMessage', bulkMessageSchema);
