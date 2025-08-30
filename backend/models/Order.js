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
  
  // 🛡️ ANTI-SYNDICATE SECURITY FEATURES
  // Enhanced Fraud Detection & Tracking
  securityInfo: {
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceFingerprint: { type: String }, // Enhanced device fingerprint hash
    deviceInfo: { type: Object }, // Complete device fingerprint data
    location: {
      country: { type: String },
      region: { type: String },
      city: { type: String }
    },
    sessionId: { type: String },
    timestamp: { type: Date },
    
    // Network analysis
    forwardedFor: { type: String },
    realIp: { type: String },
    isProxy: { type: Boolean, default: false },
    isTor: { type: Boolean, default: false },
    isVPN: { type: Boolean, default: false },
    
    // Device analysis
    isHeadlessBrowser: { type: Boolean, default: false },
    automationDetected: { type: Boolean, default: false },
    
    // Risk assessment
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' }
  },
  
  // Admin Approval System
  requiresApproval: { type: Boolean, default: false },
  suspiciousFlags: [{
    type: { 
      type: String, 
      enum: [
        'large_quantity', 'high_value', 'multiple_devices', 'location_mismatch', 
        'rapid_ordering', 'bulk_hoarding', 'headless_browser', 'proxy_vpn', 
        'tor_browser', 'suspicious_screen', 'no_plugins', 'device_reuse',
        'automation_detected', 'ip_sharing', 'behavioral_anomaly', 'focused_hoarding',
        'rapid_succession'
      ] 
    },
    description: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    flaggedAt: { type: Date, default: Date.now }
  }],
  adminApproval: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: String }, // Admin UID who reviewed
    reviewedAt: { type: Date },
    reason: { type: String },
    notes: { type: String }
  },
  
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
orderSchema.index({ 'securityInfo.ipAddress': 1, orderedAt: -1 }); // For fraud detection
orderSchema.index({ 'adminApproval.status': 1, requiresApproval: 1 }); // For admin panel

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
  return this.items ? this.items.reduce((total, item) => total + (item.quantity || 0), 0) : 0;
});

// 🛡️ ENHANCED ANTI-FRAUD DETECTION METHODS
orderSchema.methods.detectFraud = function(securityInfo) {
  const flags = [];
  
  // Check for large quantities (potential hoarding) - LOWERED THRESHOLDS
  const totalQuantity = this.items ? this.items.reduce((total, item) => total + (item.quantity || 0), 0) : 0;
  if (totalQuantity > 50) { // Lowered from 100 to 50
    flags.push({
      type: 'bulk_hoarding',
      description: `Large order quantity: ${totalQuantity} items`,
      severity: totalQuantity > 200 ? 'critical' : 
               totalQuantity > 100 ? 'high' : 'medium'
    });
  }
  
  // Check for high value orders - LOWERED THRESHOLDS
  if (this.total > 20000) { // Lowered from 50000 to 20000
    flags.push({
      type: 'high_value',
      description: `High value order: ৳${this.total}`,
      severity: this.total > 100000 ? 'critical' : 
               this.total > 50000 ? 'high' : 'medium'
    });
  }
  
  // Check for suspicious patterns in items (new detection)
  if (this.items && this.items.length > 0) {
    const itemTypes = new Set(this.items.map(item => item.category));
    const avgQuantityPerItem = totalQuantity / this.items.length;
    
    if (avgQuantityPerItem > 20 && itemTypes.size < 3) {
      flags.push({
        type: 'focused_hoarding',
        description: `High quantity of similar items: ${avgQuantityPerItem.toFixed(1)} avg per item type`,
        severity: avgQuantityPerItem > 50 ? 'high' : 'medium'
      });
    }
  }
  
  // Store enhanced security info
  this.securityInfo = {
    ...securityInfo,
    timestamp: new Date()
  };
  
  // Add flags and require approval if suspicious
  if (flags.length > 0) {
    this.suspiciousFlags = flags;
    this.requiresApproval = true;
    this.adminApproval.status = 'pending';
  }
  
  return flags;
};

