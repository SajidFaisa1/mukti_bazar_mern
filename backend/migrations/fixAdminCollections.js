const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase');
    console.log('MongoDB connected for admin collection fix');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixAdminCollections = async () => {
  try {
    await connectDB();

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('Available collections:', collectionNames);

    // Check if migrationadmins collection exists
    const hasMigrationAdmins = collectionNames.includes('migrationadmins');
    const hasAdmins = collectionNames.includes('admins');

    console.log('Has migrationadmins collection:', hasMigrationAdmins);
    console.log('Has admins collection:', hasAdmins);

    if (hasMigrationAdmins) {
      // Get the super admin from migrationadmins
      const migrationAdmins = await mongoose.connection.db.collection('migrationadmins').find({}).toArray();
      console.log('Found in migrationadmins:', migrationAdmins.length);

      const superAdmin = migrationAdmins.find(admin => admin.role === 'super_admin');
      
      if (superAdmin) {
        console.log('Found super admin in migrationadmins:', superAdmin.email);

        // Check if this email already exists in admins collection
        const existingAdmin = await mongoose.connection.db.collection('admins').findOne({ email: superAdmin.email });
        
        if (existingAdmin) {
          console.log('Admin with this email already exists in admins collection');
          
          // Update the existing admin to be super admin with new password
          const updateResult = await mongoose.connection.db.collection('admins').updateOne(
            { email: superAdmin.email },
            {
              $set: {
                password: superAdmin.password, // Already hashed password
                role: 'super_admin',
                name: superAdmin.name || 'System Administrator',
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
              }
            }
          );
          
          console.log('✅ Updated existing admin to super admin:', updateResult.modifiedCount);
          
        } else {
          // Insert the super admin into the correct admins collection
          const insertResult = await mongoose.connection.db.collection('admins').insertOne({
            ...superAdmin,
            _id: new mongoose.Types.ObjectId() // Generate new ObjectId
          });
          
          console.log('✅ Moved super admin to admins collection:', insertResult.insertedId);
        }

        // Remove the migrationadmins collection
        await mongoose.connection.db.collection('migrationadmins').drop();
        console.log('✅ Removed migrationadmins collection');

      } else {
        console.log('No super admin found in migrationadmins collection');
      }
    }

    // Verify the final state
    const finalAdmins = await mongoose.connection.db.collection('admins').find({}).toArray();
    console.log('\n📊 Final admins in collection:');
    finalAdmins.forEach(admin => {
      console.log(`- Email: ${admin.email}, Role: ${admin.role}, Enabled: ${admin.enabled}`);
    });

    const superAdminCount = finalAdmins.filter(admin => admin.role === 'super_admin').length;
    if (superAdminCount === 0) {
      console.log('\n⚠️  WARNING: No super admin found! Creating one now...');
      
      // Create super admin if none exists
      const superAdminData = {
        email: 'admin@antisynd.com',
        password: await bcrypt.hash('SuperAdmin123!', 12),
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
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mongoose.connection.db.collection('admins').insertOne(superAdminData);
      console.log('✅ Created new super admin:', superAdminData.email);
    }

    console.log('\n🎉 Admin collections fixed successfully!');
    console.log('\nLogin credentials:');
    
    const finalSuperAdmin = await mongoose.connection.db.collection('admins').findOne({ role: 'super_admin' });
    if (finalSuperAdmin) {
      console.log('Email:', finalSuperAdmin.email);
      if (finalSuperAdmin.email === 'admin@antisynd.com') {
        console.log('Password: SuperAdmin123!');
      } else {
        console.log('Password: SuperAdmin123! (if updated) or original password');
      }
    }

  } catch (error) {
    console.error('❌ Error fixing admin collections:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the fix if called directly
if (require.main === module) {
  fixAdminCollections();
}

module.exports = { fixAdminCollections };
