const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');
const BillingService = require('../services/billingService');

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
    const { partnerId, serviceType, billingPeriod, items } = req.body;

    if (!partnerId || !serviceType || !billingPeriod) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID, service type, and billing period are required'
      });
    }

    if (!billingPeriod.startDate || !billingPeriod.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Billing period must include startDate and endDate'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one lead must be selected for invoice generation'
      });
    }

    // Extract selected lead IDs from items array
    const selectedLeadIds = items.map(item => item.leadId);

    console.log('🎯 DEBUG - invoiceController.generateInvoice:', {
      partnerId,
      serviceType,
      itemsCount: items.length,
      selectedLeadIds: selectedLeadIds.map(id => id.toString ? id.toString() : String(id)),
      billingPeriodDates: `${billingPeriod.startDate} to ${billingPeriod.endDate}`
    });

    // Use billing service to generate invoice based on selected leads only
    const invoice = await BillingService.generatePartnerInvoice(
      partnerId,
      serviceType,
      billingPeriod,
      req.user.id,
      selectedLeadIds,  // Pass selected leads to limit invoice to these leads only
      items  // Pass the full items array with amounts for custom pricing
    );

    await invoice.populate('partnerId', 'companyName contactPerson.email');

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      invoice
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate invoice',
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
Date: ${invoice.createdAt.toLocaleDateString('de-DE')}
Due Date: ${invoice.dueDate.toLocaleDateString('de-DE')}

BILL TO:
${invoice.partnerId.companyName}
${invoice.partnerId.contactPerson.firstName} ${invoice.partnerId.contactPerson.lastName}
${invoice.partnerId.contactPerson.email}

PERIOD: ${invoice.billingPeriod.startDate.toLocaleDateString('de-DE')} - ${invoice.billingPeriod.endDate.toLocaleDateString('de-DE')}

ITEMS:
${invoice.items.map(item => 
  `Lead ID: ${item.leadId?.leadId || item.description} - €${item.amount}`
).join('\n')}

SUBTOTAL: €${invoice.subtotal}
TAX (${invoice.taxRate}%): €${invoice.taxAmount}
TOTAL: €${invoice.total}

STATUS: ${invoice.status.toUpperCase()}
${invoice.paidAt ? `PAID ON: ${invoice.paidAt.toLocaleDateString('de-DE')}` : ''}
  `;
  
  return content;
};

// @desc    Generate invoices for all eligible partners
// @route   POST /api/invoices/generate-bulk
// @access  Private (Superadmin)
const generateBulkInvoices = async (req, res) => {
  try {
    const { serviceType, billingPeriod } = req.body;

    if (!serviceType || !billingPeriod) {
      return res.status(400).json({
        success: false,
        message: 'Service type and billing period are required'
      });
    }

    if (!billingPeriod.startDate || !billingPeriod.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Billing period must include startDate and endDate'
      });
    }

    // Generate invoices for all eligible partners
    const invoices = await BillingService.generateBulkInvoices(
      serviceType,
      billingPeriod,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: `Generated ${invoices.length} invoices successfully`,
      invoices: invoices.map(inv => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        partnerId: inv.partnerId,
        total: inv.total,
        items: inv.items.length
      }))
    });

  } catch (error) {
    console.error('Error generating bulk invoices:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate bulk invoices',
      error: error.message
    });
  }
};

// @desc    Get billing-ready partners for a period
// @route   GET /api/invoices/billing-ready
// @access  Private (Superadmin)
const getBillingReadyPartners = async (req, res) => {
  try {
    const { serviceType, startDate, endDate } = req.query;

    if (!serviceType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Service type, start date, and end date are required'
      });
    }

    const billingPeriod = { startDate, endDate };
    const partners = await BillingService.getBillingReadyPartners(serviceType, billingPeriod);

    res.json({
      success: true,
      partners,
      summary: {
        totalPartners: partners.length,
        totalLeads: partners.reduce((sum, p) => sum + p.acceptedLeads, 0),
        totalAmount: partners.reduce((sum, p) => sum + p.totalAmount, 0)
      }
    });

  } catch (error) {
    console.error('Error getting billing-ready partners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get billing-ready partners',
      error: error.message
    });
  }
};

// @desc    Get income summary for a period
// @route   GET /api/invoices/income-summary
// @access  Private (Superadmin)
const getIncomeSummary = async (req, res) => {
  try {
    const { startDate, endDate, serviceType, partnerId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const period = { startDate, endDate };
    const incomeSummary = await BillingService.calculateIncomeForPeriod(
      period,
      serviceType,
      partnerId
    );

    res.json({
      success: true,
      incomeSummary
    });

  } catch (error) {
    console.error('Error getting income summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get income summary',
      error: error.message
    });
  }
};

module.exports = {
  getAllInvoices,
  getPartnerInvoices,
  generateInvoice,
  generateBulkInvoices,
  getBillingReadyPartners,
  getIncomeSummary,
  updateInvoiceStatus,
  getInvoiceById,
  getRevenueSummary,
  downloadInvoice
};