const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);