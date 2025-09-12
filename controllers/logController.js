const Log = require('../models/Log');

// @desc    Get system logs (Superadmin)
// @route   GET /api/logs
// @access  Private (Superadmin)
const getAllLogs = async (req, res) => {
  try {
    const {
      actorType,
      action,
      serviceType,
      status,
      domain,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (actorType) filter['actor.type'] = actorType;
    if (action) filter.action = action;
    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.status = status;
    if (domain) filter['metadata.domain'] = new RegExp(domain, 'i');
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search in message and details
    if (search) {
      filter.$or = [
        { message: new RegExp(search, 'i') },
        { 'details.method': new RegExp(search, 'i') },
        { 'details.url': new RegExp(search, 'i') }
      ];
    }

    const logs = await Log.find(filter)
      .populate('leadId', 'leadId serviceType user.firstName user.lastName')
      .populate('partnerId', 'companyName contactPerson.email')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Log.countDocuments(filter);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: { actorType, action, serviceType, status, domain, startDate, endDate, search }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get logs', 
      error: error.message 
    });
  }
};

// @desc    Get partner-specific logs
// @route   GET /api/logs/partner/:partnerId
// @access  Private (Partner/Superadmin)
const getPartnerLogs = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const {
      action,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Partners can only see their own logs
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    // Build filter for partner-specific logs
    const filter = {
      $or: [
        { 'actor.id': partnerId },
        { partnerId: partnerId }
      ]
    };

    if (action) filter.action = action;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await Log.find(filter)
      .populate('leadId', 'leadId serviceType')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-details.body -error.stack') // Hide sensitive data from partners
      .exec();

    const total = await Log.countDocuments(filter);

    res.json({
      success: true,
      logs,
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
      message: 'Failed to get partner logs', 
      error: error.message 
    });
  }
};

// @desc    Get lead timeline/history
// @route   GET /api/logs/lead/:leadId
// @access  Private (Superadmin)
const getLeadTimeline = async (req, res) => {
  try {
    const { leadId } = req.params;

    const logs = await Log.find({ leadId })
      .populate('partnerId', 'companyName')
      .sort({ createdAt: 1 }) // Chronological order
      .exec();

    res.json({
      success: true,
      timeline: logs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get lead timeline', 
      error: error.message 
    });
  }
};

// @desc    Get log analytics/summary
// @route   GET /api/logs/analytics
// @access  Private (Superadmin)
const getLogAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

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
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const filter = { createdAt: { $gte: startDate, $lte: endDate } };

    // Get analytics data
    const [
      totalLogs,
      errorLogs,
      actionBreakdown,
      actorBreakdown,
      dailyActivity
    ] = await Promise.all([
      Log.countDocuments(filter),
      Log.countDocuments({ ...filter, status: 'failed' }),
      Log.aggregate([
        { $match: filter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Log.aggregate([
        { $match: filter },
        { $group: { _id: '$actor.type', count: { $sum: 1 } } }
      ]),
      Log.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: 1 },
            errors: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        summary: {
          totalLogs,
          errorLogs,
          errorRate: totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0
        },
        breakdown: {
          actions: actionBreakdown,
          actors: actorBreakdown
        },
        trend: dailyActivity,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get log analytics', 
      error: error.message 
    });
  }
};

// @desc    Export logs to various formats
// @route   GET /api/logs/export/:format
// @access  Private (Superadmin)
const exportLogs = async (req, res) => {
  try {
    const { format } = req.params;
    const {
      actorType,
      action,
      serviceType,
      status,
      startDate,
      endDate,
      search,
      limit = 10000
    } = req.query;

    // Build filter same as getAllLogs
    const filter = {};
    
    if (actorType) filter['actor.type'] = actorType;
    if (action) filter.action = action;
    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search in message and details
    if (search) {
      filter.$or = [
        { message: new RegExp(search, 'i') },
        { 'details.method': new RegExp(search, 'i') },
        { 'details.url': new RegExp(search, 'i') },
        { 'actor.email': new RegExp(search, 'i') }
      ];
    }

    const logs = await Log.find(filter)
      .populate('leadId', 'leadId serviceType user.firstName user.lastName user.email')
      .populate('partnerId', 'companyName contactPerson.email partnerType')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Transform data for export
    const exportData = logs.map(log => ({
      id: log._id,
      timestamp: log.createdAt,
      actorType: log.actor.type,
      actorName: log.actor.name,
      actorEmail: log.actor.email,
      action: log.action,
      status: log.status,
      serviceType: log.serviceType,
      message: log.message,
      leadId: log.leadId?.leadId,
      leadServiceType: log.leadId?.serviceType,
      leadCustomer: log.leadId ? `${log.leadId.user?.firstName} ${log.leadId.user?.lastName}` : null,
      leadCustomerEmail: log.leadId?.user?.email,
      partnerName: log.partnerId?.companyName,
      partnerEmail: log.partnerId?.contactPerson?.email,
      partnerType: log.partnerId?.partnerType,
      ipAddress: log.metadata?.ipAddress,
      userAgent: log.metadata?.userAgent,
      domain: log.metadata?.domain,
      errorMessage: log.error?.message,
      requestMethod: log.details?.method,
      requestUrl: log.details?.url
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename=logs_export_${timestamp}.json`);
      res.setHeader('Content-Type', 'application/json');
      res.json({
        exportInfo: {
          exportDate: new Date().toISOString(),
          totalRecords: exportData.length,
          filters: { actorType, action, serviceType, status, startDate, endDate, search }
        },
        logs: exportData
      });
    } else if (format === 'csv') {
      const { Parser } = require('json2csv');
      
      const fields = [
        { label: 'ID', value: 'id' },
        { label: 'Timestamp', value: 'timestamp' },
        { label: 'Actor Type', value: 'actorType' },
        { label: 'Actor Name', value: 'actorName' },
        { label: 'Actor Email', value: 'actorEmail' },
        { label: 'Action', value: 'action' },
        { label: 'Status', value: 'status' },
        { label: 'Service Type', value: 'serviceType' },
        { label: 'Message', value: 'message' },
        { label: 'Lead ID', value: 'leadId' },
        { label: 'Lead Service', value: 'leadServiceType' },
        { label: 'Customer Name', value: 'leadCustomer' },
        { label: 'Customer Email', value: 'leadCustomerEmail' },
        { label: 'Partner Name', value: 'partnerName' },
        { label: 'Partner Email', value: 'partnerEmail' },
        { label: 'Partner Type', value: 'partnerType' },
        { label: 'IP Address', value: 'ipAddress' },
        { label: 'User Agent', value: 'userAgent' },
        { label: 'Domain', value: 'domain' },
        { label: 'Error Message', value: 'errorMessage' },
        { label: 'Request Method', value: 'requestMethod' },
        { label: 'Request URL', value: 'requestUrl' }
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(exportData);
      
      res.setHeader('Content-Disposition', `attachment; filename=logs_export_${timestamp}.csv`);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported export format. Use json or csv.'
      });
    }
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export logs',
      error: error.message
    });
  }
};

module.exports = {
  getAllLogs,
  getPartnerLogs,
  getLeadTimeline,
  getLogAnalytics,
  exportLogs
};