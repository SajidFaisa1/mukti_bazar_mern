const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    uid: { type: String },
    storeId: { type: String, unique: true },
    sellerName: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    businessName: { type: String, required: true },
    address: { type: Object, default: { region: '', city: '', district: ''} },
    farmingLicense: { type: Object, default: {} },
    kycDocument: { type: Object, default: {} },
    shopLogo: { type: Object, default: {} },
    role: { type: String, default: 'vendor' },
    isApproved: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    featuredCredit: { type: Number, default: 3 },

  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', vendorSchema);
