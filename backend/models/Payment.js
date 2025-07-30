const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // SSLCommerz Transaction Info
  tran_id: { type: String, required: true, unique: true },
  val_id: { type: String }, // Validation ID from SSLCommerz
  
  // Order Reference
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String, required: true },
  
  // Payment Details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  
  // Customer Info
  cus_name: { type: String, required: true },
  cus_email: { type: String, required: true },
  cus_phone: { type: String, required: true },
  cus_add1: { type: String, required: true },
  cus_city: { type: String, required: true },
  cus_country: { type: String, default: 'Bangladesh' },
  
  // Payment Status
  status: { 
    type: String, 
    enum: ['PENDING', 'VALID', 'FAILED', 'CANCELLED', 'UNATTEMPTED'],
    default: 'PENDING'
  },
  
  // SSLCommerz Response Data
  bank_tran_id: { type: String },
  card_type: { type: String },
  card_no: { type: String },
  card_issuer: { type: String },
  card_brand: { type: String },
  card_issuer_country: { type: String },
  card_issuer_country_code: { type: String },
  
  // Gateway Info
  gateway: { type: String }, // e.g., 'BKASH', 'NAGAD', 'ROCKET', etc.
  risk_level: { type: String },
  risk_title: { type: String },
  
  // Timestamps
  tran_date: { type: Date },
  
  // Raw Response
  sslcz_response: { type: Object }, // Store full SSLCommerz response
  validationData: { type: Object }, // Store validation response data
  
  // Internal tracking
  initiated_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
paymentSchema.index({ tran_id: 1 }, { unique: true });
paymentSchema.index({ order_id: 1 });
paymentSchema.index({ orderNumber: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ initiated_at: -1 });

// Generate unique transaction ID
paymentSchema.statics.generateTransactionId = function(orderNumber) {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `TXN-${orderNumber}-${timestamp}-${random}`;
};

// Update payment status
paymentSchema.methods.updatePaymentStatus = function(status, sslczResponse = {}) {
  this.status = status;
  this.sslcz_response = sslczResponse;
  this.validationData = sslczResponse; // Store for later reference
  
  // Extract relevant fields from SSLCommerz response
  if (sslczResponse.val_id) this.val_id = sslczResponse.val_id;
  if (sslczResponse.bank_tran_id) this.bank_tran_id = sslczResponse.bank_tran_id;
  if (sslczResponse.card_type) this.card_type = sslczResponse.card_type;
  if (sslczResponse.card_no) this.card_no = sslczResponse.card_no;
  if (sslczResponse.card_issuer) this.card_issuer = sslczResponse.card_issuer;
  if (sslczResponse.card_brand) this.card_brand = sslczResponse.card_brand;
  if (sslczResponse.card_issuer_country) this.card_issuer_country = sslczResponse.card_issuer_country;
  if (sslczResponse.card_issuer_country_code) this.card_issuer_country_code = sslczResponse.card_issuer_country_code;
  if (sslczResponse.APIConnect) this.gateway = sslczResponse.APIConnect;
  if (sslczResponse.risk_level) this.risk_level = sslczResponse.risk_level;
  if (sslczResponse.risk_title) this.risk_title = sslczResponse.risk_title;
  if (sslczResponse.tran_date) this.tran_date = new Date(sslczResponse.tran_date);
  
  if (status === 'VALID') {
    this.completed_at = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
