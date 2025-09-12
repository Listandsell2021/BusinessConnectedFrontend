// OTP Model for Password Reset Verification
const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['user', 'partner'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userType' // Dynamic reference based on userType
  },
  purpose: {
    type: String,
    enum: ['password_reset'],
    default: 'password_reset'
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3 // Maximum 3 attempts
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired documents
  }
}, {
  timestamps: true
});

// Indexes for performance
OTPSchema.index({ email: 1, purpose: 1 });
OTPSchema.index({ otp: 1, verified: 1 });
OTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 }); // 30 minutes TTL

// Method to generate 6-digit OTP
OTPSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Method to verify OTP
OTPSchema.methods.verifyOTP = function(inputOTP) {
  if (this.verified) {
    return { success: false, message: 'OTP already used' };
  }
  
  if (this.expiresAt < new Date()) {
    return { success: false, message: 'OTP expired' };
  }
  
  if (this.attempts >= 3) {
    return { success: false, message: 'Maximum attempts exceeded' };
  }
  
  this.attempts += 1;
  
  if (this.otp !== inputOTP) {
    return { success: false, message: 'Invalid OTP' };
  }
  
  this.verified = true;
  return { success: true, message: 'OTP verified successfully' };
};

module.exports = mongoose.model('OTP', OTPSchema);