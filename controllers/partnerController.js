// Partner Controller - Partner Management
const Partner = require('../models/Partner');
const Lead = require('../models/Lead');
const AdminLog = require('../models/AdminLog');
const { createAuditLog, logError, logActivity } = require('../middleware/logging');
const logger = require('../utils/logger');
const { generatePartnerDefaultPassword } = require('../utils/passwordGenerator');
const NotificationService = require('../services/notificationService');
// Removed pagination utility - implementing directly in controllers

// @desc    Get all partners (Superadmin)
// @route   GET /api/partners
// @access  Private (Superadmin)
const getAllPartners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 8,
      search,
      status,
      partnerType,
      serviceType,
      city,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Status filter (check partner status)
    if (status) {
      filter.status = status;
    }

    // Partner type filter
    if (partnerType) {
      filter.partnerType = partnerType;
    }

    // Service type filter (single service per document)
    if (serviceType) {
      filter.serviceType = serviceType;
    }

    // City filter (search in service preferences)
    if (city) {
      filter['$and'] = filter['$and'] || [];
      
      // Search in service areas and address
      const citySearchConditions = [
        { 'preferences.serviceAreas.city': new RegExp(city, 'i') },
        { 'address.city': new RegExp(city, 'i') }
      ];
      
      filter['$and'].push({
        $or: citySearchConditions
      });
    }

    // Search functionality
    if (search) {
      filter['$and'] = filter['$and'] || [];
      filter['$and'].push({
        $or: [
          { partnerId: new RegExp(search, 'i') },
          { companyName: new RegExp(search, 'i') },
          { 'contactPerson.firstName': new RegExp(search, 'i') },
          { 'contactPerson.lastName': new RegExp(search, 'i') },
          { 'contactPerson.email': new RegExp(search, 'i') },
          { 'businessDetails.address.city': new RegExp(search, 'i') },
          // Full name search: firstName + " " + lastName
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$contactPerson.firstName', ' ', '$contactPerson.lastName'] },
                regex: search,
                options: 'i'
              }
            }
          }
        ]
      });
    }

    // Build sort object
    const sort = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    sort[sortBy] = order;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [partners, total] = await Promise.all([
      Partner.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-password')
        .lean(),
      Partner.countDocuments(filter)
    ]);

    // Get service-specific lead counts for each partner
    const Lead = require('../models/Lead');
    const partnerIds = partners.map(p => p._id);
    
    const leadCounts = await Lead.aggregate([
      { $match: { assignedPartner: { $in: partnerIds } } },
      {
        $group: {
          _id: {
            partnerId: '$assignedPartner',
            serviceType: '$serviceType'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map of partner lead counts by service
    const leadCountMap = {};
    leadCounts.forEach(({ _id, count }) => {
      const partnerId = _id.partnerId.toString();
      if (!leadCountMap[partnerId]) {
        leadCountMap[partnerId] = {};
      }
      leadCountMap[partnerId][_id.serviceType] = count;
    });

    // Add lead counts to partner data
    partners.forEach(partner => {
      const partnerId = partner._id.toString();
      const partnerLeadCounts = leadCountMap[partnerId] || {};
      
      partner.metrics = partner.metrics || {};
      partner.metrics.movingLeadsReceived = partnerLeadCounts.moving || 0;
      partner.metrics.cleaningLeadsReceived = partnerLeadCounts.cleaning || 0;
      partner.metrics.totalLeadsReceived = (partnerLeadCounts.moving || 0) + (partnerLeadCounts.cleaning || 0);
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Calculate stats for the filtered results (using the same filter for consistency)
    const statsFilter = { ...filter };
    
    const [activeCount, exclusiveCount, pendingCount] = await Promise.all([
      Partner.countDocuments({ ...statsFilter, overallStatus: 'active' }),
      Partner.countDocuments({ ...statsFilter, partnerType: 'exclusive' }),
      Partner.countDocuments({ ...statsFilter, overallStatus: 'pending' })
    ]);

    res.json({
      success: true,
      partners,
      pagination: {
        current: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasNext,
        hasPrev,
        next: hasNext ? pageNum + 1 : null,
        prev: hasPrev ? pageNum - 1 : null
      },
      stats: {
        total,
        active: activeCount,
        exclusive: exclusiveCount,
        pending: pendingCount
      },
      filters: {
        search,
        status,
        partnerType,
        serviceType,
        city,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get partners', 
      error: error.message 
    });
  }
};

// @desc    Get partner by ID
// @route   GET /api/partners/:partnerId
// @access  Private (Partner/Superadmin)
const getPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Partners can only see their own data
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      partner
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get partner', error: error.message });
  }
};

// @desc    Approve/Reject specific service for partner
// @route   PUT /api/partners/:partnerId/services/:serviceType/status
// @access  Private (Superadmin)
const updatePartnerServiceStatus = async (req, res) => {
  try {
    const { partnerId, serviceType } = req.params;
    const { status, reason } = req.body;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Find the specific service
    const service = partner.services.find(s => s.serviceType === serviceType);
    if (!service) {
      return res.status(404).json({ message: `Service ${serviceType} not found for this partner` });
    }

    const oldStatus = service.status;
    
    if (status === 'active') {
      partner.approveService(serviceType, req.user.id);
    } else if (status === 'rejected') {
      if (!reason) {
        return res.status(400).json({ message: 'Reason is required for rejection' });
      }
      partner.rejectService(serviceType, reason, req.user.id);
    } else {
      service.status = status;
      partner.updateOverallStatus();
    }

    await partner.save();

    // Handle approval
    if (status === 'active' && oldStatus !== 'active') {
      try {
        // Generate temporary password for partner login
        const tempPassword = generatePartnerDefaultPassword(partner.companyName, partner.contactPerson.phone);
        
        // Update partner password
        partner.password = tempPassword;
        await partner.save();
        
        // Send approval email with password
        const EmailService = require('../services/emailService');
        const emailService = new EmailService();
        await emailService.sendServiceApprovalNotification(partner, serviceType, tempPassword);
        
        // Create welcome notification for partner portal
        await NotificationService.createPartnerWelcomeNotification(
          partnerId,
          serviceType
        );
        
        // Create admin log
        await logActivity('superadmin', req.user, 'partner_service_approved', {
          partnerId: partner._id,
          partnerName: partner.companyName,
          serviceType: serviceType,
          oldStatus: oldStatus,
          newStatus: status,
          message: `Approved ${serviceType} service for partner ${partner.companyName}`
        }, req);
        
        logger.info(`Service ${serviceType} approved for partner ${partner.companyName}, email and notification sent`);
      } catch (notificationError) {
        logger.error('Failed to send approval email or create notification:', notificationError);
        // Don't fail the entire operation if email/notification fails
      }
    }

    // Handle rejection
    if (status === 'rejected' && oldStatus !== 'rejected') {
      try {
        // Send rejection email with reason
        const EmailService = require('../services/emailService');
        const emailService = new EmailService();
        await emailService.sendServiceRejectionNotification(partner, serviceType, reason);
        
        // Create rejection notification for partner portal (if they have other active services)
        const hasActiveServices = partner.services.some(s => s.status === 'active' && s.serviceType !== serviceType);
        if (hasActiveServices) {
          const Notification = require('../models/Notification');
          await Notification.createNotification({
            recipient: partnerId,
            recipientRole: 'partner',
            type: 'service_rejected',
            title: `${serviceType === 'moving' ? 'Moving' : 'Cleaning'} Service Application Rejected`,
            message: `Your ${serviceType} service application has been rejected. ${reason ? 'Reason: ' + reason : ''}`,
            priority: 'medium',
            metadata: {
              serviceType: serviceType,
              reason: reason
            }
          });
        }
        
        // Create admin log
        await logActivity('superadmin', req.user, 'partner_service_rejected', {
          partnerId: partner._id,
          partnerName: partner.companyName,
          serviceType: serviceType,
          reason: reason,
          oldStatus: oldStatus,
          newStatus: status,
          message: `Rejected ${serviceType} service for partner ${partner.companyName}. Reason: ${reason}`
        }, req);
        
        logger.info(`Service ${serviceType} rejected for partner ${partner.companyName}, reason: ${reason}`);
      } catch (notificationError) {
        logger.error('Failed to send rejection email or create notification:', notificationError);
        // Don't fail the entire operation if email/notification fails
      }
    }

    logger.info(`Partner ${partner.companyName} service ${serviceType} status changed from ${oldStatus} to ${status}`);

    res.json({
      success: true,
      message: `Service ${serviceType} ${status} successfully`,
      partner,
      updatedService: {
        serviceType,
        status,
        reason: status === 'rejected' ? reason : undefined
      }
    });
  } catch (error) {
    await logError('partner_service_status_update_failed', error, req, {
      partnerId: req.params.partnerId,
      serviceType: req.params.serviceType,
      status: req.body.status
    });
    res.status(500).json({ message: 'Failed to update service status', error: error.message });
  }
};

// @desc    Approve/Reject all services for partner (legacy support)
// @route   PUT /api/partners/:partnerId/status
// @access  Private (Superadmin)
const updatePartnerStatus = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status, reason } = req.body;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Update all services to the same status
    partner.services.forEach(service => {
      const oldStatus = service.status;
      
      if (status === 'active') {
        partner.approveService(service.serviceType, req.user.id);
      } else if (status === 'rejected') {
        partner.rejectService(service.serviceType, reason, req.user.id);
      } else {
        service.status = status;
      }
    });
    
    partner.updateOverallStatus();
    await partner.save();

    // Handle notifications and emails based on status
    if (status === 'active') {
      // Reactivation - send welcome notifications
      try {
        for (const service of partner.services) {
          await NotificationService.createPartnerWelcomeNotification(
            partnerId,
            service.serviceType
          );
        }
        
        // Send reactivation email
        const EmailService = require('../services/emailService');
        const emailService = new EmailService();
        await emailService.sendPartnerReactivationNotification(partner);
        
        logger.info(`Reactivation notifications and email sent for partner ${partner.companyName}`);
      } catch (notificationError) {
        logger.error('Failed to create reactivation notifications:', notificationError);
      }
    } else if (status === 'suspended') {
      // Suspension - send suspension email and notification
      try {
        const EmailService = require('../services/emailService');
        const emailService = new EmailService();
        await emailService.sendPartnerSuspensionNotification(partner, reason);
        
        // Create suspension notification for partner portal
        const Notification = require('../models/Notification');
        await Notification.createNotification({
          recipient: partnerId,
          recipientRole: 'partner',
          type: 'partner_suspended',
          title: 'Account Suspended',
          message: `Your partner account has been suspended. ${reason ? 'Reason: ' + reason : 'Contact support for more information.'}`,
          priority: 'high',
          metadata: {
            reason: reason,
            actionUrl: '/contact-support'
          }
        });
        
        logger.info(`Suspension notifications and email sent for partner ${partner.companyName}`);
      } catch (notificationError) {
        logger.error('Failed to create suspension notifications:', notificationError);
      }
    }

    // Log admin action
    const action = status === 'active' ? 'PARTNER_REACTIVATED' : 
                   status === 'suspended' ? 'PARTNER_SUSPENDED' : 'PARTNER_STATUS_UPDATED';
    await AdminLog.logAction(req.user, action, 'PARTNER', {
      targetId: partnerId,
      details: {
        partnerCompany: partner.companyName,
        partnerEmail: partner.email,
        newStatus: status,
        reason: reason || null,
        affectedServices: partner.services.map(s => s.serviceType)
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
    
    logger.info(`Partner ${partner.companyName} all services status changed to ${status} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: `All services ${status} successfully`,
      partner
    });
  } catch (error) {
    await logError('partner_status_update_failed', error, req, {
      partnerId: req.params.partnerId,
      serviceType: 'system'
    });
    res.status(500).json({ message: 'Failed to update partner status', error: error.message });
  }
};

// @desc    Update partner type (Basic/Exclusive)
// @route   PUT /api/partners/:partnerId/type
// @access  Private (Superadmin)
const updatePartnerType = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { partnerType } = req.body;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    const oldType = partner.partnerType;
    partner.partnerType = partnerType;
    await partner.save();

    // Send type change email notification
    try {
      const EmailService = require('../services/emailService');
      const emailService = new EmailService();
      await emailService.sendPartnerTypeChangeNotification(partner, oldType, partnerType);
    } catch (emailError) {
      logger.error('Failed to send type change email:', emailError);
    }

    // Create partner portal notification
    try {
      const Notification = require('../models/Notification');
      const upgradeToExclusive = partnerType === 'exclusive';
      
      await Notification.createNotification({
        recipient: partnerId,
        recipientRole: 'partner',
        type: 'partner_type_changed',
        title: upgradeToExclusive ? 'Upgraded to Exclusive Partner!' : 'Changed to Basic Partner',
        message: upgradeToExclusive 
          ? `Congratulations! You've been upgraded to Exclusive Partner status with premium benefits and priority support.`
          : `Your partner status has been changed to Basic. Contact support if you have questions about this change.`,
        priority: upgradeToExclusive ? 'high' : 'medium',
        metadata: {
          oldType: oldType,
          newType: partnerType,
          actionUrl: '/profile'
        }
      });
    } catch (notificationError) {
      logger.error('Failed to create type change notification:', notificationError);
    }

    // Log admin action
    await AdminLog.logAction(req.user, 'PARTNER_TYPE_CHANGED', 'PARTNER', {
      targetId: partnerId,
      details: {
        partnerCompany: partner.companyName,
        partnerEmail: partner.contactPerson.email,
        oldType: oldType,
        newType: partnerType,
        upgradeToExclusive: partnerType === 'exclusive'
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Partner ${partner.companyName} type changed from ${oldType} to ${partnerType} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: `Partner type updated to ${partnerType}`,
      partner
    });
  } catch (error) {
    await logError('partner_type_update_failed', error, req, {
      partnerId: req.params.partnerId,
      serviceType: 'system'
    });
    res.status(500).json({ message: 'Failed to update partner type', error: error.message });
  }
};



// @desc    Get partner performance metrics
// @route   GET /api/partners/:partnerId/metrics
// @access  Private (Partner/Superadmin)
const getPartnerMetrics = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { period = '30d' } = req.query;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Partners can only see their own metrics
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

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

    // Get leads for period
    const leadsInPeriod = await Lead.find({
      assignedPartner: partnerId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const acceptedLeads = leadsInPeriod.filter(lead => lead.status === 'accepted');
    const cancelledLeads = leadsInPeriod.filter(lead => lead.status === 'cancelled');

    const periodMetrics = {
      totalLeads: leadsInPeriod.length,
      acceptedLeads: acceptedLeads.length,
      cancelledLeads: cancelledLeads.length,
      acceptanceRate: leadsInPeriod.length > 0 ? (acceptedLeads.length / leadsInPeriod.length) * 100 : 0,
      revenue: acceptedLeads.reduce((sum, lead) => sum + (lead.actualValue || 0), 0)
    };

    res.json({
      success: true,
      metrics: {
        overall: partner.metrics,
        period: periodMetrics,
        periodRange: { startDate, endDate }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get metrics', error: error.message });
  }
};

// @desc    Create new partner (Superadmin)
// @route   POST /api/partners
// @access  Private (Superadmin)
const createPartner = async (req, res) => {
  try {
    const partnerData = req.body;

    // Check if partner already exists
    const existingPartner = await Partner.findOne({
      'contactPerson.email': partnerData.contactPerson.email
    });

    if (existingPartner) {
      return res.status(400).json({ message: 'Partner already exists' });
    }

    // Generate default password for partner
    const defaultPassword = generatePartnerDefaultPassword(
      partnerData.companyName,
      partnerData.contactPerson.phone
    );
    
    // Transform services array to service objects with approved status
    const servicesWithStatus = partnerData.services.map(serviceType => ({
      serviceType,
      status: 'active',
      approvedAt: new Date(),
      approvedBy: req.user.id
    }));

    const partner = new Partner({
      ...partnerData,
      services: servicesWithStatus,
      password: defaultPassword // Set generated default password
    });

    await partner.save();
    
    // Log the generated password (in production, this should be sent via email)
    logger.info(`Partner created by admin with default password: ${partnerData.contactPerson.email} | Password: ${defaultPassword}`);

    logger.info(`New partner created: ${partner.companyName} by admin`);

    res.status(201).json({
      success: true,
      message: 'Partner created successfully',
      partner: {
        ...partner.toObject(),
        generatedPassword: defaultPassword // Include generated password in response for admin use
      }
    });
  } catch (error) {
    await logError('partner_creation_failed', error, req, { serviceType: 'system' });
    res.status(500).json({ message: 'Failed to create partner', error: error.message });
  }
};

// @desc    Get partner by ID
// @route   GET /api/partners/:partnerId
// @access  Private (Superadmin/Partner)
const getPartnerById = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Check permissions - partners can only see their own profile
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      partner
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get partner', error: error.message });
  }
};

// @desc    Get leads assigned to a specific partner
// @route   GET /api/partners/:partnerId/leads
// @access  Private (Partner/Superadmin)
const getPartnerLeads = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const {
      page = 1,
      limit = 10,
      search,
      service,
      status,
      priority,
      city,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Check if partner exists
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Check permissions - partners can only see their own leads
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build filter object
    const filter = { assignedPartner: partnerId };

    // Search filter
    if (search) {
      filter.$or = [
        { leadId: new RegExp(search, 'i') },
        { 'customerDetails.firstName': new RegExp(search, 'i') },
        { 'customerDetails.lastName': new RegExp(search, 'i') },
        { 'customerDetails.email': new RegExp(search, 'i') },
        { 'customerDetails.phone': new RegExp(search, 'i') },
        { fromLocation: new RegExp(search, 'i') },
        { toLocation: new RegExp(search, 'i') },
        { pickupLocation: new RegExp(search, 'i') },
        { dropoffLocation: new RegExp(search, 'i') }
      ];
    }

    // Service filter - handle multiple services
    if (service && service !== 'all') {
      const services = service.split(',').map(s => s.trim());
      if (services.length === 1) {
        filter.serviceType = services[0];
      } else {
        filter.serviceType = { $in: services };
      }
    }

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    // City filter
    if (city) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { fromLocation: new RegExp(city, 'i') },
          { toLocation: new RegExp(city, 'i') },
          { pickupLocation: new RegExp(city, 'i') },
          { dropoffLocation: new RegExp(city, 'i') },
          { 'serviceDetails.fromCity': new RegExp(city, 'i') },
          { 'serviceDetails.toCity': new RegExp(city, 'i') }
        ]
      });
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = endDateObj;
      }
    }

    // Build sort object
    const sort = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    sort[sortBy] = order;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('assignedPartner', 'companyName contactPerson')
        .lean(),
      Lead.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Calculate statistics for this partner's leads (using base filter without pagination)
    const baseFilter = { assignedPartner: partnerId };
    const [
      totalCount,
      pendingCount,
      assignedCount,
      acceptedCount,
      completedCount,
      cancelledCount
    ] = await Promise.all([
      Lead.countDocuments(baseFilter),
      Lead.countDocuments({ ...baseFilter, status: 'pending' }),
      Lead.countDocuments({ ...baseFilter, status: 'assigned' }),
      Lead.countDocuments({ ...baseFilter, status: 'accepted' }),
      Lead.countDocuments({ ...baseFilter, status: 'completed' }),
      Lead.countDocuments({ ...baseFilter, status: 'cancelled' })
    ]);

    const stats = {
      total: totalCount,
      pending: pendingCount,
      assigned: assignedCount,
      accepted: acceptedCount,
      completed: completedCount,
      cancelled: cancelledCount
    };

    res.json({
      success: true,
      leads,
      stats,
      pagination: {
        current: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasNext,
        hasPrev,
        next: hasNext ? pageNum + 1 : null,
        prev: hasPrev ? pageNum - 1 : null
      },
      filters: {
        search,
        service,
        status,
        priority,
        city,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    logger.error(`Failed to get partner leads: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get partner leads', 
      error: error.message 
    });
  }
};

// @desc    Update partner information
// @route   PUT /api/partners/:partnerId
// @access  Private (Partner/Superadmin)
const updatePartner = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const updateData = req.body;
    
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Partners can only update their own information
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update allowed fields
    const allowedFields = [
      'companyName',
      'contactPerson',
      'address',
      'services',
      'notifications'
    ];

    // Handle other fields
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'contactPerson' || field === 'address' || field === 'notifications') {
          // For nested objects, merge with existing data
          partner[field] = { ...partner[field], ...updateData[field] };
        } else {
          partner[field] = updateData[field];
        }
      }
    });

    await partner.save();

    logger.info(`Partner ${partner.companyName} information updated`);

    res.json({
      success: true,
      message: 'Partner information updated successfully',
      partner
    });
  } catch (error) {
    await logError('partner_update_failed', error, req, {
      partnerId: req.params.partnerId,
      serviceType: 'system'
    });
    res.status(500).json({ message: 'Failed to update partner', error: error.message });
  }
};

module.exports = {
  getAllPartners,
  getPartner,
  getPartnerById,
  updatePartner,
  updatePartnerStatus,
  updatePartnerServiceStatus,
  updatePartnerType,
  getPartnerMetrics,
  createPartner,
  getPartnerLeads
};