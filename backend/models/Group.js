const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  // Basic group information
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  avatar: { type: String }, // Group avatar image URL
  
  // Group type and category
  category: { 
    type: String, 
    enum: ['regional', 'category-based', 'business', 'general'], 
    default: 'general' 
  },
  tags: [{ type: String }], // For better discoverability
  
  // Enhanced group settings
  settings: {
    // Privacy and access
    isPrivate: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: false },
    allowMemberInvites: { type: Boolean, default: true },
    maxMembers: { type: Number, default: 50 },
    
    // Content settings
    allowFileSharing: { type: Boolean, default: true },
    allowImageSharing: { type: Boolean, default: true },
    allowLinkSharing: { type: Boolean, default: true },
    maxFileSize: { type: Number, default: 10485760 }, // 10MB in bytes
    
    // Messaging settings
    allowAnnouncements: { type: Boolean, default: true },
    allowBulkMessages: { type: Boolean, default: true },
    allowPolls: { type: Boolean, default: true },
    allowEvents: { type: Boolean, default: true },
    
    // Moderation settings
    autoModeration: { type: Boolean, default: false },
    spamDetection: { type: Boolean, default: true },
    profanityFilter: { type: Boolean, default: false },
    
    // Notification settings
    mentionNotifications: { type: Boolean, default: true },
    announcementNotifications: { type: Boolean, default: true },
    memberActivityNotifications: { type: Boolean, default: false },
    
    // Advanced features
    allowVendorPromotion: { type: Boolean, default: true },
    allowProductSharing: { type: Boolean, default: true },
    requireBusinessVerification: { type: Boolean, default: false },
    
    // Time-based settings
    messageRetentionDays: { type: Number, default: 365 },
    inactivityTimeoutDays: { type: Number, default: 90 }
  },
  
  // Members with enhanced role system
  members: [{
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    uid: { type: String, required: true },
    businessName: { type: String, required: true },
    storeId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    role: { 
      type: String, 
      enum: ['owner', 'admin', 'moderator', 'senior_member', 'member'], 
      default: 'member' 
    },
    
    // Enhanced permissions system
    permissions: {
      // Group management
      canEditGroup: { type: Boolean, default: false },
      canDeleteGroup: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false },
      
      // Member management
      canInviteMembers: { type: Boolean, default: false },
      canRemoveMembers: { type: Boolean, default: false },
      canPromoteMembers: { type: Boolean, default: false },
      canDemoteMembers: { type: Boolean, default: false },
      canViewMemberList: { type: Boolean, default: true },
      
      // Content management
      canPostMessages: { type: Boolean, default: true },
      canDeleteMessages: { type: Boolean, default: false },
      canPinMessages: { type: Boolean, default: false },
      canCreateAnnouncements: { type: Boolean, default: false },
      canManageAnnouncements: { type: Boolean, default: false },
      
      // Bulk messaging
      canSendBulkMessages: { type: Boolean, default: false },
      canCreatePolls: { type: Boolean, default: false },
      canCreateEvents: { type: Boolean, default: false },
      
      // Moderation
      canModerateContent: { type: Boolean, default: false },
      canBanMembers: { type: Boolean, default: false },
      canViewAnalytics: { type: Boolean, default: false }
    },
    
    // Member status and activity
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    bannedUntil: { type: Date },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    banReason: { type: String },
    
    // Activity tracking
    lastActivity: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    announcementCount: { type: Number, default: 0 },
    
    // Member preferences
    notifications: {
      announcements: { type: Boolean, default: true },
      bulkMessages: { type: Boolean, default: true },
      memberJoined: { type: Boolean, default: true },
      memberLeft: { type: Boolean, default: true },
      roleChanges: { type: Boolean, default: true }
    }
  }],
  
  // Group statistics
  stats: {
    totalMembers: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    lastActivity: { type: Date }
  },
  
  // Associated conversation
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  
  // Region-specific data (for regional groups)
  region: {
    city: { type: String },
    district: { type: String },
    state: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  
  // Category-specific data (for category-based groups)
  productCategories: [{ type: String }],
  
  // Group creator and management
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  creatorUid: { type: String, required: true },
  
  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }, // For official/verified groups
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
groupSchema.index({ 'members.vendor': 1 });
groupSchema.index({ 'members.uid': 1 });
groupSchema.index({ category: 1, isActive: 1 });
groupSchema.index({ 'region.city': 1, 'region.district': 1 });
groupSchema.index({ productCategories: 1 });
groupSchema.index({ isActive: 1, 'settings.isPrivate': 1 });
groupSchema.index({ name: 'text', description: 'text' }); // Text search

