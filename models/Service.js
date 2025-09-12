const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'email', 'number', 'select', 'boolean', 'array', 'date']
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    type: String
  }] // For select type fields
});

const serviceSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true,
    unique: true
  },
  providerCount: {
    type: Number,
    default: 0
  },
  fields: [fieldSchema],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

serviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static methods
serviceSchema.statics.getByType = function(serviceType) {
  return this.findOne({ type: serviceType, active: true });
};

serviceSchema.statics.getByDomain = function(domain) {
  return this.findOne({ domain: domain, active: true });
};

serviceSchema.statics.getAllActive = function() {
  return this.find({ active: true }).sort({ name: 1 });
};

module.exports = mongoose.model('Service', serviceSchema);