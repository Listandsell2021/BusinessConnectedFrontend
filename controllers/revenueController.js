const Revenue = require('../models/Revenue');
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');
const Settings = require('../models/Settings');

// @desc    Get all revenue (Superadmin)
// @route   GET /api/revenue
// @access  Private (Superadmin)
const getAllRevenue = async (req, res) => {
  try {
    const {
      partnerId,
      serviceType,
      status,
      startDate,
      endDate,
      month,
      year,
      city,
      search,
      page = 1,
      limit = 20,
      sortBy = 'revenueDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (partnerId) filter.partnerId = partnerId;
    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.status = status;
    if (city) filter['customer.city'] = new RegExp(city, 'i');
    
    // Search functionality
    if (search) {
      filter.$or = [
        { 'customer.name': new RegExp(search, 'i') },
        { 'customer.email': new RegExp(search, 'i') },
        { 'customer.city': new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }
    
    // Date filtering
    if (startDate || endDate || month || year) {
      filter.revenueDate = {};
      
      if (year) {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);
        filter.revenueDate.$gte = yearStart;
        filter.revenueDate.$lte = yearEnd;
        
        if (month) {
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0, 23, 59, 59);
          filter.revenueDate.$gte = monthStart;
          filter.revenueDate.$lte = monthEnd;
        }
      } else {
        if (startDate) filter.revenueDate.$gte = new Date(startDate);
        if (endDate) filter.revenueDate.$lte = new Date(endDate);
      }
    }

    const revenue = await Revenue.find(filter)
      .populate('partnerId', 'companyName contactPerson.email cities')
      .populate('leadId', 'leadId user.firstName user.lastName city')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Revenue.countDocuments(filter);

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalCommission: { $sum: '$commission' },
          totalNetRevenue: { $sum: '$netRevenue' },
          confirmedRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, '$amount', 0]
            }
          },
          paidRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
            }
          },
          pendingRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          }
        }
      }
    ];

    const summary = await Revenue.aggregate(summaryPipeline);
    
    res.json({
      success: true,
      revenue,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      summary: summary[0] || {
        totalRevenue: 0,
        totalCommission: 0,
        totalNetRevenue: 0,
        confirmedRevenue: 0,
        paidRevenue: 0,
        pendingRevenue: 0
      }
    });
  } catch (error) {
    console.error('Error in getAllRevenue:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get revenue data', 
      error: error.message 
    });
  }
};

// @desc    Get partner revenue
// @route   GET /api/revenue/partner/:partnerId
// @access  Private (Partner/Superadmin)
const getPartnerRevenue = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { 
      serviceType, 
      status, 
      startDate, 
      endDate,
      month,
      year,
      page = 1, 
      limit = 20 
    } = req.query;

    // Partners can only see their own revenue
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const filter = { partnerId };
    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.status = status;
    
    // Date filtering
    if (startDate || endDate || month || year) {
      filter.revenueDate = {};
      
      if (year) {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);
        filter.revenueDate.$gte = yearStart;
        filter.revenueDate.$lte = yearEnd;
        
        if (month) {
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0, 23, 59, 59);
          filter.revenueDate.$gte = monthStart;
          filter.revenueDate.$lte = monthEnd;
        }
      } else {
        if (startDate) filter.revenueDate.$gte = new Date(startDate);
        if (endDate) filter.revenueDate.$lte = new Date(endDate);
      }
    }

    const revenue = await Revenue.find(filter)
      .populate('leadId', 'leadId serviceType user')
      .sort({ revenueDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Revenue.countDocuments(filter);

    // Calculate partner summary
    const summary = await Revenue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalCommission: { $sum: '$commission' },
          totalNetRevenue: { $sum: '$netRevenue' },
          confirmedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      revenue,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      summary: summary[0] || {
        totalRevenue: 0,
        totalCommission: 0,
        totalNetRevenue: 0,
        confirmedCount: 0,
        paidCount: 0,
        pendingCount: 0
      }
    });
  } catch (error) {
    console.error('Error in getPartnerRevenue:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get partner revenue', 
      error: error.message 
    });
  }
};

// @desc    Create revenue entry (automatically when lead is accepted)
// @route   POST /api/revenue
// @access  Private (System/Superadmin)
const createRevenue = async (req, res) => {
  try {
    const { leadId, partnerId, customAmount } = req.body;

    // Get lead details
    const lead = await Lead.findById(leadId)
      .populate('user', 'firstName lastName email city')
      .populate('assignedPartner', 'companyName');

    if (!lead) {
      return res.status(404).json({ 
        success: false,
        message: 'Lead not found' 
      });
    }

    // Get current pricing from settings
    const settings = await Settings.getSettings();
    const perLeadPrice = settings.pricing[lead.serviceType]?.perLeadPrice || 
                        (lead.serviceType === 'moving' ? 25 : 15);

    // Use custom amount or default pricing
    const amount = customAmount || perLeadPrice;
    const commission = amount * 0.1; // 10% commission (configurable)

    // Create revenue entry
    const revenue = new Revenue({
      leadId,
      partnerId: partnerId || lead.assignedPartner,
      serviceType: lead.serviceType,
      amount,
      commission,
      customer: {
        name: `${lead.user.firstName} ${lead.user.lastName}`,
        email: lead.user.email,
        city: lead.user.city || lead.city
      },
      status: 'confirmed',
      createdBy: req.user.id
    });

    await revenue.save();

    res.status(201).json({
      success: true,
      message: 'Revenue entry created successfully',
      revenue
    });
  } catch (error) {
    console.error('Error in createRevenue:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create revenue entry', 
      error: error.message 
    });
  }
};

