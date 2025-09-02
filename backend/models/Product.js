const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  {
    unitPrice: Number,
    offerPrice: Number,
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    vendorUid: { type: String, required: true }, // Firebase uid
    storeId: { type: String, required: true }, // unique shop id

    // Basic info
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },

    // Media
    images: { type: [String], default: [] }, // URLs of uploaded images in production

    // Pricing / quantity
    unitPrice: { type: Number, required: true },
    offerPrice: { type: Number },
    unitType: { type: String, default: 'kg' },
    minOrderQty: { type: Number, default: 1 },
    totalQty: { type: Number, default: 0 },

    // New inventory & analytics fields
    reservedQty: { type: Number, default: 0 }, // in carts / pending orders
    soldQty: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    priceHistory: { type: [priceHistorySchema], default: [] },

    // Delivery / options
    deliveryOption: { type: String, default: 'Pickup' },
    estDeliveryTime: { type: String, default: '' },
    barterAvailable: { type: Boolean, default: false },
    negotiationAvailable: { type: Boolean, default: false },
    shelfLife: { type: String, default: '' },
    isApproved: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    businessName: { type: String, required: true },

  // Ratings summary (denormalized for fast reads)
  avgRating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },

    // Optional geo reference to vendor at time of listing (denormalized for faster queries)
    vendorLocation: {
      division: String,
      district: String,
      upazila: String,
      union: String,
      geo: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number],
      },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual effective price
productSchema.virtual('effectivePrice').get(function () {
  return this.offerPrice || this.unitPrice;
});

// Virtual current stock (excluding reserved)
productSchema.virtual('availableQty').get(function () {
  return Math.max(0, this.totalQty - this.reservedQty);
});

// Virtual stock status
productSchema.virtual('stockStatus').get(function () {
  const avail = this.availableQty;
  if (avail <= 0) return 'out';
  if (avail <= this.lowStockThreshold) return 'low';
  return 'ok';
});

// Pre-save hook to track price changes
productSchema.pre('save', function (next) {
  if (this.isModified('unitPrice') || this.isModified('offerPrice')) {
    this.priceHistory.push({ unitPrice: this.unitPrice, offerPrice: this.offerPrice });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);