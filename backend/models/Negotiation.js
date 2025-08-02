const mongoose = require('mongoose');

const negotiationSchema = new mongoose.Schema({
  // Participants
  buyerUid: {
    type: String,
    required: true
  },
  buyerRole: {
    type: String,
    enum: ['client', 'vendor'],
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'buyerModel',
    required: true
  },
  buyerModel: {
    type: String,
    enum: ['User', 'Vendor'],
    required: true
  },
  
  sellerUid: {
    type: String,
    required: true
  },
  sellerRole: {
    type: String,
    enum: ['vendor'],
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  
  // Product information
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productImage: {
    type: String
  },
  originalPrice: {
    type: Number,
    required: true
  },
  
  // Negotiation details
  currentPrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'accepted', 'rejected', 'expired', 'cancelled'],
    default: 'active'
  },
  
  // Offers history
  offers: [{
    fromUid: {
      type: String,
      required: true
    },
    fromRole: {
      type: String,
      enum: ['client', 'vendor'],
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    message: {
      type: String,
      maxlength: 500
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'countered'],
      default: 'pending'
    }
  }],
  
  // Conversation reference
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  
  // Final agreement details (when accepted)
  finalPrice: {
    type: Number
  },
  finalQuantity: {
    type: Number
  },
  finalTotalAmount: {
    type: Number
  },
  acceptedAt: {
    type: Date
  },
  acceptedBy: {
    type: String
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
negotiationSchema.index({ buyerUid: 1, status: 1 });
negotiationSchema.index({ sellerUid: 1, status: 1 });
negotiationSchema.index({ productId: 1, status: 1 });
negotiationSchema.index({ conversationId: 1 });
negotiationSchema.index({ expiresAt: 1 });
negotiationSchema.index({ status: 1, createdAt: -1 });

// Middleware to update totalAmount when price or quantity changes
negotiationSchema.pre('save', function(next) {
  if (this.isModified('currentPrice') || this.isModified('quantity')) {
    this.totalAmount = this.currentPrice * this.quantity;
  }
  
  // Set finalTotalAmount when accepted
  if (this.status === 'accepted' && this.finalPrice && this.finalQuantity) {
    this.finalTotalAmount = this.finalPrice * this.finalQuantity;
  }
  
  next();
});

// Static methods
negotiationSchema.statics.findActiveNegotiations = function(uid, role) {
  const query = {
    status: 'active',
    isActive: true,
    expiresAt: { $gt: new Date() }
  };
  
  if (role === 'vendor') {
    // Vendor can be both buyer and seller
    query.$or = [
      { buyerUid: uid },
      { sellerUid: uid }
    ];
  } else {
    // Client can only be buyer
    query.buyerUid = uid;
  }
  
  return this.find(query)
    .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType')
    .populate('buyer', 'name email businessName')
    .populate('seller', 'businessName email storeId')
    .sort({ createdAt: -1 });
};

negotiationSchema.statics.findByConversation = function(conversationId) {
  return this.find({ 
    conversationId: conversationId,
    isActive: true 
  })
    .populate('productId', 'name images unitPrice offerPrice minOrderQty unitType')
    .sort({ createdAt: -1 });
};

// Instance methods
negotiationSchema.methods.addOffer = function(fromUid, fromRole, price, quantity, message = '') {
  const totalAmount = price * quantity;
  
  this.offers.push({
    fromUid,
    fromRole,
    price,
    quantity,
    totalAmount,
    message,
    timestamp: new Date(),
    status: 'pending'
  });
  
  // Update current negotiation state
  this.currentPrice = price;
  this.quantity = quantity;
  this.totalAmount = totalAmount;
  
  return this.save();
};

negotiationSchema.methods.acceptOffer = function(acceptedByUid) {
  this.status = 'accepted';
  this.finalPrice = this.currentPrice;
  this.finalQuantity = this.quantity;
  this.finalTotalAmount = this.totalAmount;
  this.acceptedAt = new Date();
  this.acceptedBy = acceptedByUid;
  
  // Mark the last offer as accepted
  if (this.offers.length > 0) {
    this.offers[this.offers.length - 1].status = 'accepted';
  }
  
  return this.save();
};

negotiationSchema.methods.rejectOffer = function() {
  this.status = 'rejected';
  
  // Mark the last offer as rejected
  if (this.offers.length > 0) {
    this.offers[this.offers.length - 1].status = 'rejected';
  }
  
  return this.save();
};

negotiationSchema.methods.isParticipant = function(uid) {
  return this.buyerUid === uid || this.sellerUid === uid;
};

negotiationSchema.methods.getOtherParticipant = function(uid) {
  if (this.buyerUid === uid) {
    return {
      uid: this.sellerUid,
      role: this.sellerRole,
      user: this.seller
    };
  } else if (this.sellerUid === uid) {
    return {
      uid: this.buyerUid,
      role: this.buyerRole,
      user: this.buyer
    };
  }
  return null;
};

module.exports = mongoose.model('Negotiation', negotiationSchema);