orderSchema.statics.checkUserFraudHistory = async function(uid, securityInfo) {
  const { ipAddress, deviceFingerprint } = securityInfo;
  
  const recentOrders = await this.find({
    $or: [
      { uid },
      { 'securityInfo.ipAddress': ipAddress },
      { 'securityInfo.deviceFingerprint': deviceFingerprint }
    ],
    orderedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  }).sort({ orderedAt: -1 });
  
  const flags = [];
  
  // Check for rapid ordering (more than 1 order in 24h for new detection)
  const userOrders = recentOrders.filter(order => order.uid === uid);
  if (userOrders.length >= 1) { // Changed from > 5 to >= 1 for better detection
    if (userOrders.length > 10) {
      flags.push({
        type: 'rapid_ordering',
        description: `Excessive ordering: ${userOrders.length} orders in last 24 hours`,
        severity: 'critical'
      });
    } else if (userOrders.length > 5) {
      flags.push({
        type: 'rapid_ordering',
        description: `High frequency ordering: ${userOrders.length} orders in last 24 hours`,
        severity: 'high'
      });
    } else if (userOrders.length > 2) {
      flags.push({
        type: 'rapid_ordering',
        description: `Multiple orders: ${userOrders.length} orders in last 24 hours`,
        severity: 'medium'
      });
    }
    
    // Check time intervals between orders for rapid succession
    if (userOrders.length > 1) {
      const timeDiffs = [];
      for (let i = 0; i < userOrders.length - 1; i++) {
        const diff = (userOrders[i].orderedAt - userOrders[i + 1].orderedAt) / (1000 * 60); // minutes
        timeDiffs.push(diff);
      }
      const avgInterval = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
      
      if (avgInterval < 30) { // Less than 30 minutes between orders
        flags.push({
          type: 'rapid_succession',
          description: `Orders placed within ${avgInterval.toFixed(1)} minutes on average`,
          severity: avgInterval < 10 ? 'critical' : 'high'
        });
      }
    }
  }
  
  // Check for IP sharing across multiple users
  const ipOrders = recentOrders.filter(order => 
    order.securityInfo?.ipAddress === ipAddress && order.uid !== uid
  );
  if (ipOrders.length > 0) {
    const uniqueUsers = new Set(ipOrders.map(order => order.uid));
    if (uniqueUsers.size > 2) {
      flags.push({
        type: 'ip_sharing',
        description: `IP address shared with ${uniqueUsers.size} other users`,
        severity: uniqueUsers.size > 5 ? 'critical' : 'medium'
      });
    }
  }
  
  // Check for device fingerprint reuse
  if (deviceFingerprint) {
    const deviceOrders = recentOrders.filter(order => 
      order.securityInfo?.deviceFingerprint === deviceFingerprint && order.uid !== uid
    );
    if (deviceOrders.length > 0) {
      const uniqueDeviceUsers = new Set(deviceOrders.map(order => order.uid));
      flags.push({
        type: 'device_reuse',
        description: `Device used by ${uniqueDeviceUsers.size} different users`,
        severity: uniqueDeviceUsers.size > 3 ? 'critical' : 'high'
      });
    }
  }
  
  // Check for multiple device/IP usage by same user
  const uniqueIPs = new Set(userOrders.map(o => o.securityInfo?.ipAddress).filter(Boolean));
  const uniqueDevices = new Set(userOrders.map(o => o.securityInfo?.deviceFingerprint).filter(Boolean));
  
  if (uniqueIPs.size > 3) {
    flags.push({
      type: 'multiple_devices',
      description: `Orders from ${uniqueIPs.size} different IP addresses`,
      severity: uniqueIPs.size > 6 ? 'high' : 'medium'
    });
  }
  
  if (uniqueDevices.size > 2) {
    flags.push({
      type: 'multiple_devices',
      description: `Orders from ${uniqueDevices.size} different devices`,
      severity: uniqueDevices.size > 4 ? 'high' : 'medium'
    });
  }
  
  return { recentOrders, flags };
};

orderSchema.methods.requireAdminApproval = function(reason = 'Security review required') {
  this.requiresApproval = true;
  this.adminApproval.status = 'pending';
  this.adminApproval.reason = reason;
  return this;
};

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

// Method to restore product stock when order is cancelled
orderSchema.methods.restoreStock = async function() {
  const Product = mongoose.model('Product');
  
  for (const item of this.items) {
    const product = await Product.findById(item.product);
    if (product) {
      // Restore the stock quantity
      product.totalQty += item.quantity;
      await product.save();
      
      console.log(`Stock restored for ${product.name}: ${product.totalQty - item.quantity} -> ${product.totalQty}`);
    } else {
      console.warn(`Product not found for stock restoration: ${item.name}`);
    }
  }
};

// Method to create order from cart with enhanced fraud detection
orderSchema.statics.createFromCart = async function(cart, paymentMethod, securityInfo, notes = '', specialInstructions = '') {
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
  
  // Check enhanced fraud history before creating order
  const fraudCheck = await this.checkUserFraudHistory(cart.uid, securityInfo);
  
  // Update product stock quantities
  const Product = mongoose.model('Product');
  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product not found: ${item.name}`);
    }
    
    // Check if sufficient stock is available
    if (product.totalQty < item.quantity) {
      throw new Error(`Insufficient stock for ${item.name}. Available: ${product.totalQty}, Requested: ${item.quantity}`);
    }
    
    // Decrease the stock quantity
    product.totalQty -= item.quantity;
    await product.save();
    
    console.log(`Stock updated for ${product.name}: ${product.totalQty + item.quantity} -> ${product.totalQty}`);
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
  
  // Run enhanced fraud detection
  const fraudFlags = order.detectFraud(securityInfo);
  
  // Add historical fraud flags and merge all flags
  const allFraudFlags = [...fraudFlags, ...fraudCheck.flags];
  
  if (allFraudFlags.length > 0) {
    order.suspiciousFlags = allFraudFlags;
    
    // Require approval based on severity - ANY medium+ severity triggers review
    const requiresReview = allFraudFlags.some(flag => 
      ['medium', 'high', 'critical'].includes(flag.severity)
    );
    
    if (requiresReview) {
      order.requiresApproval = true;
      order.adminApproval.status = 'pending';
      
      console.log(`🚨 Order ${order.orderNumber} flagged for review:`, 
        allFraudFlags.map(f => `${f.type} (${f.severity})`).join(', ')
      );
    }
  }
  
  await order.save();
  
  return { order, fraudFlags: allFraudFlags };
};

module.exports = mongoose.model('Order', orderSchema);
