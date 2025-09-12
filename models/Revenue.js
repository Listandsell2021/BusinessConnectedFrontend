const mongoose = require('mongoose');

const RevenueSchema = new mongoose.Schema({
  // Reference to Lead
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  
  // Partner Information
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  
  // Service Type
  serviceType: {
    type: String,
    enum: ['moving', 'cleaning'],
    required: true
  },
  
  // Financial Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Commission/Fee earned by platform
  commission: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Net revenue (amount - commission)
  netRevenue: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Revenue Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'paid', 'cancelled'],
    default: 'pending'
  },
  
  // Currency
  currency: {
    type: String,
    default: 'EUR'
  },
  
  // Revenue Date (when the service was completed/revenue earned)
  revenueDate: {
    type: Date,
    default: Date.now
  },
  
  // Customer Information (for quick access)
  customer: {
    name: String,
    email: String,
    city: String
  },
  
  // Invoice Reference
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  
  // Payment Information
  paymentDate: Date,
  paymentMethod: String,
  paymentReference: String,
  
  // Metadata
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate net revenue before saving
RevenueSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('commission')) {
    this.netRevenue = this.amount - this.commission;
  }
  next();
});

// Indexes for better query performance
RevenueSchema.index({ leadId: 1 });
RevenueSchema.index({ partnerId: 1 });
RevenueSchema.index({ serviceType: 1 });
RevenueSchema.index({ status: 1 });
RevenueSchema.index({ revenueDate: -1 });
RevenueSchema.index({ createdAt: -1 });

// Compound indexes
RevenueSchema.index({ serviceType: 1, status: 1, revenueDate: -1 });
RevenueSchema.index({ partnerId: 1, serviceType: 1, status: 1 });

module.exports = mongoose.model('Revenue', RevenueSchema);