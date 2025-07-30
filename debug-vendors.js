const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// Define Vendor schema (simplified)
const vendorSchema = new mongoose.Schema({
  uid: String,
  businessName: String,
  email: String
});

const Vendor = mongoose.model('Vendor', vendorSchema);

// Define Barter schema (simplified)  
const barterSchema = new mongoose.Schema({
  proposingVendorUid: String,
  targetVendorUid: String,
  status: String,
  isDeleted: { type: Boolean, default: false }
});

const Barter = mongoose.model('Barter', barterSchema);

async function debugVendorsAndBarters() {
  try {
    console.log('🔍 DEBUGGING VENDORS AND BARTERS');
    console.log('================================');
    
    // Get all vendors
    const vendors = await Vendor.find({}).select('uid businessName email');
    console.log('\n📋 ALL VENDORS:');
    vendors.forEach((vendor, index) => {
      console.log(`  ${index + 1}. UID: "${vendor.uid}"`);
      console.log(`     Business: ${vendor.businessName}`);
      console.log(`     Email: ${vendor.email}`);
      console.log('     ---');
    });
    
    // Get all barters
    const barters = await Barter.find({ isDeleted: false }).select('proposingVendorUid targetVendorUid status');
    console.log('\n🔄 ALL BARTERS:');
    barters.forEach((barter, index) => {
      console.log(`  ${index + 1}. ID: ${barter._id}`);
      console.log(`     Proposing: "${barter.proposingVendorUid}"`);
      console.log(`     Target: "${barter.targetVendorUid}"`);
      console.log(`     Status: ${barter.status}`);
      console.log('     ---');
    });
    
    // Check matches
    console.log('\n🔍 MATCHING ANALYSIS:');
    barters.forEach((barter, index) => {
      const proposingVendor = vendors.find(v => v.uid === barter.proposingVendorUid);
      const targetVendor = vendors.find(v => v.uid === barter.targetVendorUid);
      
      console.log(`  Barter ${index + 1}:`);
      console.log(`    Proposing Vendor Found: ${proposingVendor ? `${proposingVendor.businessName} (${proposingVendor.uid})` : 'NOT FOUND'}`);
      console.log(`    Target Vendor Found: ${targetVendor ? `${targetVendor.businessName} (${targetVendor.uid})` : 'NOT FOUND'}`);
      console.log('    ---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugVendorsAndBarters();
