const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');

// @desc    Get all invoices (Superadmin)
// @route   GET /api/invoices
// @access  Private (Superadmin)
const getAllInvoices = async (req, res) => {
  try {
    const {
      partnerId,
      serviceType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (partnerId) filter.partnerId = partnerId;
    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter)
      .populate('partnerId', 'companyName contactPerson.email')
      .populate('items.leadId', 'leadId serviceType user.firstName user.lastName')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get invoices', 
      error: error.message 
    });
  }
};

// @desc    Get partner invoices
// @route   GET /api/invoices/partner/:partnerId
// @access  Private (Partner/Superadmin)
const getPartnerInvoices = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Partners can only see their own invoices
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const filter = { partnerId };
    if (status) filter.status = status;

    const invoices = await Invoice.find(filter)
      .populate('items.leadId', 'leadId serviceType')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get partner invoices', 
      error: error.message 
    });
  }
};

// @desc    Generate invoice for partner
// @route   POST /api/invoices/generate
// @access  Private (Superadmin)
const generateInvoice = async (req, res) => {
  try {
    const { partnerId, serviceType, billingPeriod } = req.body;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ 
        success: false,
        message: 'Partner not found' 
      });
    }

    // Get accepted leads for billing period
    const leads = await Lead.find({
      assignedPartner: partnerId,
      serviceType,
      status: 'accepted',
      acceptedAt: {
        $gte: new Date(billingPeriod.from),
        $lte: new Date(billingPeriod.to)
      }
    });

    if (leads.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No accepted leads found for billing period' 
      });
    }

    // Calculate invoice items and totals
    const items = leads.map(lead => ({
      leadId: lead._id,
      description: `Lead ${lead.leadId} - ${lead.user.firstName} ${lead.user.lastName}`,
      amount: lead.actualValue || lead.estimatedValue || 50, // Default amount if not set
      date: lead.acceptedAt
    }));

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.19; // 19% VAT (adjust as needed)
    const total = subtotal + tax;

    // Create invoice
    const invoice = new Invoice({
      partnerId,
      serviceType,
      billingPeriod,
      items,
      subtotal,
      tax,
      total,
      status: 'draft',
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate invoice', 
      error: error.message 
    });
  }
};

// @desc    Update invoice status
// @route   PUT /api/invoices/:invoiceId/status
// @access  Private (Superadmin)
const updateInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status, paymentMethod, paymentReference } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ 
        success: false,
        message: 'Invoice not found' 
      });
    }

    invoice.status = status;
    
    if (status === 'paid') {
      invoice.paidAt = new Date();
      if (paymentMethod) invoice.paymentMethod = paymentMethod;
      if (paymentReference) invoice.paymentReference = paymentReference;
    }

    await invoice.save();

    res.json({
      success: true,
      message: `Invoice ${status} successfully`,
      invoice
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update invoice status', 
      error: error.message 
    });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:invoiceId
// @access  Private (Partner/Superadmin)
const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId)
      .populate('partnerId', 'companyName contactPerson')
      .populate('items.leadId', 'leadId serviceType user')
      .exec();

    if (!invoice) {
      return res.status(404).json({ 
        success: false,
        message: 'Invoice not found' 
      });
    }

    // Partners can only see their own invoices
    if (req.user.role === 'partner' && invoice.partnerId._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get invoice', 
      error: error.message 
    });
  }
};

// @desc    Get revenue summary
// @route   GET /api/invoices/revenue/summary
// @access  Private (Superadmin)
const getRevenueSummary = async (req, res) => {
  try {
    const { serviceType, period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const filter = { createdAt: { $gte: startDate, $lte: endDate } };
    if (serviceType) filter.serviceType = serviceType;

    // Get revenue summary
    const [totalRevenue, paidRevenue, pendingRevenue, monthlyRevenue] = await Promise.all([
      Invoice.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: { ...filter, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: { ...filter, status: { $in: ['sent', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: '$total' },
            invoiceCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        paidRevenue: paidRevenue[0]?.total || 0,
        pendingRevenue: pendingRevenue[0]?.total || 0,
        monthlyTrend: monthlyRevenue
      },
      period: { startDate, endDate }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get revenue summary', 
      error: error.message 
    });
  }
};

// @desc    Download invoice as PDF
// @route   GET /api/invoices/:invoiceId/download
// @access  Private (Partner/Superadmin)
const downloadInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId)
      .populate('partnerId', 'companyName contactPerson address')
      .populate('items.leadId', 'leadId serviceType user')
      .exec();

    if (!invoice) {
      return res.status(404).json({ 
        success: false,
        message: 'Invoice not found' 
      });
    }

    // Partners can only download their own invoices
    if (req.user.role === 'partner' && invoice.partnerId._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    
    // Generate simple PDF content (in production, use a proper PDF library like PDFKit)
    const pdfContent = generateInvoicePDF(invoice);
    
    res.send(Buffer.from(pdfContent, 'utf-8'));
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to download invoice', 
      error: error.message 
    });
  }
};

// Helper function to generate PDF content (simplified version)
const generateInvoicePDF = (invoice) => {
  // In production, use proper PDF generation library like PDFKit or Puppeteer
  // This is a simplified text-based version
  const content = `
INVOICE: ${invoice.invoiceNumber}
Date: ${invoice.createdAt.toLocaleDateString()}
Due Date: ${invoice.dueDate.toLocaleDateString()}

BILL TO:
${invoice.partnerId.companyName}
${invoice.partnerId.contactPerson.firstName} ${invoice.partnerId.contactPerson.lastName}
${invoice.partnerId.contactPerson.email}

PERIOD: ${invoice.billingPeriod.startDate.toLocaleDateString()} - ${invoice.billingPeriod.endDate.toLocaleDateString()}

ITEMS:
${invoice.items.map(item => 
  `Lead ID: ${item.leadId?.leadId || item.description} - €${item.amount}`
).join('\n')}

SUBTOTAL: €${invoice.subtotal}
TAX (${invoice.taxRate}%): €${invoice.taxAmount}
TOTAL: €${invoice.total}

STATUS: ${invoice.status.toUpperCase()}
${invoice.paidAt ? `PAID ON: ${invoice.paidAt.toLocaleDateString()}` : ''}
  `;
  
  return content;
};

module.exports = {
  getAllInvoices,
  getPartnerInvoices,
  generateInvoice,
  updateInvoiceStatus,
  getInvoiceById,
  getRevenueSummary,
  downloadInvoice
};