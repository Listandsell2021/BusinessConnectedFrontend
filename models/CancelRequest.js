const mongoose = require('mongoose');

const CancelRequestSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  reason: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Indexes for performance
CancelRequestSchema.index({ lead: 1, partner: 1 }, { unique: true });
CancelRequestSchema.index({ status: 1 });
CancelRequestSchema.index({ requestedAt: -1 });
CancelRequestSchema.index({ partner: 1 });

// Virtual to check if request is still pending
CancelRequestSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// Method to approve cancel request
CancelRequestSchema.methods.approve = function(adminId, notes = null) {
  this.status = 'approved';
  this.processedAt = new Date();
  this.processedBy = adminId;
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

// Method to reject cancel request
CancelRequestSchema.methods.reject = function(adminId, notes = null) {
  this.status = 'rejected';
  this.processedAt = new Date();
  this.processedBy = adminId;
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

// Static method to get pending requests
CancelRequestSchema.statics.getPendingRequests = function() {
  return this.find({ status: 'pending' })
    .populate('lead', 'leadId serviceType createdAt')
    .populate('partner', 'companyName contactPerson.email')
    .sort({ requestedAt: -1 });
};

// Static method to check if partner has pending request for lead
CancelRequestSchema.statics.hasPendingRequest = function(leadId, partnerId) {
  return this.findOne({
    lead: leadId,
    partner: partnerId,
    status: 'pending'
  });
};

module.exports = mongoose.model('CancelRequest', CancelRequestSchema);