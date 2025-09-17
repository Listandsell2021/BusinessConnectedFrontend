// Partner Model - MVC Architecture
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PartnerSchema = new mongoose.Schema({
  partnerId: {
    type: String,
    unique: true,
    index: true
  },
  // Partner Profile
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  // Address Information
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String },
    country: { type: String, default: '' }
  },
  // Partner Type
  partnerType: {
    type: String,
    enum: ['basic', 'exclusive'],
    default: 'basic'
  },
  // Single service per partner document
  serviceType: {
    type: String,
    enum: ['moving', 'cleaning'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'rejected'],
    default: 'pending'
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedReason: String,
  // Service-specific preferences
  preferences: {
    // Moving service preferences - pickup and destination directly under preferences
    pickup: {
      serviceArea: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    destination: {
      serviceArea: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    // Cleaning service preferences - same structure as moving service
    cleaning: {
      serviceArea: { type: mongoose.Schema.Types.Mixed, default: {} } // Same structure as pickup/destination
    }
  },
  // Performance Metrics
  metrics: {
    totalLeadsReceived: { type: Number, default: 0 },
    totalLeadsAccepted: { type: Number, default: 0 },
    totalLeadsCancelled: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // minutes
    rating: { type: Number, default: 0, min: 0, max: 5 }
  },
  // Notification Settings
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  // Authentication
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  lastLogin: Date,
  // Registration
  registeredAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
PartnerSchema.index({ 'contactPerson.email': 1, serviceType: 1 }); // Compound index for email+service uniqueness
PartnerSchema.index({ status: 1 });
PartnerSchema.index({ partnerType: 1 });
PartnerSchema.index({ serviceType: 1 });
PartnerSchema.index({ companyName: 1, serviceType: 1 }); // Compound index for company+service

// Generate unique partner ID with service type
PartnerSchema.pre('save', function(next) {
  if (!this.partnerId) {
    const typePrefix = this.partnerType === 'exclusive' ? 'EXC' : 'BAS';
    const servicePrefix = this.serviceType === 'moving' ? 'MOV' : 'CLN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    this.partnerId = `PTR${typePrefix}${servicePrefix}${random}`;
  }
  next();
});

// Hash password before saving
PartnerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
PartnerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for acceptance rate
PartnerSchema.virtual('acceptanceRate').get(function() {
  if (this.metrics.totalLeadsReceived === 0) return 0;
  return (this.metrics.totalLeadsAccepted / this.metrics.totalLeadsReceived) * 100;
});

// Static method to find all services for a partner (by email)
PartnerSchema.statics.findAllServicesForPartner = function(email) {
  return this.find({ 'contactPerson.email': email });
};

// Static method to find partners by company name
PartnerSchema.statics.findByCompanyName = function(companyName) {
  return this.find({ companyName: companyName });
};

// Static method to check if partner already has a specific service
PartnerSchema.statics.hasExistingService = async function(email, serviceType) {
  const existing = await this.findOne({ 
    'contactPerson.email': email, 
    serviceType: serviceType,
    status: { $ne: 'rejected' } // Allow re-registration if previously rejected
  });
  return !!existing;
};

module.exports = mongoose.model('Partner', PartnerSchema);