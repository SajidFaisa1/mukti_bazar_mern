const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Price at time of order
  offerPrice: { type: Number },
  unitPrice: { type: Number },
  quantity: { type: Number, required: true, min: 1 },
  unitType: { type: String, default: 'pcs' },
  images: [{ type: String }],
  category: { type: String },
  // Snapshot of product data at time of order
  productSnapshot: { type: Object }
});

const orderSchema = new mongoose.Schema({
  // User Information
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  uid: { type: String, required: true }, // Firebase UID
  role: { type: String, enum: ['client', 'vendor'], default: 'client' },
  
  // Order Identification
  orderNumber: { type: String, required: true, unique: true },
  
  // Order Items (snapshot from cart at checkout)
  items: [orderItemSchema],
  
  // Financial Information
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  
  // Delivery Information (snapshot from cart)
  deliveryAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    label: { type: String, default: 'Home' }
  },
  deliveryMethod: { 
    type: String, 
    enum: ['pickup', 'standard', 'semi-truck', 'truck', 'negotiated'], 
    required: true
  },
  estimatedDelivery: { type: Date },
  totalWeight: { type: Number, default: 0 },
  deliveryNotes: { type: String },
  
  // Payment Information
  paymentMethod: { 
    type: String, 
    enum: ['cod', 'card', 'mobile-banking', 'bank-transfer'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentId: { type: String }, // Transaction ID from payment gateway
  isPaid: { type: Boolean, default: false },
  
  // Order Status and Tracking
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], 
    default: 'pending' 
  },
  
  // Timestamps
  orderedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
  shippedAt: { type: Date },
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
  
  // Tracking Information
  trackingNumber: { type: String },
  courier: { type: String },
  trackingUrl: { type: String },
  
  // Additional Information
  notes: { type: String }, // Customer notes
  specialInstructions: { type: String }, // Delivery instructions
  adminNotes: { type: String }, // Internal admin notes
  
  // Status History
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
    updatedBy: { type: String } // Admin/system who updated
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
orderSchema.index({ uid: 1, status: 1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ vendor: 1, status: 1 });
orderSchema.index({ orderedAt: -1 }); // For recent orders
orderSchema.index({ status: 1, orderedAt: -1 }); // For status-based queries

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Method to generate order number
orderSchema.statics.generateOrderNumber = function(role = 'client') {
  const prefix = role === 'vendor' ? 'VND' : 'ORD';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Method to update status with history
orderSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = 'system') {
  this.status = newStatus;
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    note,
    updatedBy
  });
  
  // Update relevant timestamps
  const now = new Date();
  switch (newStatus) {
    case 'confirmed':
      this.confirmedAt = now;
      break;
    case 'shipped':
      this.shippedAt = now;
      break;
    case 'delivered':
      this.deliveredAt = now;
      break;
    case 'cancelled':
      this.cancelledAt = now;
      break;
  }
  
  return this.save();
};

// Method to create order from cart
orderSchema.statics.createFromCart = async function(cart, paymentMethod, notes = '', specialInstructions = '') {
  const orderNumber = this.generateOrderNumber(cart.role);
  
  // Get delivery address details (populate if needed)
  let deliveryAddressSnapshot = cart.deliveryAddress;
  if (typeof cart.deliveryAddress === 'string') {
    const Address = mongoose.model('Address');
    const address = await Address.findById(cart.deliveryAddress);
    if (!address) {
      throw new Error('Delivery address not found');
    }
    deliveryAddressSnapshot = {
      name: address.name,
      phone: address.phone,
      email: address.email,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      district: address.district,
      state: address.state,
      zip: address.zip,
      label: address.label
    };
  }
  
  const orderData = {
    user: cart.user,
    vendor: cart.vendor,
    uid: cart.uid,
    role: cart.role,
    orderNumber,
    items: cart.items.map(item => ({
      product: item.product,
      productId: item.productId,
      name: item.name,
      price: item.price,
      offerPrice: item.offerPrice,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      unitType: item.unitType,
      images: item.images,
      category: item.category,
      productSnapshot: item.productSnapshot
    })),
    subtotal: cart.subtotal,
    tax: cart.tax,
    deliveryFee: cart.deliveryFee,
    discount: cart.discount,
    total: cart.total,
    deliveryAddress: deliveryAddressSnapshot,
    deliveryMethod: cart.deliveryMethod,
    estimatedDelivery: cart.estimatedDelivery,
    totalWeight: cart.totalWeight,
    deliveryNotes: cart.deliveryNotes,
    paymentMethod,
    notes,
    specialInstructions
  };
  
  const order = new this(orderData);
  await order.save();
  
  return order;
};

module.exports = mongoose.model('Order', orderSchema);
