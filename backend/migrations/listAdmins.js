const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase');
    console.log('MongoDB connected for admin listing');
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

const listAllAdmins = async () => {
  try {
    await connectDB();

    const admins = await Admin.find({}).select('email name role status enabled lastLoginAt metadata.loginAttempts createdAt');
    
    console.log('\n📋 All Admin Accounts:');
    console.log('=' .repeat(60));
    
    if (admins.length === 0) {
      console.log('❌ No admin accounts found in database!');
    } else {
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. Email: ${admin.email}`);
        console.log(`   Name: ${admin.name || 'Not set'}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Status: ${admin.status}`);
        console.log(`   Enabled: ${admin.enabled}`);
        console.log(`   Created: ${admin.createdAt}`);
        console.log(`   Last Login: ${admin.lastLoginAt || 'Never'}`);
        console.log(`   Login Attempts: ${admin.metadata?.loginAttempts || 0}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📊 Total admins: ${admins.length}`);

  } catch (error) {
    console.error('❌ Error listing admins:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script if called directly
if (require.main === module) {
  listAllAdmins();
}

module.exports = { listAllAdmins };
