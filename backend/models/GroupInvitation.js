const mongoose = require('mongoose');

const groupInvitationSchema = new mongoose.Schema({
  group: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Group', 
    required: true 
  },
  inviter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor', 
    required: true 
  },
  invitee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor', 
    required: true 
  },
  inviterUid: { type: String, required: true },
  inviteeUid: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  message: { type: String }, // Optional invitation message
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes for better performance
groupInvitationSchema.index({ inviteeUid: 1, status: 1 });
groupInvitationSchema.index({ group: 1, inviteeUid: 1 });
groupInvitationSchema.index({ expiresAt: 1 });

// Method to check if invitation is expired
groupInvitationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to accept invitation
groupInvitationSchema.methods.accept = async function() {
  if (this.status !== 'pending') {
    throw new Error('Invitation is not pending');
  }
  if (this.isExpired()) {
    this.status = 'expired';
    await this.save();
    throw new Error('Invitation has expired');
  }
  
  this.status = 'accepted';
  this.acceptedAt = new Date();
  return this.save();
};

// Method to reject invitation
groupInvitationSchema.methods.reject = async function() {
  if (this.status !== 'pending') {
    throw new Error('Invitation is not pending');
  }
  
  this.status = 'rejected';
  this.rejectedAt = new Date();
  return this.save();
};

// Static method to clean up expired invitations
groupInvitationSchema.statics.cleanExpired = function() {
  return this.updateMany(
    { 
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    { status: 'expired' }
  );
};

module.exports = mongoose.model('GroupInvitation', groupInvitationSchema);
