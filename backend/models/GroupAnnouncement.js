const mongoose = require('mongoose');

const groupAnnouncementSchema = new mongoose.Schema({
  // Basic announcement info
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  
  // Announcement type
  type: {
    type: String,
    enum: ['general', 'urgent', 'event', 'promotion', 'poll', 'update'],
    default: 'general'
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },
  
  // Media attachments
  attachments: [{
    type: { type: String, enum: ['image', 'document', 'link'] },
    url: { type: String, required: true },
    filename: { type: String },
    size: { type: Number },
    description: { type: String }
  }],
  
  // Group reference
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  
  // Creator info
  createdBy: {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    uid: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'moderator'], required: true }
  },
  
  // Targeting options
  targeting: {
    allMembers: { type: Boolean, default: true },
    specificRoles: [{ type: String, enum: ['admin', 'moderator', 'member'] }],
    specificMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    excludeMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }]
  },
  
  // Scheduling
  scheduledFor: { type: Date }, // If null, send immediately
  expiresAt: { type: Date },
  
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'expired', 'cancelled'],
    default: 'draft'
  },
  
  // Delivery tracking
  delivery: {
    totalRecipients: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    acknowledged: { type: Number, default: 0 },
    recipients: [{
      vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
      uid: { type: String },
      deliveredAt: { type: Date },
      readAt: { type: Date },
      acknowledgedAt: { type: Date },
      status: {
        type: String,
        enum: ['pending', 'delivered', 'read', 'acknowledged', 'failed'],
        default: 'pending'
      }
    }]
  },
  
  // Interaction options
  allowComments: { type: Boolean, default: true },
  allowReactions: { type: Boolean, default: true },
  requireAcknowledgment: { type: Boolean, default: false },
  
  // Poll data (if type is 'poll')
  poll: {
    question: { type: String },
    options: [{
      text: { type: String },
      votes: { type: Number, default: 0 },
      voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }]
    }],
    allowMultipleVotes: { type: Boolean, default: false },
    anonymousVoting: { type: Boolean, default: true },
    endsAt: { type: Date }
  },
  
  // Event data (if type is 'event')
  event: {
    eventDate: { type: Date },
    location: { type: String },
    meetingLink: { type: String },
    maxAttendees: { type: Number },
    attendees: [{
      vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
      uid: { type: String },
      confirmedAt: { type: Date },
      status: { type: String, enum: ['attending', 'maybe', 'not_attending'], default: 'attending' }
    }]
  },
  
  // Analytics
  analytics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }
  },
  
  // Pinned status
  isPinned: { type: Boolean, default: false },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  pinnedAt: { type: Date },
  
  // Archive status
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
groupAnnouncementSchema.index({ group: 1, createdAt: -1 });
groupAnnouncementSchema.index({ group: 1, isPinned: -1, createdAt: -1 });
groupAnnouncementSchema.index({ status: 1, scheduledFor: 1 });
groupAnnouncementSchema.index({ 'createdBy.vendor': 1 });
groupAnnouncementSchema.index({ group: 1, type: 1 });

// Virtual for engagement rate calculation
groupAnnouncementSchema.virtual('calculatedEngagementRate').get(function() {
  if (this.delivery.delivered === 0) return 0;
  const engagements = this.delivery.read + this.delivery.acknowledged + this.analytics.clicks;
  return (engagements / this.delivery.delivered) * 100;
});

// Method to check if user can edit announcement
groupAnnouncementSchema.methods.canEdit = function(vendorId, userRole) {
  return this.createdBy.vendor.toString() === vendorId.toString() || 
         userRole === 'admin';
};

// Method to add recipient
groupAnnouncementSchema.methods.addRecipient = function(vendorInfo) {
  const existingRecipient = this.delivery.recipients.find(r => 
    r.vendor.toString() === vendorInfo.vendorId.toString()
  );
  
  if (!existingRecipient) {
    this.delivery.recipients.push({
      vendor: vendorInfo.vendorId,
      uid: vendorInfo.uid,
      status: 'pending'
    });
    this.delivery.totalRecipients = this.delivery.recipients.length;
  }
  
  return this.save();
};

// Method to mark as delivered
groupAnnouncementSchema.methods.markDelivered = function(vendorId) {
  const recipient = this.delivery.recipients.find(r => 
    r.vendor.toString() === vendorId.toString()
  );
  
  if (recipient && recipient.status === 'pending') {
    recipient.status = 'delivered';
    recipient.deliveredAt = new Date();
    this.delivery.delivered += 1;
  }
  
  return this.save();
};

// Method to mark as read
groupAnnouncementSchema.methods.markRead = function(vendorId) {
  const recipient = this.delivery.recipients.find(r => 
    r.vendor.toString() === vendorId.toString()
  );
  
  if (recipient && (recipient.status === 'delivered' || recipient.status === 'pending')) {
    if (!recipient.readAt) {
      recipient.readAt = new Date();
      this.delivery.read += 1;
      this.analytics.views += 1;
    }
    recipient.status = 'read';
  }
  
  return this.save();
};

// Method to mark as acknowledged
groupAnnouncementSchema.methods.markAcknowledged = function(vendorId) {
  const recipient = this.delivery.recipients.find(r => 
    r.vendor.toString() === vendorId.toString()
  );
  
  if (recipient && recipient.status === 'read') {
    recipient.status = 'acknowledged';
    recipient.acknowledgedAt = new Date();
    this.delivery.acknowledged += 1;
  }
  
  return this.save();
};

// Method to vote on poll
groupAnnouncementSchema.methods.voteOnPoll = function(vendorId, optionIndex) {
  if (this.type !== 'poll' || !this.poll || !this.poll.options[optionIndex]) {
    throw new Error('Invalid poll or option');
  }
  
  const option = this.poll.options[optionIndex];
  const hasVoted = option.voters.includes(vendorId);
  
  if (!this.poll.allowMultipleVotes && hasVoted) {
    throw new Error('Already voted on this poll');
  }
  
  if (!hasVoted) {
    option.voters.push(vendorId);
    option.votes += 1;
  }
  
  return this.save();
};

// Method to RSVP to event
groupAnnouncementSchema.methods.rsvpToEvent = function(vendorId, uid, status = 'attending') {
  if (this.type !== 'event' || !this.event) {
    throw new Error('Not an event announcement');
  }
  
  const existingAttendee = this.event.attendees.find(a => 
    a.vendor.toString() === vendorId.toString()
  );
  
  if (existingAttendee) {
    existingAttendee.status = status;
    existingAttendee.confirmedAt = new Date();
  } else {
    this.event.attendees.push({
      vendor: vendorId,
      uid: uid,
      status: status,
      confirmedAt: new Date()
    });
  }
  
  return this.save();
};

// Static method to get pending scheduled announcements
groupAnnouncementSchema.statics.getPendingScheduled = function() {
  return this.find({
    status: 'scheduled',
    scheduledFor: { $lte: new Date() }
  }).populate('group createdBy.vendor');
};

// Static method to get announcements for group
groupAnnouncementSchema.statics.getForGroup = function(groupId, options = {}) {
  const query = { 
    group: groupId,
    isArchived: false
  };
  
  if (options.type) query.type = options.type;
  if (options.priority) query.priority = options.priority;
  
  return this.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .populate('createdBy.vendor', 'businessName storeId')
    .limit(options.limit || 50);
};

module.exports = mongoose.model('GroupAnnouncement', groupAnnouncementSchema);
