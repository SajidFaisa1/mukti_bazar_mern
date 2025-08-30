const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    uid: { type: String },
    storeId: { type: String, unique: true },
    sellerName: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    businessName: { type: String, required: true },
    
    // Address information (updated structure)
    address: { 
      type: Object, 
      default: { 
        division: '', 
        district: '', 
        union: '',
        // Legacy fields for backward compatibility
        region: '', 
        city: ''
      } 
    },
    
    // Document storage
    farmingLicense: { type: Object, default: {} },
    kycDocument: { type: Object, default: {} },
    shopLogo: { type: Object, default: {} },
    
    // Enhanced business verification fields
    businessRegistrationNumber: { type: String, default: '' },
    taxIdentificationNumber: { type: String, default: '' },
    businessType: { 
      type: String, 
      enum: ['farmer', 'cooperative', 'wholesaler', 'processor', 'retailer', 'exporter', 'supplier', ''],
      default: '' 
    },
    yearsInBusiness: { type: Number, default: 0 },
    expectedMonthlyVolume: { 
      type: String,
      enum: ['under-10k', '10k-50k', '50k-200k', '200k-500k', '500k-1m', 'over-1m', ''],
      default: ''
    },
    primaryProducts: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    
    // Banking information for secure payments
    bankAccountDetails: {
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      branchName: { type: String, default: '' },
      routingNumber: { type: String, default: '' }
    },
    
    // Social media and contact information
    socialMediaLinks: {
      facebook: { type: String, default: '' },
      website: { type: String, default: '' },
      whatsapp: { type: String, default: '' }
    },
    
    // Business description
    description: { type: String, default: '' },
    
    // Security and fraud prevention data
    securityInfo: {
      deviceFingerprint: { type: String, default: '' },
      deviceDetails: {
        userAgent: { type: String, default: '' },
        platform: { type: String, default: '' },
        language: { type: String, default: '' },
        timezone: { type: String, default: '' },
        screen: { type: Object, default: {} }
      },
      ipAddress: { type: String, default: '' },
      riskScore: { type: Number, default: 0, min: 0, max: 100 },
      automationDetected: { type: Boolean, default: false },
      fingerprintComponents: {
        canvas: { type: Boolean, default: false },
        webgl: { type: Boolean, default: false },
        audio: { type: Boolean, default: false },
        fonts: { type: Number, default: 0 },
        plugins: { type: Number, default: 0 }
      },
      locationData: { type: Object, default: {} },
      connectionInfo: { type: Object, default: {} },
      submissionTime: { type: Date, default: Date.now }
    },
    
    // Verification and approval system
    verificationLevel: {
      type: String,
      enum: ['low_risk', 'medium_risk', 'high_risk'],
      default: 'medium_risk'
    },
    requiresManualReview: { type: Boolean, default: false },
    adminReviewNotes: { type: String, default: '' },
    approvedBy: { type: String, default: '' }, // Admin UID who approved
    approvedAt: { type: Date },
    rejectionReason: { type: String, default: '' },
    
    // Original fields
    role: { type: String, default: 'vendor' },
    isApproved: { type: Boolean, default: false },
    isSubmitted: { type: Boolean, default: false }, // New field to track profile submission
    profileCompleted: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    featuredCredit: { type: Number, default: 3 },
    
    // Enhanced status tracking
    verificationStatus: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
      default: 'pending'
    },
    lastSecurityCheck: { type: Date, default: Date.now },
    fraudFlags: { type: [String], default: [] }, // Array of fraud indicators
    trustScore: { type: Number, default: 50, min: 0, max: 100 } // Overall trust score

  },
  { timestamps: true }
);

// Virtual for getting full verification status
vendorSchema.virtual('fullVerificationStatus').get(function() {
  const requiredFields = [
    'businessName', 'businessRegistrationNumber', 'taxIdentificationNumber',
    'businessType', 'phone', 'address.division', 'address.district'
  ];
  
  const completedFields = requiredFields.filter(field => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      return this[parent] && this[parent][child] && this[parent][child].trim() !== '';
    }
    return this[field] && this[field].toString().trim() !== '';
  });

  const completionPercentage = (completedFields.length / requiredFields.length) * 100;
  
  return {
    completed: completionPercentage === 100,
    percentage: Math.round(completionPercentage),
    missingFields: requiredFields.filter(field => !completedFields.includes(field)),
    riskLevel: this.verificationLevel,
    trustScore: this.trustScore,
    requiresReview: this.requiresManualReview
  };
});

// Method to calculate verification level based on various factors
vendorSchema.methods.calculateVerificationLevel = function() {
  let riskScore = this.securityInfo.riskScore || 0;
  
  // Additional risk factors
  if (this.securityInfo.automationDetected) riskScore += 20;
  if (this.yearsInBusiness < 1) riskScore += 15;
  if (this.expectedMonthlyVolume === 'over-1m') riskScore += 10;
  if (!this.businessRegistrationNumber) riskScore += 25;
  if (!this.taxIdentificationNumber) riskScore += 20;
  if (this.fraudFlags.length > 0) riskScore += (this.fraudFlags.length * 15);
  
  // Positive factors (reduce risk)
  if (this.yearsInBusiness >= 5) riskScore -= 10;
  if (this.certifications.length > 0) riskScore -= 5;
  if (this.socialMediaLinks.facebook || this.socialMediaLinks.website) riskScore -= 5;
  
  // Ensure score is within bounds
  riskScore = Math.max(0, Math.min(100, riskScore));
  
  if (riskScore <= 30) {
    this.verificationLevel = 'low_risk';
    this.requiresManualReview = false;
  } else if (riskScore <= 60) {
    this.verificationLevel = 'medium_risk';
    this.requiresManualReview = true;
  } else {
    this.verificationLevel = 'high_risk';
    this.requiresManualReview = true;
  }
  
  // Update trust score (inverse of risk)
  this.trustScore = 100 - riskScore;
  
  return this.verificationLevel;
};

// Method to update security information
vendorSchema.methods.updateSecurityInfo = function(securityData) {
  this.securityInfo = {
    ...this.securityInfo,
    ...securityData,
    submissionTime: new Date()
  };
  
  // Recalculate verification level
  this.calculateVerificationLevel();
  this.lastSecurityCheck = new Date();
  
  return this.save();
};

// Method to add fraud flag
vendorSchema.methods.addFraudFlag = function(flagType, reason) {
  const flag = `${flagType}: ${reason}`;
  if (!this.fraudFlags.includes(flag)) {
    this.fraudFlags.push(flag);
    this.calculateVerificationLevel(); // Recalculate risk
  }
  return this.save();
};

// Method to clear fraud flags (admin action)
vendorSchema.methods.clearFraudFlags = function() {
  this.fraudFlags = [];
  this.calculateVerificationLevel(); // Recalculate risk
  return this.save();
};

// Method to submit profile for review
vendorSchema.methods.submitProfile = function() {
  this.isSubmitted = true;
  this.profileCompleted = true;
  this.verificationStatus = this.requiresManualReview ? 'under_review' : 'under_review';
  return this.save();
};

// Pre-save middleware to ensure verification level is calculated
vendorSchema.pre('save', function(next) {
  if (this.isModified('securityInfo') || this.isModified('fraudFlags') || this.isNew) {
    this.calculateVerificationLevel();
  }
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);