// Virtual for admin members
groupSchema.virtual('admins').get(function() {
  return (this.members || []).filter(member => member.role === 'admin' && member.isActive);
});

// Virtual for active members count
groupSchema.virtual('activeMembersCount').get(function() {
  return (this.members || []).filter(member => member.isActive).length;
});

// Pre-save middleware to update stats
groupSchema.pre('save', function(next) {
  if (this.isModified('members')) {
    this.stats.totalMembers = (this.members || []).length;
    this.stats.activeMembers = (this.members || []).filter(m => m.isActive).length;
  }
  next();
});

// Method to add member with enhanced role system
groupSchema.methods.addMember = async function(vendorInfo, role = 'member', addedBy = null) {
  const { vendorId, uid, businessName, storeId } = vendorInfo;
  
  // Check if vendor is already a member
  const existingMember = (this.members || []).find(m => 
    m.vendor.toString() === vendorId.toString()
  );
  
  if (existingMember) {
    if (!existingMember.isActive) {
      existingMember.isActive = true;
      existingMember.joinedAt = new Date();
      existingMember.role = role;
      existingMember.permissions = this.getPermissionsForRole(role);
    }
    return this.save();
  }
  
  // Check member limit
  const activeMembers = (this.members || []).filter(m => m.isActive).length;
  if (activeMembers >= this.settings.maxMembers) {
    throw new Error('Group has reached maximum member limit');
  }
  
  // Ensure members array exists
  if (!this.members) {
    this.members = [];
  }
  
  this.members.push({
    vendor: vendorId,
    uid: uid,
    businessName: businessName,
    storeId: storeId,
    role: role,
    permissions: this.getPermissionsForRole(role)
  });
  
  // Update conversation participants if conversation exists
  if (this.conversation) {
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(this.conversation, {
      $push: {
        participants: {
          user: vendorId,
          userModel: 'Vendor',
          uid: uid,
          name: businessName,
          role: 'vendor',
          isAdmin: role === 'admin' || role === 'owner'
        }
      }
    });
  }
  
  return this.save();
};

// Method to get default permissions for a role
groupSchema.methods.getPermissionsForRole = function(role) {
  const basePermissions = {
    canEditGroup: false,
    canDeleteGroup: false,
    canManageSettings: false,
    canInviteMembers: this.settings.allowMemberInvites,
    canRemoveMembers: false,
    canPromoteMembers: false,
    canDemoteMembers: false,
    canViewMemberList: true,
    canPostMessages: true,
    canDeleteMessages: false,
    canPinMessages: false,
    canCreateAnnouncements: false,
    canManageAnnouncements: false,
    canSendBulkMessages: false,
    canCreatePolls: false,
    canCreateEvents: false,
    canModerateContent: false,
    canBanMembers: false,
    canViewAnalytics: false
  };
  
  switch (role) {
    case 'owner':
      return Object.keys(basePermissions).reduce((perms, key) => {
        perms[key] = true;
        return perms;
      }, {});
      
    case 'admin':
      return {
        ...basePermissions,
        canEditGroup: true,
        canManageSettings: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canPromoteMembers: true,
        canDemoteMembers: true,
        canDeleteMessages: true,
        canPinMessages: true,
        canCreateAnnouncements: true,
        canManageAnnouncements: true,
        canSendBulkMessages: true,
        canCreatePolls: true,
        canCreateEvents: true,
        canModerateContent: true,
        canBanMembers: true,
        canViewAnalytics: true
      };
      
    case 'moderator':
      return {
        ...basePermissions,
        canInviteMembers: true,
        canRemoveMembers: true,
        canDeleteMessages: true,
        canPinMessages: true,
        canCreateAnnouncements: true,
        canCreatePolls: true,
        canCreateEvents: true,
        canModerateContent: true,
        canViewAnalytics: true
      };
      
    case 'senior_member':
      return {
        ...basePermissions,
        canInviteMembers: true,
        canCreateAnnouncements: true,
        canCreatePolls: true,
        canCreateEvents: true
      };
      
    default: // member
      return basePermissions;
  }
};

// Method to check specific permission
groupSchema.methods.hasPermission = function(vendorId, permission) {
  const member = this.members.find(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive && !m.isBanned
  );
  
  if (!member) return false;
  
  return member.permissions[permission] === true;
};

// Method to promote/demote member
groupSchema.methods.updateMemberRole = function(vendorId, newRole, updatedBy) {
  const member = this.members.find(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive
  );
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  // Check if updater has permission
  if (updatedBy && !this.hasPermission(updatedBy, 'canPromoteMembers') && !this.hasPermission(updatedBy, 'canDemoteMembers')) {
    throw new Error('Insufficient permissions to change member role');
  }
  
  const oldRole = member.role;
  member.role = newRole;
  member.permissions = this.getPermissionsForRole(newRole);
  
  return this.save();
};

// Method to ban member
groupSchema.methods.banMember = function(vendorId, bannedBy, reason, durationDays = null) {
  const member = this.members.find(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive
  );
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  // Check if banner has permission
  if (!this.hasPermission(bannedBy, 'canBanMembers')) {
    throw new Error('Insufficient permissions to ban member');
  }
  
  member.isBanned = true;
  member.bannedBy = bannedBy;
  member.banReason = reason;
  
  if (durationDays) {
    member.bannedUntil = new Date(Date.now() + (durationDays * 24 * 60 * 60 * 1000));
  }
  
  return this.save();
};

// Method to unban member
groupSchema.methods.unbanMember = function(vendorId, unbannedBy) {
  const member = this.members.find(m => 
    m.vendor.toString() === vendorId.toString()
  );
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  // Check if unbanner has permission
  if (!this.hasPermission(unbannedBy, 'canBanMembers')) {
    throw new Error('Insufficient permissions to unban member');
  }
  
  member.isBanned = false;
  member.bannedUntil = null;
  member.bannedBy = null;
  member.banReason = null;
  
  return this.save();
};

// Method to remove member
groupSchema.methods.removeMember = function(vendorId) {
  // Remove the member completely from the array
  this.members = (this.members || []).filter(m => 
    m.vendor.toString() !== vendorId.toString()
  );
  
  return this.save();
};

// Method to check if vendor is member
groupSchema.methods.isMember = function(vendorId) {
  return (this.members || []).some(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive && !m.isBanned
  );
};

// Method to check if vendor is admin
groupSchema.methods.isAdmin = function(vendorId) {
  const member = (this.members || []).find(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive
  );
  return member && member.role === 'admin';
};

// Method to get member info
groupSchema.methods.getMember = function(vendorId) {
  return (this.members || []).find(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive
  );
};

// Static method to find groups by vendor
groupSchema.statics.findByVendor = function(vendorId, options = {}) {
  const query = {
    'members.vendor': vendorId,
    'members.isActive': true,
    isActive: true
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.region) {
    if (options.region.city) query['region.city'] = options.region.city;
    if (options.region.district) query['region.district'] = options.region.district;
  }
  
  return this.find(query).sort({ 'stats.lastActivity': -1 });
};

// Static method to search groups
groupSchema.statics.searchGroups = function(searchTerm, filters = {}) {
  const query = {
    isActive: true,
    'settings.isPrivate': false
  };
  
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.region) {
    if (filters.region.city) query['region.city'] = new RegExp(filters.region.city, 'i');
    if (filters.region.district) query['region.district'] = new RegExp(filters.region.district, 'i');
  }
  
  return this.find(query).sort({ 'stats.activeMembers': -1, 'stats.lastActivity': -1 });
};

module.exports = mongoose.model('Group', groupSchema);
