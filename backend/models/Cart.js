const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productId: { type: String, required: true }, // For easier querying
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Current price when added
  offerPrice: { type: Number }, // Offer price when added
  unitPrice: { type: Number }, // Unit price when added
  quantity: { type: Number, required: true, min: 1 },
  minOrderQty: { type: Number, default: 1 },
  unitType: { type: String, default: 'pcs' },
  images: [{ type: String }],
  category: { type: String },
  // Snapshot of product data when added to cart
  productSnapshot: { type: Object }
});

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  uid: { type: String, required: true }, // Firebase UID for easy lookup
  role: { type: String, enum: ['client', 'vendor'], default: 'client' },
  
  // Cart Items
  items: [cartItemSchema],
  
  // Order Information
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  
  // Delivery Information
  deliveryAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  deliveryMethod: { 
    type: String, 
    enum: ['pickup', 'standard', 'semi-truck', 'truck', 'negotiated']
  },
  deliveryFee: { type: Number, default: 0 },
  estimatedDelivery: { type: Date },
  totalWeight: { type: Number, default: 0 }, // For weight-based delivery calculations
  deliveryNotes: { type: String }, // For negotiated delivery details
  
  // Timestamps
  lastModified: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Automatically update total when items change
cartSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.subtotal = this.items.reduce((total, item) => {
      const price = item.offerPrice || item.unitPrice || item.price || 0;
      return total + (price * item.quantity);
    }, 0);
    
    this.total = this.subtotal + this.tax + this.shippingFee + this.deliveryFee - this.discount;
  }
  this.lastModified = new Date();
  next();
});

// Index for efficient queries
cartSchema.index({ uid: 1 });
cartSchema.index({ user: 1 });
cartSchema.index({ vendor: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-cleanup old carts

// Virtual for item count
cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

module.exports = mongoose.model('Cart', cartSchema);
