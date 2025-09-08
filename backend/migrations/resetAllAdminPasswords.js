const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase');
    console.log('MongoDB connected for admin password reset');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Admin schema
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

const resetAllAdminPasswords = async () => {
  try {
    await connectDB();

    // Find all non-super admin accounts
    const regularAdmins = await Admin.find({ 
      role: { $ne: 'super_admin' },
      status: 'active' 
    });
    
    console.log('\n🔑 Resetting passwords for regular admin accounts...\n');
    
    const adminCredentials = [];
    
    for (const admin of regularAdmins) {
      // Generate a simple password
      const newPassword = 'Admin123!';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update admin with new password and reset failed attempts
      await Admin.findByIdAndUpdate(admin._id, {
        password: hashedPassword,
        mustChangePassword: true,
        enabled: true,
        status: 'active',
        'metadata.loginAttempts': 0,
        'metadata.lockedUntil': null,
        'metadata.lastFailedLogin': null,
        'metadata.passwordChangedAt': new Date()
      });
      
      adminCredentials.push({
        email: admin.email,
        name: admin.name,
        role: admin.role,
        password: newPassword
      });
      
      console.log(`✅ Reset password for: ${admin.email}`);
    }
    
    console.log('\n📋 ADMIN LOGIN CREDENTIALS:');
    console.log('=' .repeat(60));
    
    adminCredentials.forEach((cred, index) => {
      console.log(`\n${index + 1}. ${cred.role.toUpperCase()} ACCOUNT:`);
      console.log(`   Email: ${cred.email}`);
      console.log(`   Name: ${cred.name || 'Not set'}`);
      console.log(`   Password: ${cred.password}`);
      console.log(`   Role: ${cred.role}`);
    });
    
    // Also show super admin credentials
    console.log(`\n${adminCredentials.length + 1}. SUPER ADMIN ACCOUNT:`);
    console.log(`   Email: admin@antisynd.com`);
    console.log(`   Password: SuperAdmin123!`);
    console.log(`   Role: super_admin`);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🚨 IMPORTANT: All admins should change their passwords after first login!');
    console.log('🔐 Admin Panel URL: http://localhost:5173/admin');

  } catch (error) {
    console.error('❌ Error resetting admin passwords:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script if called directly
if (require.main === module) {
  resetAllAdminPasswords();
}

module.exports = { resetAllAdminPasswords };
