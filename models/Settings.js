const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // Pricing Settings
  pricing: {
    moving: {
      basic: {
        perLeadPrice: {
          type: Number,
          required: true,
          default: 25,
          min: 1
        }
      },
      exclusive: {
        perLeadPrice: {
          type: Number,
          required: true,
          default: 30,
          min: 1
        }
      }
    },
    cleaning: {
      basic: {
        perLeadPrice: {
          type: Number,
          required: true,
          default: 15,
          min: 1
        }
      },
      exclusive: {
        perLeadPrice: {
          type: Number,
          required: true,
          default: 20,
          min: 1
        }
      }
    }
  },
  
  // Lead Distribution Settings
  leadDistribution: {
    moving: {
      basic: {
        leadsPerWeek: {
          type: Number,
          default: 3,
          min: 1,
          max: 50
        }
      },
      exclusive: {
        leadsPerWeek: {
          type: Number,
          default: 8,
          min: 1,
          max: 50
        }
      }
    },
    cleaning: {
      basic: {
        leadsPerWeek: {
          type: Number,
          default: 5,
          min: 1,
          max: 50
        }
      },
      exclusive: {
        leadsPerWeek: {
          type: Number,
          default: 12,
          min: 1,
          max: 50
        }
      }
    }
  },
  
  // General System Settings
  system: {
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP']
    },
    taxRate: {
      type: Number,
      default: 19,
      min: 0,
      max: 100
    },
    leadAssignmentMethod: {
      type: String,
      default: 'round_robin',
      enum: ['round_robin', 'nearest', 'random']
    },
    autoAcceptTimeout: {
      type: Number,
      default: 5,
      min: 1,
      max: 72
    },
    leadAcceptTimeout: {
      type: Number,
      default: 24,
      min: 1,
      max: 168
    },
    basicPartnerLeadLimit: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    cancellationTimeLimit: {
      type: Number,
      default: 2,
      min: 1,
      max: 72
    }
  },

  // Email Settings
  email: {
    leadNotificationEnabled: {
      type: Boolean,
      default: true
    },
    partnerNotificationEnabled: {
      type: Boolean,
      default: true
    },
    adminNotificationEnabled: {
      type: Boolean,
      default: true
    },
    incomeInvoiceNotificationEnabled: {
      type: Boolean,
      default: true
    }
  },

  // Metadata
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists (singleton pattern)
SettingsSchema.index({}, { unique: true });

// Static method to get or create settings
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema);