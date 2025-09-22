// Partner Controller - Partner Management
const Partner = require('../models/Partner');
const Lead = require('../models/Lead');
const AdminLog = require('../models/AdminLog');
const Settings = require('../models/Settings');
const CancelRequest = require('../models/CancelRequest');
const { createAuditLog, logError, logActivity } = require('../middleware/logging');
const logger = require('../utils/logger');
const { generatePartnerDefaultPassword } = require('../utils/passwordGenerator');
const NotificationService = require('../services/notificationService');
const mongoose = require('mongoose');
const { migrateCleaningData } = require('../scripts/migrateCleaningData');
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
      startDate,
      endDate,
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

    // City filter (search in service preferences and address)
    if (city) {
      filter['$and'] = filter['$and'] || [];

      const cityRegex = new RegExp(city, 'i');

      // Create city search conditions
      const citySearchConditions = [
        // Search in partner's business address
        { 'address.city': cityRegex },
        { 'businessDetails.address.city': cityRegex },
        // Search in legacy cities arrays
        { 'preferences.moving.cities': { $in: [cityRegex] } },
        { 'preferences.cleaning.cities': { $in: [cityRegex] } },
        // Search for city names as keys in serviceArea objects using objectToArray
        {
          $expr: {
            $anyElementTrue: {
              $map: {
                input: { $objectToArray: { $ifNull: ['$preferences.moving.serviceArea', {}] } },
                as: 'country',
                in: {
                  $anyElementTrue: {
                    $map: {
                      input: { $objectToArray: { $ifNull: ['$$country.v.cities', {}] } },
                      as: 'city',
                      in: { $regexMatch: { input: '$$city.k', regex: city, options: 'i' } }
                    }
                  }
                }
              }
            }
          }
        },
        {
          $expr: {
            $anyElementTrue: {
              $map: {
                input: { $objectToArray: { $ifNull: ['$preferences.cleaning.serviceArea', {}] } },
                as: 'country',
                in: {
                  $anyElementTrue: {
                    $map: {
                      input: { $objectToArray: { $ifNull: ['$$country.v.cities', {}] } },
                      as: 'city',
                      in: { $regexMatch: { input: '$$city.k', regex: city, options: 'i' } }
                    }
                  }
                }
              }
            }
          }
        }
      ];

      filter['$and'].push({
        $or: citySearchConditions
      });
    }

    // Date filter (for registered date)
    if (startDate || endDate) {
      console.log('Date filter received - startDate:', startDate, 'endDate:', endDate);

      filter['$and'] = filter['$and'] || [];

      const dateFilter = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.$gte = start;
        console.log('Start date filter:', start);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
        console.log('End date filter:', end);
      }

      filter['$and'].push({
        registeredAt: dateFilter
      });

      console.log('Applied date filter to registeredAt:', dateFilter);
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

    // Allow admin to approve/reject partner for any service type
    // This supports the business requirement that same company can apply for multiple services

    const oldStatus = partner.status;
    
    if (status === 'active') {
      partner.status = 'active';
      partner.approvedAt = new Date();
      partner.approvedBy = req.user.id;
      partner.rejectedReason = undefined; // Clear any previous rejection reason
    } else if (status === 'rejected') {
      if (!reason) {
        return res.status(400).json({ message: 'Reason is required for rejection' });
      }
      partner.status = 'rejected';
      partner.rejectedReason = reason;
      partner.approvedAt = undefined;
      partner.approvedBy = undefined;
    } else {
      partner.status = status;
    }

    await partner.save();

    // Handle approval - process in background after DB update
    if (status === 'active' && oldStatus !== 'active') {
      // Generate temporary password for partner login
      const tempPassword = generatePartnerDefaultPassword(partner.companyName, partner.contactPerson.phone);

      // Update partner password
      partner.password = tempPassword;
      await partner.save();

      // Process email and notifications in background (non-blocking)
      setImmediate(async () => {
        try {
          // Send approval email with password
          const emailService = require('../services/emailService');
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
      });
    }

    // Handle rejection - process in background after DB update
    if (status === 'rejected' && oldStatus !== 'rejected') {
      // Process email and notifications in background (non-blocking)
      setImmediate(async () => {
        try {
          // Send rejection email with reason
          const emailService = require('../services/emailService');
          await emailService.sendServiceRejectionNotification(partner, serviceType, reason);

          // Since each partner has only one service type now, no need to check for other active services
          // Always create notification for rejections
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
      });
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
    await logError('error_logged', error, req, {
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

    // Update partner status directly (single service per partner now)
    const oldStatus = partner.status;

    if (status === 'active') {
      partner.status = 'active';
      partner.approvedAt = new Date();
      partner.approvedBy = req.user.id;
      partner.rejectedReason = undefined;
    } else if (status === 'rejected') {
      partner.status = 'rejected';
      partner.rejectedReason = reason;
      partner.approvedAt = undefined;
      partner.approvedBy = undefined;
    } else {
      partner.status = status;
    }
    await partner.save();

    // Handle notifications and emails based on status
    if (status === 'active') {
      // Reactivation - send welcome notifications
      try {
        // Create welcome notification for the single service type
        await NotificationService.createPartnerWelcomeNotification(
          partnerId,
          partner.serviceType
        );
        
        // Send reactivation email
        const emailService = require('../services/emailService');
        await emailService.sendPartnerReactivationNotification(partner);
        
        logger.info(`Reactivation notifications and email sent for partner ${partner.companyName}`);
      } catch (notificationError) {
        logger.error('Failed to create reactivation notifications:', notificationError);
      }
    } else if (status === 'suspended') {
      // Suspension - send suspension email and notification
      try {
        const emailService = require('../services/emailService');
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
        affectedServices: [partner.serviceType]
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
      const emailService = require('../services/emailService');
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
    
    // Validate that only one service type is provided (per new model)
    if (!partnerData.serviceType) {
      return res.status(400).json({ message: 'Service type is required' });
    }

    const validServiceTypes = ['moving', 'cleaning'];
    if (!validServiceTypes.includes(partnerData.serviceType)) {
      return res.status(400).json({ message: 'Invalid service type' });
    }

    const partner = new Partner({
      ...partnerData,
      status: 'active', // Set as active when created by admin
      approvedAt: new Date(),
      approvedBy: req.user.id,
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
    const filter = { 'partnerAssignments.partner': partnerId };

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
        { dropoffLocation: new RegExp(search, 'i') },
        // Full name search: firstName + " " + lastName
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$customerDetails.firstName', ' ', '$customerDetails.lastName'] },
              regex: search,
              options: 'i'
            }
          }
        }
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

    // Status filter - filter by partner assignment status
    if (status && status !== 'all') {
      filter['partnerAssignments.status'] = status;
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

    // Date range filter - use assignment date for partner leads
    if (startDate || endDate) {
      filter['partnerAssignments.assignedAt'] = {};
      if (startDate) {
        filter['partnerAssignments.assignedAt'].$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of day
        filter['partnerAssignments.assignedAt'].$lte = endDateObj;
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

    // Use aggregation to show each assignment as a separate record
    const partnerObjectId = new mongoose.Types.ObjectId(partnerId);
    const aggregationPipeline = [
      { $match: { 'partnerAssignments.partner': partnerObjectId } },
      { $unwind: '$partnerAssignments' },
      { $match: { 'partnerAssignments.partner': partnerObjectId } },
      {
        $addFields: {
          // Use the unwound assignment as the current assignment
          latestPartnerAssignment: '$partnerAssignments'
        }
      }
    ];

    // Add status filter based on latest assignment
    if (status && status !== 'all') {
      if (status === 'cancel_requested') {
        // Special case: filter by cancellationRequested flag
        aggregationPipeline.push({
          $match: {
            'latestPartnerAssignment.cancellationRequested': true,
            'latestPartnerAssignment.status': 'accepted'
          }
        });
      } else {
        // Regular status filter
        aggregationPipeline.push({
          $match: { 'latestPartnerAssignment.status': status }
        });
      }
    }

    // Add other filters
    if (search) {
      aggregationPipeline.push({
        $lookup: {
          from: 'leadusers',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      });

      aggregationPipeline.push({
        $match: {
          $or: [
            { leadId: new RegExp(search, 'i') },
            { 'userDetails.firstName': new RegExp(search, 'i') },
            { 'userDetails.lastName': new RegExp(search, 'i') },
            { 'userDetails.email': new RegExp(search, 'i') },
            { 'userDetails.phone': new RegExp(search, 'i') }
          ]
        }
      });
    }

    // Add service filter
    if (service && service !== 'all') {
      const services = service.split(',').map(s => s.trim());
      if (services.length === 1) {
        aggregationPipeline.push({ $match: { serviceType: services[0] } });
      } else {
        aggregationPipeline.push({ $match: { serviceType: { $in: services } } });
      }
    }

    // Add city filter
    if (city) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { 'formData.pickupAddress': new RegExp(city, 'i') },
            { 'formData.destinationAddress': new RegExp(city, 'i') },
            { 'serviceLocation.city': new RegExp(city, 'i') }
          ]
        }
      });
    }

    // Add date range filter
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDateObj;
      }
      aggregationPipeline.push({
        $match: { 'latestPartnerAssignment.assignedAt': dateFilter }
      });
    }

    // Get total count before pagination
    const totalPipeline = [...aggregationPipeline, { $count: 'total' }];
    const totalResult = await Lead.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Add sorting and pagination
    aggregationPipeline.push({ $sort: sort });
    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limitNum });

    // Populate fields
    aggregationPipeline.push(
      {
        $lookup: {
          from: 'partners',
          localField: 'partnerAssignments.partner',
          foreignField: '_id',
          as: 'partnerDetails'
        }
      },
      {
        $lookup: {
          from: 'leadusers',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
      }
    );

    const leads = await Lead.aggregate(aggregationPipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Calculate statistics using aggregation to count all assignments
    const baseStatsPipeline = [
      { $match: { 'partnerAssignments.partner': partnerObjectId } },
      { $unwind: '$partnerAssignments' },
      { $match: { 'partnerAssignments.partner': partnerObjectId } },
      {
        $addFields: {
          latestPartnerAssignment: '$partnerAssignments'
        }
      }
    ];

    const [
      totalCountResult,
      pendingCountResult,
      acceptedCountResult,
      rejectedCountResult,
      cancelledCountResult,
      cancelRequestedCountResult
    ] = await Promise.all([
      Lead.aggregate([...baseStatsPipeline, { $count: 'total' }]),
      Lead.aggregate([...baseStatsPipeline, { $match: { 'latestPartnerAssignment.status': 'pending' } }, { $count: 'total' }]),
      Lead.aggregate([...baseStatsPipeline, { $match: { 'latestPartnerAssignment.status': 'accepted', 'latestPartnerAssignment.cancellationRequested': { $ne: true } } }, { $count: 'total' }]),
      Lead.aggregate([...baseStatsPipeline, { $match: { 'latestPartnerAssignment.status': 'rejected' } }, { $count: 'total' }]),
      Lead.aggregate([...baseStatsPipeline, { $match: { 'latestPartnerAssignment.status': 'cancelled' } }, { $count: 'total' }]),
      Lead.aggregate([...baseStatsPipeline, { $match: { 'latestPartnerAssignment.cancellationRequested': true, 'latestPartnerAssignment.status': 'accepted' } }, { $count: 'total' }])
    ]);

    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    const pendingCount = pendingCountResult.length > 0 ? pendingCountResult[0].total : 0;
    const acceptedCount = acceptedCountResult.length > 0 ? acceptedCountResult[0].total : 0;
    const rejectedCount = rejectedCountResult.length > 0 ? rejectedCountResult[0].total : 0;
    const cancelledCount = cancelledCountResult.length > 0 ? cancelledCountResult[0].total : 0;
    const cancelRequestedCount = cancelRequestedCountResult.length > 0 ? cancelRequestedCountResult[0].total : 0;

    const stats = {
      total: totalCount,
      pending: pendingCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
      cancelled: cancelledCount,
      cancel_requested: cancelRequestedCount
    };

    // Transform leads data to include name field and partner-specific status
    const transformedLeads = leads.map((lead, index) => {
      // Use the latestPartnerAssignment calculated in aggregation
      const partnerAssignment = lead.latestPartnerAssignment;

      return {
        ...lead,
        // Create a unique ID for each assignment row
        id: `${lead._id}_${partnerAssignment?.assignedAt?.getTime() || index}`,
        name: lead.user ?
          `${lead.user.firstName || ''} ${lead.user.lastName || ''}`.trim() :
          (lead.name || ''),
        email: lead.user?.email || lead.email || '',
        // Add partner-specific status for UI display - handle cancel requests
        partnerStatus: partnerAssignment?.cancellationRequested && partnerAssignment?.status === 'accepted'
          ? 'cancel_requested'
          : (partnerAssignment?.status || 'pending'),
        partnerAssignedAt: partnerAssignment?.assignedAt,
        partnerAcceptedAt: partnerAssignment?.acceptedAt,
        partnerRejectedAt: partnerAssignment?.rejectedAt,
        partnerCancellationRequested: partnerAssignment?.cancellationRequested || false,
        partnerCancellationReason: partnerAssignment?.cancellationReason
      };
    });

    // Debug logging
    console.log(`Partner ${partnerId} leads query:`, {
      leadsFound: transformedLeads.length,
      totalCount: total,
      statsTotal: totalCount,
      sampleLead: transformedLeads.length > 0 ? {
        id: transformedLeads[0]._id,
        leadId: transformedLeads[0].leadId,
        name: transformedLeads[0].name,
        partnerStatus: transformedLeads[0].partnerStatus,
        latestAssignment: transformedLeads[0].latestPartnerAssignment,
        totalAssignments: transformedLeads[0].partnerAssignments?.length || 0,
        hasUser: !!transformedLeads[0].user
      } : null
    });

    res.json({
      success: true,
      leads: transformedLeads,
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
      'preferences',
      'notifications'
    ];

    // Handle other fields
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'contactPerson' || field === 'address' || field === 'notifications') {
          // For nested objects, merge with existing data
          partner[field] = { ...partner[field], ...updateData[field] };
        } else if (field === 'preferences') {
          // Handle preferences with deep merging to support pickup/destination structure
          partner.preferences = partner.preferences || {};

          // Handle pickup preferences (directly under preferences for moving partners)
          if (updateData.preferences.pickup) {
            partner.preferences.pickup = {
              ...partner.preferences.pickup,
              ...updateData.preferences.pickup
            };
          }

          // Handle destination preferences (directly under preferences for moving partners)
          if (updateData.preferences.destination) {
            partner.preferences.destination = {
              ...partner.preferences.destination,
              ...updateData.preferences.destination
            };
          }

          // Handle other service preferences (cleaning, etc.)
          Object.keys(updateData.preferences).forEach(serviceKey => {
            if (serviceKey !== 'pickup' && serviceKey !== 'destination') {
              partner.preferences[serviceKey] = {
                ...partner.preferences[serviceKey],
                ...updateData.preferences[serviceKey]
              };
            }
          });
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

// @desc    Accept a lead assignment
// @route   PUT /api/partners/:partnerId/leads/:leadId/accept
// @access  Private (Partner)
const acceptLead = async (req, res) => {
  try {
    const { partnerId, leadId } = req.params;

    // Find the lead with partner assignments
    const lead = await Lead.findById(leadId)
      .populate('partnerAssignments.partner', 'companyName contactPerson partnerType');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Find partner assignment
    const partnerAssignment = lead.partnerAssignments.find(
      assignment => assignment.partner._id.toString() === partnerId
    );

    if (!partnerAssignment) {
      return res.status(404).json({ message: 'Lead not assigned to this partner' });
    }

    // Check if already accepted
    if (partnerAssignment.status === 'accepted') {
      return res.status(400).json({ message: 'Lead already accepted' });
    }

    // Check if already rejected
    if (partnerAssignment.status === 'rejected') {
      return res.status(400).json({ message: 'Cannot accept a previously rejected lead' });
    }

    // Update partner assignment status
    partnerAssignment.status = 'accepted';
    partnerAssignment.acceptedAt = new Date();

    await lead.save();

    // Update partner metrics
    const partner = await Partner.findById(partnerId);
    partner.metrics.totalLeadsAccepted += 1;
    await partner.save();

    // Create revenue entry automatically using the stored leadPrice
    try {
      const Revenue = require('../models/Revenue');

      // Check if revenue entry already exists for this lead and partner
      const existingRevenue = await Revenue.findOne({
        leadId: lead._id,
        partnerId: partnerId
      });

      if (!existingRevenue) {
        const revenue = new Revenue({
          leadId: lead._id,
          partnerId: partnerId,
          serviceType: lead.serviceType,
          amount: partnerAssignment.leadPrice, // Use the stored price
          commission: partnerAssignment.leadPrice * 0.1, // 10% commission
          customer: {
            name: `${lead.user?.firstName || ''} ${lead.user?.lastName || ''}`.trim() || 'Unknown',
            email: lead.user?.email || 'unknown@example.com',
            city: lead.serviceLocation?.city || lead.city || 'Unknown'
          },
          status: 'confirmed',
          revenueDate: new Date(),
          createdBy: partnerId // Partner who accepted the lead
        });

        await revenue.save();
        logger.info(`Revenue entry created for lead ${lead.leadId}, partner ${partnerId}, amount €${partnerAssignment.leadPrice}`);
      }
    } catch (revenueError) {
      logger.error(`Failed to create revenue entry for lead ${lead.leadId}:`, revenueError);
      // Don't fail the acceptance if revenue creation fails
    }

    logger.info(`Lead ${lead.leadId} accepted by partner ${partnerId}`);

    res.json({
      success: true,
      message: 'Lead accepted successfully',
      data: {
        leadId: lead.leadId,
        status: 'accepted',
        acceptedAt: partnerAssignment.acceptedAt,
        leadPrice: partnerAssignment.leadPrice
      }
    });

  } catch (error) {
    logger.error('Error accepting lead:', error);
    res.status(500).json({ message: 'Failed to accept lead', error: error.message });
  }
};

// @desc    Cancel a lead before accepting (immediate rejection)
// @route   PUT /api/partners/:partnerId/leads/:leadId/cancel-before-accept
// @access  Private (Partner)
const cancelLeadBeforeAccept = async (req, res) => {
  try {
    const { partnerId, leadId } = req.params;

    // Find the lead with partner assignments
    const lead = await Lead.findById(leadId)
      .populate('partnerAssignments.partner', 'companyName contactPerson partnerType');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Find partner assignment
    const partnerAssignment = lead.partnerAssignments.find(
      assignment => assignment.partner._id.toString() === partnerId
    );

    if (!partnerAssignment) {
      return res.status(404).json({ message: 'Lead not assigned to this partner' });
    }

    // Check if already accepted
    if (partnerAssignment.status === 'accepted') {
      return res.status(400).json({
        message: 'Cannot cancel an accepted lead. Use cancel-after-accept for cancellation requests.'
      });
    }

    // Check if already rejected
    if (partnerAssignment.status === 'rejected') {
      return res.status(400).json({ message: 'Lead already rejected' });
    }

    // Update partner assignment status - immediate rejection
    partnerAssignment.status = 'rejected';
    partnerAssignment.rejectedAt = new Date();

    await lead.save();

    logger.info(`Lead ${lead.leadId} rejected by partner ${partnerId}`);

    res.json({
      success: true,
      message: 'Lead rejected successfully',
      data: {
        leadId: lead.leadId,
        status: 'rejected',
        rejectedAt: partnerAssignment.rejectedAt
      }
    });

  } catch (error) {
    logger.error('Error rejecting lead:', error);
    res.status(500).json({ message: 'Failed to reject lead', error: error.message });
  }
};

// @desc    Request cancellation of an accepted lead
// @route   PUT /api/partners/:partnerId/leads/:leadId/cancel-after-accept
// @access  Private (Partner)
const cancelLeadAfterAccept = async (req, res) => {
  try {
    const { partnerId, leadId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        message: 'Cancellation reason is required and must be at least 10 characters'
      });
    }

    // Get admin settings for time limit
    const settings = await Settings.getSettings();
    const timeLimitHours = settings.system.cancellationTimeLimit || 2;

    // Find the lead with partner assignments
    const lead = await Lead.findById(leadId)
      .populate('partnerAssignments.partner', 'companyName contactPerson partnerType');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Find partner assignment
    const partnerAssignment = lead.partnerAssignments.find(
      assignment => assignment.partner._id.toString() === partnerId
    );

    if (!partnerAssignment) {
      return res.status(404).json({ message: 'Lead not assigned to this partner' });
    }

    // Check if lead is accepted
    if (partnerAssignment.status !== 'accepted') {
      return res.status(400).json({
        message: 'Can only request cancellation for accepted leads'
      });
    }

    // Check time limit
    const acceptedTime = new Date(partnerAssignment.acceptedAt);
    const currentTime = new Date();
    const hoursElapsed = (currentTime - acceptedTime) / (1000 * 60 * 60);

    if (hoursElapsed > timeLimitHours) {
      return res.status(400).json({
        message: `Cancellation time limit exceeded. You can only cancel within ${timeLimitHours} hours of acceptance.`,
        timeLimitHours,
        hoursElapsed: Math.round(hoursElapsed * 100) / 100
      });
    }

    // Check if cancellation request already exists
    const existingRequest = await CancelRequest.hasPendingRequest(leadId, partnerId);
    if (existingRequest) {
      return res.status(400).json({
        message: 'Cancellation request already pending for this lead'
      });
    }

    // Create cancellation request
    const cancelRequest = new CancelRequest({
      lead: leadId,
      partner: partnerId,
      reason: reason.trim()
    });

    await cancelRequest.save();

    // Update partner assignment
    partnerAssignment.cancellationRequested = true;
    partnerAssignment.cancellationReason = reason.trim();
    partnerAssignment.cancellationRequestedAt = new Date();

    await lead.save();

    logger.info(`Cancellation request created for lead ${lead.leadId} by partner ${partnerId}`);

    res.json({
      success: true,
      message: 'Cancellation request submitted successfully. Awaiting admin approval.',
      data: {
        leadId: lead.leadId,
        requestId: cancelRequest._id,
        requestedAt: cancelRequest.requestedAt,
        reason: reason.trim(),
        timeLimitHours,
        hoursElapsed: Math.round(hoursElapsed * 100) / 100
      }
    });

  } catch (error) {
    logger.error('Error requesting lead cancellation:', error);
    res.status(500).json({ message: 'Failed to request cancellation', error: error.message });
  }
};

// @desc    Migrate cleaning service data to new format
// @route   POST /api/partners/migrate-cleaning-data
// @access  Private (Superadmin)
const migrateCleaningServiceData = async (req, res) => {
  try {
    console.log('🚀 Admin triggered cleaning data migration');

    // Find all partners with cleaning service that need migration
    const cleaningPartners = await Partner.find({
      serviceType: 'cleaning',
      $or: [
        { 'preferences.cleaning.serviceArea': { $exists: false } },
        { 'preferences.cleaning.serviceArea': {} },
        { 'preferences.cleaning.serviceArea': null }
      ]
    });

    console.log(`📊 Found ${cleaningPartners.length} cleaning partners to migrate`);

    let migratedCount = 0;
    let errorCount = 0;
    const migrationResults = [];

    for (const partner of cleaningPartners) {
      try {
        const cleaningPrefs = partner.preferences?.cleaning || {};
        let serviceArea = {};
        let hasDataToMigrate = false;

        // Migrate from citySettings format
        if (cleaningPrefs.citySettings) {
          // Handle both old and new citySettings formats
          const countryGrouped = {};
          Object.keys(cleaningPrefs.citySettings).forEach(key => {
            if (!key.includes('_radius')) {
              if (key.includes('-')) {
                // New format: "DE-Berlin"
                const [countryCode, city] = key.split('-');
                const cityData = cleaningPrefs.citySettings[key];

                if (!countryGrouped[countryCode]) {
                  countryGrouped[countryCode] = {};
                }

                countryGrouped[countryCode][city] = {
                  radius: cityData?.radius || 0
                };

                hasDataToMigrate = true;
              } else {
                // Old format: { "DE": ["Berlin", "Munich"] }
                const cities = cleaningPrefs.citySettings[key];
                const countryCode = key;

                if (Array.isArray(cities) && cities.length > 0) {
                  if (!countryGrouped[countryCode]) {
                    countryGrouped[countryCode] = {};
                  }

                  cities.forEach(city => {
                    countryGrouped[countryCode][city] = { radius: 0 };
                  });

                  hasDataToMigrate = true;
                }
              }
            }
          });

          // Convert grouped data to serviceArea format
          Object.keys(countryGrouped).forEach(countryCode => {
            serviceArea[countryCode] = {
              type: 'cities',
              cities: countryGrouped[countryCode]
            };
          });
        }

        // Migrate from old cities array format
        if (cleaningPrefs.cities?.length > 0 && Object.keys(serviceArea).length === 0) {
          const partnerCountry = partner.address?.country || 'DE';
          const citiesObj = {};

          cleaningPrefs.cities.forEach(city => {
            citiesObj[city] = { radius: cleaningPrefs.radius || 0 };
          });

          serviceArea[partnerCountry] = {
            type: 'cities',
            cities: citiesObj
          };

          // Add country to countries array if not present
          if (!cleaningPrefs.countries?.includes(partnerCountry)) {
            cleaningPrefs.countries = [...(cleaningPrefs.countries || []), partnerCountry];
          }

          hasDataToMigrate = true;
        }

        // Update partner if we have data to migrate
        if (hasDataToMigrate) {
          partner.preferences.cleaning.serviceArea = serviceArea;
          await partner.save();

          migratedCount++;
          migrationResults.push({
            partnerId: partner.partnerId,
            companyName: partner.companyName,
            status: 'success',
            serviceArea: serviceArea
          });
        } else {
          migrationResults.push({
            partnerId: partner.partnerId,
            companyName: partner.companyName,
            status: 'no_data',
            message: 'No data to migrate'
          });
        }

      } catch (error) {
        errorCount++;
        migrationResults.push({
          partnerId: partner.partnerId,
          companyName: partner.companyName,
          status: 'error',
          error: error.message
        });
      }
    }

    // Log the migration activity
    await createAuditLog(req.user._id, 'MIGRATE_CLEANING_DATA', null, {
      totalPartners: cleaningPartners.length,
      migratedCount,
      errorCount
    });

    res.status(200).json({
      message: 'Cleaning data migration completed',
      summary: {
        totalPartners: cleaningPartners.length,
        migratedCount,
        errorCount,
        results: migrationResults
      }
    });

  } catch (error) {
    logger.error('Error migrating cleaning data:', error);
    res.status(500).json({
      message: 'Failed to migrate cleaning data',
      error: error.message
    });
  }
};

// @desc    Clean up legacy keys from cleaning service preferences
// @route   POST /api/partners/cleanup-cleaning-preferences
// @access  Private (Superadmin)
const cleanupCleaningPreferences = async (req, res) => {
  try {
    console.log('🧹 Admin triggered cleanup of cleaning preferences');

    // Find all cleaning partners
    const cleaningPartners = await Partner.find({
      serviceType: 'cleaning'
    });

    console.log(`📊 Found ${cleaningPartners.length} cleaning partners to cleanup`);

    let cleanedCount = 0;
    let errorCount = 0;
    const cleanupResults = [];

    for (const partner of cleaningPartners) {
      try {
        const cleaningPrefs = partner.preferences?.cleaning;
        if (!cleaningPrefs) continue;

        const originalKeys = Object.keys(cleaningPrefs.toObject ? cleaningPrefs.toObject() : cleaningPrefs);

        // Keys to keep
        const keysToKeep = ['countries', 'serviceArea'];

        // Keys to remove (legacy)
        const keysToRemove = ['cities', 'citySettings', 'radius'];

        // Check what needs to be removed
        const keysFoundToRemove = keysToRemove.filter(key => cleaningPrefs[key] !== undefined);

        if (keysFoundToRemove.length > 0) {
          // Remove legacy keys
          keysToRemove.forEach(key => {
            if (cleaningPrefs[key] !== undefined) {
              cleaningPrefs[key] = undefined;
            }
          });

          // Ensure required keys exist
          if (!cleaningPrefs.countries) {
            cleaningPrefs.countries = [];
          }
          if (!cleaningPrefs.serviceArea) {
            cleaningPrefs.serviceArea = {};
          }

          // Mark the preferences as modified and save
          partner.markModified('preferences.cleaning');
          await partner.save();

          cleanedCount++;
          const finalKeys = Object.keys(partner.preferences.cleaning.toObject()).filter(key =>
            partner.preferences.cleaning[key] !== undefined
          );

          cleanupResults.push({
            partnerId: partner.partnerId,
            companyName: partner.companyName,
            status: 'cleaned',
            removedKeys: keysFoundToRemove,
            finalKeys: finalKeys
          });
        } else {
          cleanupResults.push({
            partnerId: partner.partnerId,
            companyName: partner.companyName,
            status: 'already_clean',
            message: 'No legacy keys found'
          });
        }

      } catch (error) {
        errorCount++;
        cleanupResults.push({
          partnerId: partner.partnerId,
          companyName: partner.companyName,
          status: 'error',
          error: error.message
        });
      }
    }

    // Log the cleanup activity
    await createAuditLog(req.user._id, 'CLEANUP_CLEANING_PREFERENCES', null, {
      totalPartners: cleaningPartners.length,
      cleanedCount,
      errorCount
    });

    res.status(200).json({
      message: 'Cleaning preferences cleanup completed',
      summary: {
        totalPartners: cleaningPartners.length,
        cleanedCount,
        errorCount,
        results: cleanupResults
      }
    });

  } catch (error) {
    logger.error('Error cleaning up cleaning preferences:', error);
    res.status(500).json({
      message: 'Failed to cleanup cleaning preferences',
      error: error.message
    });
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
  getPartnerLeads,
  acceptLead,
  cancelLeadBeforeAccept,
  cancelLeadAfterAccept,
  migrateCleaningServiceData,
  cleanupCleaningPreferences
};