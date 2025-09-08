const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase');
    console.log('MongoDB connected for password reset');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Admin schema (to ensure we're working with the right model)
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
  originalUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

const Admin = mongoose.model('Admin', adminSchema);

const resetSuperAdminPassword = async () => {
  try {
    await connectDB();

    // Find super admin
    const superAdmin = await Admin.findOne({ role: 'super_admin' });
    
    if (!superAdmin) {
      console.log('❌ No super admin found. Creating one...');
      
      // Create new super admin if none exists
      const newPassword = 'SuperAdmin123!';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const newSuperAdmin = new Admin({
        email: 'admin@antisynd.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'super_admin',
        permissions: [],
        enabled: true,
        status: 'active',
        mustChangePassword: false,
        promotedAt: new Date(),
        metadata: {
          loginAttempts: 0,
          passwordChangedAt: new Date(),
          twoFactorEnabled: false
        }
      });
      
      await newSuperAdmin.save();
      
      console.log('✅ New super admin created!');
      console.log('Email: admin@antisynd.com');
      console.log('Password: SuperAdmin123!');
      
    } else {
      console.log('📧 Found super admin:', superAdmin.email);
      
      // Reset the password
      const newPassword = 'SuperAdmin123!';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update the super admin
      await Admin.findByIdAndUpdate(superAdmin._id, {
        password: hashedPassword,
        mustChangePassword: false,
        enabled: true,
        status: 'active',
        'metadata.loginAttempts': 0,
        'metadata.lockedUntil': null,
        'metadata.lastFailedLogin': null,
        'metadata.passwordChangedAt': new Date()
      });
      
      console.log('✅ Super admin password reset successfully!');
      console.log('Email:', superAdmin.email);
      console.log('New Password: SuperAdmin123!');
    }
    
    console.log('\n🚨 IMPORTANT: Please change this password after logging in!');
    console.log('🔐 The admin panel URL should be: http://localhost:5173/admin');

  } catch (error) {
    console.error('❌ Error resetting super admin password:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script if called directly
if (require.main === module) {
  resetSuperAdminPassword();
}

module.exports = { resetSuperAdminPassword };
