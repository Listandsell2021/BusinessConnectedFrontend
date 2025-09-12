// Lead Model - Dynamic and Flexible

const mongoose = require('mongoose');

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
  // Lead Status Management
  status: {
    type: String,
    enum: ['pending', 'assigned', 'accepted', 'cancelled', 'completed'],
    default: 'pending'
  },
  assignedPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    default: null
  },
  assignedAt: Date,
  acceptedAt: Date,
  // Cancellation
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
  // Pricing
  estimatedValue: {
    type: Number,
    default: 0
  },
  actualValue: Number,
  // Location data for partner matching and service delivery
  location: {
    // Legacy single location field - keep for backward compatibility
    city: String,
    country: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  // Enhanced location data for moving service
  pickupLocation: {
    address: String,
    city: String,
    country: { type: String, default: 'Germany' },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  destinationLocation: {
    address: String,
    city: String,
    country: { type: String, default: 'Germany' },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  // Service location context for different service types
  serviceLocation: {
    // For cleaning service - single service address
    serviceAddress: String,
    city: String,
    country: { type: String, default: 'Germany' },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
LeadSchema.index({ serviceType: 1, status: 1 });
LeadSchema.index({ assignedPartner: 1 });
LeadSchema.index({ 'user.email': 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ leadId: 1 }, { unique: true });

// Generate unique lead ID with timestamp-based approach
LeadSchema.pre('save', function(next) {
  if (!this.leadId) {
    const servicePrefix = this.serviceType === 'moving' ? 'MOV' : 
                        this.serviceType === 'cleaning' ? 'CLN' : 'CAN';
    
    // Generate ID with date + random component for better uniqueness
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = year + month + day;
    
    // Add 4-character random string for uniqueness
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    this.leadId = `${servicePrefix}-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Lead', LeadSchema);