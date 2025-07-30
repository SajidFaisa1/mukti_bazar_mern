const mongoose = require('mongoose');

const barterItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true }, // Value at time of offer
  totalValue: { type: Number, required: true }, // quantity * unitPrice
  notes: { type: String, default: '' } // Additional notes about the item
});

const barterSchema = new mongoose.Schema({
  // Basic Information
  barterNumber: { type: String, required: true, unique: true },
  
  // Vendor Information
  proposingVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  proposingVendorUid: { type: String, required: true },
  targetVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  targetVendorUid: { type: String, required: true },
  
  // Target Product (what the proposing vendor wants)
  targetProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  targetQuantity: { type: Number, required: true, min: 1 },
  targetValue: { type: Number, required: true },
  
  // Offered Products (what the proposing vendor is offering)
  offeredItems: [barterItemSchema],
  totalOfferedValue: { type: Number, required: true },
  
  // Barter Details
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'counter-offered', 'cancelled', 'completed', 'expired'], 
    default: 'pending' 
  },
  
  // Value difference and balancing
  valueDifference: { type: Number, default: 0 }, // targetValue - totalOfferedValue
  cashAdjustment: { type: Number, default: 0 }, // Additional cash if needed
  
  // Messages and Communication
  proposalMessage: { type: String, default: '' },
  responseMessage: { type: String, default: '' },
  
  // Counter Offer (if applicable)
  counterOffer: {
    items: [barterItemSchema],
    totalValue: { type: Number },
    cashAdjustment: { type: Number, default: 0 },
    message: { type: String, default: '' },
    createdAt: { type: Date }
  },
  
  // Important Dates
  proposedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
  completedAt: { type: Date },
  expiresAt: { type: Date, default: () => Date.now() + 7*24*60*60*1000 }, // 7 days from now
  
  // Delivery and Exchange Details
  exchangeLocation: {
    address: { type: String },
    city: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    meetingTime: { type: Date }
  },
  
  // Quality and Condition Notes
  qualityNotes: { type: String, default: '' },
  conditionRequirements: { type: String, default: '' },
  
  // Rating System (after completion)
  rating: {
    proposingVendorRating: { type: Number, min: 1, max: 5 },
    targetVendorRating: { type: Number, min: 1, max: 5 },
    proposingVendorFeedback: { type: String },
    targetVendorFeedback: { type: String }
  },
  
  // System Fields
  isDeleted: { type: Boolean, default: false },
  
}, { timestamps: true });

// Generate unique barter number
barterSchema.statics.generateBarterNumber = function() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BTR-${timestamp}-${random}`;
};

// Static method to create a new barter offer
barterSchema.statics.createBarterOffer = async function(offerData) {
  const barterNumber = this.generateBarterNumber();
  
  // Calculate total offered value
  const totalOfferedValue = offerData.offeredItems.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
  
  // Calculate value difference
  const valueDifference = offerData.targetValue - totalOfferedValue;
  
  const barter = new this({
    ...offerData,
    barterNumber,
    totalOfferedValue,
    valueDifference
  });
  
  return await barter.save();
};

// Instance method to accept barter offer
barterSchema.methods.acceptOffer = async function(responseMessage = '') {
  this.status = 'accepted';
  this.responseMessage = responseMessage;
  this.respondedAt = new Date();
  return await this.save();
};

// Instance method to reject barter offer
barterSchema.methods.rejectOffer = async function(responseMessage = '') {
  this.status = 'rejected';
  this.responseMessage = responseMessage;
  this.respondedAt = new Date();
  return await this.save();
};

// Instance method to create counter offer
barterSchema.methods.createCounterOffer = async function(counterOfferData) {
  const totalValue = counterOfferData.items.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
  
  this.status = 'counter-offered';
  this.counterOffer = {
    ...counterOfferData,
    totalValue,
    createdAt: new Date()
  };
  this.respondedAt = new Date();
  return await this.save();
};

// Instance method to complete barter
barterSchema.methods.completeBarter = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return await this.save();
};

// Instance method to check if expired
barterSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt && this.status === 'pending';
};

// Middleware to auto-expire old offers - TEMPORARILY DISABLED FOR DEBUGGING
// barterSchema.pre('find', function() {
//   this.updateMany(
//     { 
//       status: 'pending', 
//       expiresAt: { $lt: new Date() } 
//     },
//     { 
//       status: 'expired' 
//     }
//   );
// });

module.exports = mongoose.model('Barter', barterSchema);
