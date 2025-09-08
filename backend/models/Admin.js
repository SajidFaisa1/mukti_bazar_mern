const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'moderator', 'analyst'],
    default: 'admin' 
  },
  permissions: [{
    type: String,
    enum: [
      'user_management',
      'vendor_management', 
      'product_management',
      'fraud_detection',
      'financial_oversight',
      'system_configuration',
      'analytics_access',
      'audit_logs',
      'admin_management',
      'bulk_operations'
    ]
  }],
  enabled: { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ['active', 'archived', 'suspended'],
    default: 'active' 
  },
  mustChangePassword: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  promotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  promotedAt: { type: Date },
  originalUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to original user
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  archivedAt: { type: Date },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  metadata: {
    loginAttempts: { type: Number, default: 0 },
    lastFailedLogin: { type: Date },
    lockedUntil: { type: Date },
    passwordChangedAt: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.metadata?.lockedUntil && this.metadata.lockedUntil > Date.now());
});

// Virtual for getting full display name
adminSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

// Index for performance
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1, enabled: 1 });
adminSchema.index({ status: 1 });

// Methods
adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

adminSchema.methods.hasPermission = function(permission) {
  // Super admins have all permissions
  if (this.role === 'super_admin') return true;
  
  // Check if permission is explicitly granted
  return this.permissions && this.permissions.includes(permission);
};

adminSchema.methods.canManageRole = function(targetRole) {
  // Super admins can manage all roles
  if (this.role === 'super_admin') return true;
  
  // Admins can manage moderators and analysts
  if (this.role === 'admin' && ['moderator', 'analyst'].includes(targetRole)) {
    return true;
  }
  
  return false;
};

// Pre-save middleware to handle password hashing
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 12);
    this.metadata.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set default permissions based on role
adminSchema.pre('save', function(next) {
  if (this.isModified('role') && !this.permissions?.length) {
    switch (this.role) {
      case 'super_admin':
        // Super admins get all permissions by default (handled in hasPermission method)
        this.permissions = [];
        break;
      case 'admin':
        this.permissions = [
          'user_management',
          'vendor_management',
          'product_management',
          'fraud_detection',
          'analytics_access',
          'audit_logs'
        ];
        break;
      case 'moderator':
        this.permissions = [
          'user_management',
          'product_management',
          'fraud_detection'
        ];
        break;
      case 'analyst':
        this.permissions = [
          'analytics_access',
          'audit_logs'
        ];
        break;
    }
  }
  next();
});

module.exports = mongoose.model('Admin', adminSchema);
