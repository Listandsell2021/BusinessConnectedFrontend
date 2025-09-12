// Invoice Model - Income & Billing Management
const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['moving', 'cleaning'],
    required: true
  },
  // Billing Period
  billingPeriod: {
    from: { type: Date, required: true },
    to: { type: Date, required: true }
  },
  // Invoice Items (leads)
  items: [{
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    description: String,
    amount: { type: Number, required: true },
    date: { type: Date, required: true }
  }],
  // Financial Details
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  // Dates
  issuedAt: Date,
  dueAt: Date,
  paidAt: Date,
  // Payment Details
  paymentMethod: String,
  paymentReference: String,
  // Notes
  notes: String
}, {
  timestamps: true
});

// Generate invoice number
InvoiceSchema.pre('save', function(next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.invoiceNumber = `INV-${year}${month}-${random}`;
  }
  next();
});

// Indexes
InvoiceSchema.index({ partnerId: 1 });
InvoiceSchema.index({ serviceType: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);