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
  
  // Group settings
  settings: {
    isPrivate: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: false },
    allowMemberInvites: { type: Boolean, default: true },
    maxMembers: { type: Number, default: 50 },
    allowFileSharing: { type: Boolean, default: true },
    allowImageSharing: { type: Boolean, default: true }
  },
  
  // Members
  members: [{
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    uid: { type: String, required: true },
    businessName: { type: String, required: true },
    storeId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    role: { 
      type: String, 
      enum: ['admin', 'moderator', 'member'], 
      default: 'member' 
    },
    permissions: {
      canInviteMembers: { type: Boolean, default: false },
      canRemoveMembers: { type: Boolean, default: false },
      canEditGroup: { type: Boolean, default: false },
      canPinMessages: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: true }
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
  return this.members.filter(member => member.role === 'admin' && member.isActive);
});

// Virtual for active members count
groupSchema.virtual('activeMembersCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Pre-save middleware to update stats
groupSchema.pre('save', function(next) {
  if (this.isModified('members')) {
    this.stats.totalMembers = this.members.length;
    this.stats.activeMembers = this.members.filter(m => m.isActive).length;
  }
  next();
});

// Method to add member
groupSchema.methods.addMember = async function(vendorInfo, role = 'member', addedBy = null) {
  const { vendorId, uid, businessName, storeId } = vendorInfo;
  
  // Check if vendor is already a member
  const existingMember = this.members.find(m => 
    m.vendor.toString() === vendorId.toString()
  );
  
  if (existingMember) {
    if (!existingMember.isActive) {
      existingMember.isActive = true;
      existingMember.joinedAt = new Date();
      existingMember.role = role;
    }
    return this.save();
  }
  
  // Check member limit
  const activeMembers = this.members.filter(m => m.isActive).length;
  if (activeMembers >= this.settings.maxMembers) {
    throw new Error('Group has reached maximum member limit');
  }
  
  // Set permissions based on role
  const permissions = {
    canInviteMembers: role === 'admin' || role === 'moderator' || this.settings.allowMemberInvites,
    canRemoveMembers: role === 'admin' || role === 'moderator',
    canEditGroup: role === 'admin',
    canPinMessages: role === 'admin' || role === 'moderator'
  };
  
  this.members.push({
    vendor: vendorId,
    uid: uid,
    businessName: businessName,
    storeId: storeId,
    role: role,
    permissions: permissions
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
          isAdmin: role === 'admin'
        }
      }
    });
  }
  
  return this.save();
};

// Method to remove member
groupSchema.methods.removeMember = function(vendorId) {
  const member = this.members.find(m => 
    m.vendor.toString() === vendorId.toString()
  );
  
  if (member) {
    member.isActive = false;
  }
  
  return this.save();
};

// Method to update member role
groupSchema.methods.updateMemberRole = function(vendorId, newRole) {
  const member = this.members.find(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive
  );
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  member.role = newRole;
  
  // Update permissions based on new role
  member.permissions = {
    canInviteMembers: newRole === 'admin' || newRole === 'moderator' || this.settings.allowMemberInvites,
    canRemoveMembers: newRole === 'admin' || newRole === 'moderator',
    canEditGroup: newRole === 'admin',
    canPinMessages: newRole === 'admin' || newRole === 'moderator'
  };
  
  return this.save();
};

// Method to check if vendor is member
groupSchema.methods.isMember = function(vendorId) {
  return this.members.some(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive
  );
};

// Method to check if vendor is admin
groupSchema.methods.isAdmin = function(vendorId) {
  const member = this.members.find(m => 
    m.vendor.toString() === vendorId.toString() && m.isActive
  );
  return member && member.role === 'admin';
};

// Method to get member info
groupSchema.methods.getMember = function(vendorId) {
  return this.members.find(m => 
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
