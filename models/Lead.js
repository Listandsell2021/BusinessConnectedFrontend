// Lead Model - Multi-Partner Support

const mongoose = require('mongoose');

// Partner assignment sub-schema
const PartnerAssignmentSchema = new mongoose.Schema({
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected','cancellationRequested', 'cancelled'],
    default: 'pending'
  },
  acceptedAt: Date,
  rejectedAt: Date,
  cancellationRequested: {
    type: Boolean,
    default: false
  },
  cancellationReason: String,
  cancellationRequestedAt: Date,
  cancellationApproved: {
    type: Boolean,
    default: false
  },
  cancellationApprovedAt: Date,
  cancellationRejected: {
    type: Boolean,
    default: false
  },
  cancellationRejectionReason: String,
  cancellationRejectedAt: Date,
  // Lead pricing at time of assignment
  leadPrice: {
    type: Number,
    required: true,
    min: 0
  },
  partnerType: {
    type: String,
    enum: ['basic', 'exclusive'],
    required: true
  }
}, {
  _id: false
});

const LeadSchema = new mongoose.Schema({
  leadId: {
    type: String
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['moving', 'cleaning', 'cancellation'] // Easy to extend
  },
  moveType: {
    type: String,
    enum: ['private', 'business', 'long_distance', 'special_transport'],
    required: function() { return this.serviceType === 'moving'; }
  },
  sourceDomain: {
    type: String,
    required: true
  },
  // User Information - Reference to LeadUser model
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadUser',
    required: true
  },
  // Dynamic form data - stores all form fields
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Multi-Partner Assignment System
  partnerAssignments: [PartnerAssignmentSchema],

  // Overall lead status (calculated from partner assignments)
  status: {
    type: String,
    enum: ['pending', 'partial_assigned', 'assigned', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  // Service location context for different service types
  serviceLocation: {
    // For cleaning service - single service address only
    serviceAddress: String,
    city: String,
    country: { type: String, default: 'Germany' },
    postalCode: String,
    coordinates: {
      lat: { type: Number, required: function() { return this.serviceType === 'cleaning'; } },
      lng: { type: Number, required: function() { return this.serviceType === 'cleaning'; } }
    }
  },
  
  // Actual service value (removed estimatedValue)
  actualValue: Number
}, {
  timestamps: true
});

// Indexes for better performance
LeadSchema.index({ serviceType: 1 });
LeadSchema.index({ 'partnerAssignments.partner': 1 });
LeadSchema.index({ 'partnerAssignments.status': 1 });
LeadSchema.index({ user: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ leadId: 1 }, { unique: true });
LeadSchema.index({ 'serviceLocation.coordinates': '2dsphere' });

// Generate shorter unique lead ID with proper naming
LeadSchema.pre('save', function(next) {
  if (!this.leadId) {
    const servicePrefix = this.serviceType === 'moving' ? 'MOVE' : 
                        this.serviceType === 'cleaning' ? 'CLEAN' : 'CAN';
    
    // Generate short random 4-digit number for uniqueness
    const random = Math.floor(1000 + Math.random() * 9000);
    
    this.leadId = `${servicePrefix}-${random}`;
  }
  next();
});

// Virtual to get active partner assignments
LeadSchema.virtual('activePartnerAssignments').get(function() {
  return this.partnerAssignments.filter(assignment => 
    assignment.status === 'pending' || assignment.status === 'accepted'
  );
});

// Virtual to check if lead is fully accepted
LeadSchema.virtual('isFullyAccepted').get(function() {
  return this.partnerAssignments.length > 0 && 
         this.partnerAssignments.every(assignment => assignment.status === 'accepted');
});

// Virtual to get overall status based on partner assignments
LeadSchema.virtual('overallStatus').get(function() {
  if (this.partnerAssignments.length === 0) {
    return 'pending';
  }
  
  const statuses = this.partnerAssignments.map(a => a.status);
  
  if (statuses.every(s => s === 'accepted')) {
    return 'accepted';
  } else if (statuses.every(s => s === 'cancelled' || s === 'rejected')) {
    return 'cancelled';
  } else if (statuses.some(s => s === 'accepted')) {
    return 'partially_assigned';
  } else {
    return 'fully_assigned';
  }
});

// Virtual to get pickup location from formData
LeadSchema.virtual('pickupLocation').get(function() {
  return this.formData?.pickupAddress || null;
});

// Virtual to get destination location from formData
LeadSchema.virtual('destinationLocation').get(function() {
  return this.formData?.destinationAddress || null;
});

// Method to assign partner to lead
LeadSchema.methods.assignPartner = function(partnerId, leadPrice, partnerType) {
  // Check if partner is already assigned
  const existingAssignment = this.partnerAssignments.find(
    assignment => assignment.partner.toString() === partnerId.toString()
  );

  if (existingAssignment) {
    return false; // Partner already assigned
  }

  this.partnerAssignments.push({
    partner: partnerId,
    status: 'pending',
    leadPrice: leadPrice,
    partnerType: partnerType
  });

  // Note: overallStatus is now a virtual field
  
  return true;
};

// Method to update partner assignment status
LeadSchema.methods.updatePartnerStatus = function(partnerId, status, reason = null) {
  const assignment = this.partnerAssignments.find(
    assignment => assignment.partner.toString() === partnerId.toString()
  );
  
  if (!assignment) {
    return false; // Partner not found
  }
  
  assignment.status = status;
  
  if (status === 'accepted') {
    assignment.acceptedAt = new Date();
  } else if (status === 'rejected') {
    assignment.rejectedAt = new Date();
  } else if (status === 'cancelled') {
    assignment.cancellationRequested = true;
    assignment.cancellationReason = reason;
    assignment.cancellationRequestedAt = new Date();
  }
  
  // Note: overallStatus is now a virtual field
  
  return true;
};


module.exports = mongoose.model('Lead', LeadSchema);