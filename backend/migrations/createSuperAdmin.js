const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase');
    console.log('MongoDB connected for migration');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Admin schema (duplicate to avoid model conflicts)
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

const createSuperAdmin = async () => {
  try {
    await connectDB();

    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('Super admin already exists:', existingSuperAdmin.email);
      return;
    }

    // Default super admin credentials
    const superAdminData = {
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@antisynd.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!',
      name: 'System Administrator',
      role: 'super_admin',
      permissions: [], // Super admin gets all permissions by default
      enabled: true,
      status: 'active',
      mustChangePassword: false,
      promotedAt: new Date(),
      metadata: {
        loginAttempts: 0,
        passwordChangedAt: new Date(),
        twoFactorEnabled: false
      }
    };

    // Hash the password
    const saltRounds = 12;
    superAdminData.password = await bcrypt.hash(superAdminData.password, saltRounds);

    // Create the super admin
    const superAdmin = new Admin(superAdminData);
    await superAdmin.save();

    console.log('✅ Super admin created successfully!');
    console.log('Email:', superAdminData.email);
    console.log('Password:', process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!');
    console.log('Role: super_admin');
    console.log('\n🚨 IMPORTANT: Please change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the migration if called directly
if (require.main === module) {
  createSuperAdmin();
}

module.exports = { createSuperAdmin };
