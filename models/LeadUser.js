const mongoose = require('mongoose');

const LeadUserSchema = new mongoose.Schema({
  salutation: {
    type: String,
    enum: ['mister', 'women', 'other'],
    default: 'mister'
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  bestReachTime: {
    type: String,
    enum: ['8-12', '12-16', '16-20', 'any_time'],
    default: 'any_time'
  },
  consent: {
    type: Boolean,
    required: true,
    default: false
  },
  // Track lead count for this user
  totalLeads: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
LeadUserSchema.index({ email: 1 });
LeadUserSchema.index({ phone: 1 });
LeadUserSchema.index({ createdAt: -1 });

// Compound index for searching
LeadUserSchema.index({ firstName: 1, lastName: 1 });

// Get full name virtual
LeadUserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('LeadUser', LeadUserSchema);