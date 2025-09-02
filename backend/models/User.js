const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(
  {
    uid: { type: String },
    name: { type: String},
    email: { type: String,unique: true },
    password: { type: String},
    phone: { type: String},
    role: { type: String, default: 'client' },
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // Account restriction & verification controls
    banned: { type: Boolean, default: false },
    bannedAt: { type: Date },
    bannedReason: { type: String },
    bannedBy: { type: String }, // admin UID
    verification: {
      status: { type: String, enum: ['unverified','required','pending','verified','rejected'], default: 'unverified' },
      requiredAt: { type: Date },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: String },
      rejectionReason: { type: String },
      documents: [{
        type: { type: String }, // e.g. trade_license, nid_front, nid_back
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now }
      }]
    }
  },
  { timestamps: true }
);

// Virtual convenience flag
userSchema.virtual('canPurchase').get(function() {
  if (this.banned) return false;
  if (!this.verification) return true;
  return !['required','pending','rejected'].includes(this.verification.status);
});
module.exports = mongoose.model('User', userSchema);