// @desc    Update revenue status
// @route   PUT /api/revenue/:revenueId/status
// @access  Private (Superadmin)
const updateRevenueStatus = async (req, res) => {
  try {
    const { revenueId } = req.params;
    const { status, paymentDate, paymentMethod, paymentReference, notes } = req.body;

    const revenue = await Revenue.findById(revenueId);
    if (!revenue) {
      return res.status(404).json({ 
        success: false,
        message: 'Revenue entry not found' 
      });
    }

    revenue.status = status;
    if (status === 'paid') {
      revenue.paymentDate = paymentDate || new Date();
      if (paymentMethod) revenue.paymentMethod = paymentMethod;
      if (paymentReference) revenue.paymentReference = paymentReference;
    }
    if (notes) revenue.notes = notes;

    await revenue.save();

    res.json({
      success: true,
      message: `Revenue ${status} successfully`,
      revenue
    });
  } catch (error) {
    console.error('Error in updateRevenueStatus:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update revenue status', 
      error: error.message 
    });
  }
};

// @desc    Get revenue analytics
// @route   GET /api/revenue/analytics
// @access  Private (Superadmin)
const getRevenueAnalytics = async (req, res) => {
  try {
    const { 
      period = '30d', 
      serviceType, 
      partnerId 
    } = req.query;

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

    const baseFilter = { 
      revenueDate: { $gte: startDate, $lte: endDate } 
    };
    
    if (serviceType) baseFilter.serviceType = serviceType;
    if (partnerId) baseFilter.partnerId = partnerId;

    // Monthly trend analysis
    const monthlyTrend = await Revenue.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: { 
            year: { $year: '$revenueDate' },
            month: { $month: '$revenueDate' }
          },
          revenue: { $sum: '$amount' },
          netRevenue: { $sum: '$netRevenue' },
          commission: { $sum: '$commission' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Service type breakdown
    const serviceBreakdown = await Revenue.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$serviceType',
          revenue: { $sum: '$amount' },
          netRevenue: { $sum: '$netRevenue' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Top performing partners
    const topPartners = await Revenue.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$partnerId',
          revenue: { $sum: '$amount' },
          netRevenue: { $sum: '$netRevenue' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'partners',
          localField: '_id',
          foreignField: '_id',
          as: 'partner'
        }
      }
    ]);

    // Status distribution
    const statusDistribution = await Revenue.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        period: { startDate, endDate },
        monthlyTrend,
        serviceBreakdown,
        topPartners,
        statusDistribution
      }
    });
  } catch (error) {
    console.error('Error in getRevenueAnalytics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get revenue analytics', 
      error: error.message 
    });
  }
};

// @desc    Export revenue data
// @route   GET /api/revenue/export
// @access  Private (Superadmin)
const exportRevenue = async (req, res) => {
  try {
    const {
      format = 'csv',
      serviceType,
      partnerId,
      status,
      startDate,
      endDate
    } = req.query;

    const filter = {};
    if (serviceType) filter.serviceType = serviceType;
    if (partnerId) filter.partnerId = partnerId;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.revenueDate = {};
      if (startDate) filter.revenueDate.$gte = new Date(startDate);
      if (endDate) filter.revenueDate.$lte = new Date(endDate);
    }

    const revenue = await Revenue.find(filter)
      .populate('partnerId', 'companyName')
      .populate('leadId', 'leadId')
      .sort({ revenueDate: -1 })
      .exec();

    if (format === 'csv') {
      const csvHeaders = [
        'Revenue ID',
        'Lead ID', 
        'Partner',
        'Service Type',
        'Amount',
        'Commission',
        'Net Revenue',
        'Status',
        'Customer Name',
        'Customer Email',
        'Customer City',
        'Revenue Date',
        'Payment Date'
      ].join(',');

      const csvRows = revenue.map(rev => [
        rev._id,
        rev.leadId?.leadId || 'N/A',
        rev.partnerId?.companyName || 'N/A',
        rev.serviceType,
        rev.amount,
        rev.commission,
        rev.netRevenue,
        rev.status,
        rev.customer.name || 'N/A',
        rev.customer.email || 'N/A',
        rev.customer.city || 'N/A',
        rev.revenueDate.toISOString().split('T')[0],
        rev.paymentDate ? rev.paymentDate.toISOString().split('T')[0] : 'N/A'
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="revenue_export.csv"');
      res.send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="revenue_export.json"');
      res.json(revenue);
    }
  } catch (error) {
    console.error('Error in exportRevenue:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export revenue data', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllRevenue,
  getPartnerRevenue,
  createRevenue,
  updateRevenueStatus,
  getRevenueAnalytics,
  exportRevenue
};