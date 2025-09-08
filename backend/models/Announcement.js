const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  // Basic announcement information
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  
  // Announcement type and categorization
  type: { 
    type: String, 
    enum: ['general', 'security', 'maintenance', 'policy', 'emergency', 'feature', 'system'],
    default: 'general',
    required: true
  },
  
  // Target audience for the announcement
  visibility: { 
    type: String, 
    enum: ['all', 'users', 'vendors', 'admins', 'public'],
    default: 'all',
    required: true
  },
  
  // Publication status and timing
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'published', 'archived'],
    default: 'draft',
    required: true
  },
  
  // Scheduling and expiration
  publishDate: { type: Date },
  publishedAt: { type: Date },
  expiresAt: { type: Date },
  
  // Priority level
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },
  
  // Creator information
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Engagement tracking
  views: { type: Number, default: 0 },
  reactions: {
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    helpful: { type: Number, default: 0 }
  },
  
  // Comments/feedback
  allowComments: { type: Boolean, default: true },
  
  // Notification settings
  sendNotification: { type: Boolean, default: true },
  notificationSent: { type: Boolean, default: false },
  notificationSentAt: { type: Date },
  
  // Media attachments
  attachments: [{
    type: { type: String, enum: ['image', 'document', 'video'] },
    url: { type: String },
    filename: { type: String },
    size: { type: Number },
    mimeType: { type: String }
  }],
  
  // Styling and display options
  featured: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#000000' },
  
  // Metadata
  tags: [{ type: String, trim: true }],
  language: { type: String, default: 'en' },
  
  // System fields
  isActive: { type: Boolean, default: true },
  archivedAt: { type: Date },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
announcementSchema.index({ status: 1, publishedAt: -1 });
announcementSchema.index({ visibility: 1, status: 1 });
announcementSchema.index({ type: 1, status: 1 });
announcementSchema.index({ createdBy: 1 });
announcementSchema.index({ publishDate: 1, status: 1 });
announcementSchema.index({ expiresAt: 1, status: 1 });
announcementSchema.index({ featured: 1, pinned: 1, publishedAt: -1 });

// Virtual for formatted publish date
announcementSchema.virtual('formattedPublishDate').get(function() {
  if (this.publishedAt) {
    return this.publishedAt.toLocaleDateString();
  }
  return null;
});

// Virtual for time since published
announcementSchema.virtual('timeSincePublished').get(function() {
  if (this.publishedAt) {
    const now = new Date();
    const diffTime = Math.abs(now - this.publishedAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
  return null;
});

// Virtual to check if announcement is expired
announcementSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Virtual to check if announcement should be published
announcementSchema.virtual('shouldBePublished').get(function() {
  return this.status === 'scheduled' && this.publishDate && new Date() >= this.publishDate;
});

// Method to publish the announcement
announcementSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

// Method to archive the announcement
announcementSchema.methods.archive = function(userId) {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archivedBy = userId;
  this.isActive = false;
  return this.save();
};

// Method to increment view count
announcementSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to add reaction
announcementSchema.methods.addReaction = function(reactionType) {
  if (this.reactions[reactionType] !== undefined) {
    this.reactions[reactionType] += 1;
    return this.save();
  }
  throw new Error('Invalid reaction type');
};

// Static method to get active announcements for a user type
announcementSchema.statics.getActiveForAudience = function(audience) {
  return this.find({
    status: 'published',
    isActive: true,
    $or: [
      { visibility: 'all' },
      { visibility: audience }
    ],
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ pinned: -1, featured: -1, publishedAt: -1 });
};

// Static method to get scheduled announcements that should be published
announcementSchema.statics.getScheduledForPublication = function() {
  return this.find({
    status: 'scheduled',
    publishDate: { $lte: new Date() }
  });
};

// Pre-save middleware to handle auto-publishing
announcementSchema.pre('save', function(next) {
  // Auto-publish if scheduled time has passed
  if (this.status === 'scheduled' && this.publishDate && new Date() >= this.publishDate) {
    this.status = 'published';
    this.publishedAt = new Date();
  }
  
  // Auto-archive if expired
  if (this.status === 'published' && this.expiresAt && new Date() > this.expiresAt) {
    this.status = 'archived';
    this.archivedAt = new Date();
    this.isActive = false;
  }
  
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);
