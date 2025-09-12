// Lead Controller - Dynamic Lead Management
const Lead = require('../models/Lead');
const LeadUser = require('../models/LeadUser');  // Import LeadUser model at top level
const Partner = require('../models/Partner');
const Log = require('../models/Log');
const Service = require('../models/Service');
const { createAuditLog, logError } = require('../middleware/logging');
const logger = require('../utils/logger');
const NotificationService = require('../services/notificationService');
const { normalizeCountryToName, countriesMatch } = require('../utils/countryMapping');
const { isCityWithinRadius } = require('../utils/cityCoordinates');
// Removed pagination utility - implementing directly in controllers

// Helper function to detect domain from request
const detectDomainFromReq = (req, bodyDomain) => {
  // Priority: body.domain > origin header > referer header > host header
  return bodyDomain || 
         req.get('origin')?.replace(/^https?:\/\//, '') || 
         req.get('referer')?.replace(/^https?:\/\/([^\/]+).*$/, '$1') || 
         req.get('host') ||
         'unknown';
};

// Helper function to extract location from payload
const extractLocationFromPayload = (payload) => {
  let location = {};
  
  // Extract pickup location
  if (payload.pickupAddress) {
    if (typeof payload.pickupAddress === 'object') {
      location.pickup = {
        address: payload.pickupAddress.address || '',
        postalCode: payload.pickupAddress.postalCode || '',
        city: payload.pickupAddress.city || '',
        country: payload.pickupAddress.country || ''
      };
      // Also set legacy fields for backward compatibility
      location.city = payload.pickupAddress.city;
      location.country = payload.pickupAddress.country;
    } else if (typeof payload.pickupAddress === 'string') {
      // Handle legacy string format
      location.city = extractCityFromAddress(payload.pickupAddress);
    }
  } else if (payload.pickupLocation) {
    location.pickup = {
      address: payload.pickupLocation.address || '',
      postalCode: payload.pickupLocation.postalCode || '',
      city: payload.pickupLocation.city || '',
      country: payload.pickupLocation.country || ''
    };
    location.city = payload.pickupLocation.city;
    location.country = payload.pickupLocation.country;
  }
  
  // Extract destination location
  if (payload.deliveryAddress || payload.destinationAddress) {
    const destAddr = payload.deliveryAddress || payload.destinationAddress;
    if (typeof destAddr === 'object') {
      location.destination = {
        address: destAddr.address || '',
        postalCode: destAddr.postalCode || '',
        city: destAddr.city || '',
        country: destAddr.country || ''
      };
    } else if (typeof destAddr === 'string') {
      // Handle legacy string format - create basic destination object
      location.destination = {
        address: destAddr,
        postalCode: '',
        city: extractCityFromAddress(destAddr),
        country: ''
      };
    }
  } else if (payload.destinationLocation) {
    location.destination = {
      address: payload.destinationLocation.address || '',
      postalCode: payload.destinationLocation.postalCode || '',
      city: payload.destinationLocation.city || '',
      country: payload.destinationLocation.country || ''
    };
  }
  
  // Fallback: if no specific pickup/destination, try general address
  if (!location.pickup && payload.address) {
    if (typeof payload.address === 'object') {
      location.pickup = {
        address: payload.address.address || '',
        postalCode: payload.address.postalCode || '',
        city: payload.address.city || '',
        country: payload.address.country || ''
      };
    } else if (typeof payload.address === 'string') {
      location.city = extractCityFromAddress(payload.address);
    }
  }
  
  return location;
};

// @desc    Create new lead from user form
// @route   POST /api/leads/create
// @access  Public
const createLead = async (req, res) => {
  try {
    const { formData, serviceType, moveType, domain, user: userInfo } = req.body;
    
    // Get domain from request
    const sourceDomain = domain || 
                        req.get('origin')?.replace(/^https?:\/\//, '') || 
                        req.get('referer')?.replace(/^https?:\/\/([^\/]+).*$/, '$1') || 
                        'unknown';

    // Validate required fields
    if (!serviceType) {
      return res.status(400).json({ 
        success: false, 
        message: 'serviceType is required' 
      });
    }

    if (serviceType === 'moving' && !moveType) {
      return res.status(400).json({ 
        success: false, 
        message: 'moveType is required for moving service' 
      });
    }

    // Extract user info from either userInfo or formData
    let userData;
    if (userInfo) {
      userData = {
        salutation: userInfo.salutation || 'mister',
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        phone: userInfo.phone,
        bestReachTime: userInfo.bestReachTime || '8-12',
        preferredContactTime: userInfo.preferredContactTime || userInfo.bestReachTime || '8-12',
        consent: userInfo.consent || false
      };
    } else if (formData) {
      userData = {
        salutation: formData.salutation || 'mister',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        bestReachTime: formData.bestReachTime || '8-12',
        preferredContactTime: formData.preferredContactTime || '8-12',
        consent: formData.consent || false
      };
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'User information is required' 
      });
    }

    // Validate required user fields
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'firstName, lastName, email and phone are required' 
      });
    }

    // Create or find LeadUser
    let leadUser = await LeadUser.findOne({ email: userData.email });
    
    if (leadUser) {
      // Update existing user data and increment lead count
      Object.assign(leadUser, userData);
      leadUser.totalLeads += 1;
      await leadUser.save();
    } else {
      // Create new user
      leadUser = new LeadUser({
        ...userData,
        totalLeads: 1
      });
      await leadUser.save();
    }

    // Extract location info for partner matching
    const location = extractLocationFromPayload(formData || {});

    // Create lead
    const lead = new Lead({
      serviceType,
      moveType: moveType || null,
      sourceDomain,
      user: leadUser._id,
      formData: formData || req.body,
      location,
      status: 'pending',
      estimatedValue: calculateEstimatedValue(serviceType, formData || {})
    });

    await lead.save();

    // Background geocoding for lead locations
    try {
      await geocodeLeadLocationsBackground(lead._id, formData || {}, serviceType);
    } catch (error) {
      logger.warn(`Background geocoding failed for lead ${lead._id}: ${error.message}`);
    }

    // Populate user data for response
    await lead.populate('user');

    // Log lead creation
    try {
      if (Log && typeof Log.createLog === 'function') {
        await Log.createLog({
          actor: { type: 'user', name: leadUser.fullName, email: leadUser.email },
          action: 'lead_created',
          serviceType: serviceType,
          leadId: lead._id,
          status: 'success',
          message: `Lead ${lead.leadId} created from ${sourceDomain}`,
          details: { domain: sourceDomain, serviceType, moveType },
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            domain: sourceDomain
          }
        });
      }
    } catch (err) {
      console.warn('Logging error:', err);
    }

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: {
        leadId: lead.leadId,
        serviceType: lead.serviceType,
        moveType: lead.moveType,
        fullLead: lead.toObject()
      }
    });

  } catch (error) {
    console.error('createLead error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create lead', 
      error: error.message 
    });
  }
};

// Create lead (public)

// Helper function to get provider count by domain
const getProviderCountByDomain = (domain) => {
  if (domain.includes('umzug-anbieter-vergleich.de')) return 110;
  if (domain.includes('reinigungsfirma-vergleich.de')) return 244;
  return 50; // default
};

// Helper function to calculate estimated lead value
const calculateEstimatedValue = (serviceType, formData) => {
  // Basic pricing logic - can be enhanced
  if (serviceType === 'moving') {
    let baseValue = 50;
    if (formData.roomCount) baseValue += formData.roomCount * 25;
    if (formData.additionalServices?.length) baseValue += formData.additionalServices.length * 30;
    return baseValue;
  } else if (serviceType === 'cleaning') {
    let baseValue = 30;
    if (formData.areaSize) {
      const sizeMultipliers = { '0-50': 50, '50-100': 100, '100-200': 200, '200-500': 400, '500+': 800 };
      baseValue += sizeMultipliers[formData.areaSize] || 100;
    }
    if (formData.serviceTypes?.length) baseValue += formData.serviceTypes.length * 20;
    return baseValue;
  }
  return 50;
};

// @desc    Get all leads (Superadmin) or partner leads (Partner)
// @route   GET /api/leads
// @access  Private (Superadmin/Partner)
const getAllLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 8,
      search,
      serviceType,
      status,
      assignedPartner,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      city
    } = req.query;

    // Build filter object
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'partner') {
      filter.assignedPartner = req.user.id;
    }

    // Service type filter
    if (serviceType) {
      filter.serviceType = serviceType;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Assigned partner filter (for superadmin)
    if (assignedPartner && req.user.role === 'superadmin') {
      if (assignedPartner === 'unassigned') {
        // Filter for leads with no assigned partner
        filter.$or = filter.$or ? [
          ...filter.$or,
          { assignedPartner: { $exists: false } },
          { assignedPartner: null }
        ] : [
          { assignedPartner: { $exists: false } },
          { assignedPartner: null }
        ];
      } else {
        filter.assignedPartner = assignedPartner;
      }
    }

    // Date range filter - check both creation date and pickup dates for moving leads
    if (startDate || endDate) {
      const filterStartDate = startDate ? new Date(startDate) : null;
      const filterEndDate = endDate ? new Date(endDate) : null;
      
      // Set proper time boundaries for accurate comparison
      if (filterStartDate) {
        filterStartDate.setHours(0, 0, 0, 0);
      }
      if (filterEndDate) {
        filterEndDate.setHours(23, 59, 59, 999);
      }
      
      // For moving service, also check pickup dates in form data
      if (serviceType === 'moving') {
        const dateConditions = [];
        
        // Check creation date
        const dateQuery = {};
        if (filterStartDate) dateQuery.$gte = filterStartDate;
        if (filterEndDate) dateQuery.$lte = filterEndDate;
        dateConditions.push({ createdAt: dateQuery });
        
        // Check fixed date
        if (filterStartDate && filterEndDate) {
          dateConditions.push({ 
            'formData.fixedDate': { 
              $gte: filterStartDate, 
              $lte: filterEndDate 
            } 
          });
        } else if (filterStartDate) {
          dateConditions.push({ 'formData.fixedDate': { $gte: filterStartDate } });
        } else if (filterEndDate) {
          dateConditions.push({ 'formData.fixedDate': { $lte: filterEndDate } });
        }
        
        // Check flexible date range overlap
        if (filterStartDate && filterEndDate) {
          dateConditions.push({
            $and: [
              { 'formData.flexibleDateRange.startDate': { $lte: filterEndDate } },
              { 'formData.flexibleDateRange.endDate': { $gte: filterStartDate } }
            ]
          });
        } else if (filterStartDate) {
          dateConditions.push({ 'formData.flexibleDateRange.endDate': { $gte: filterStartDate } });
        } else if (filterEndDate) {
          dateConditions.push({ 'formData.flexibleDateRange.startDate': { $lte: filterEndDate } });
        }
        
        // Check moveDate (fallback)
        if (filterStartDate && filterEndDate) {
          dateConditions.push({ 
            'formData.moveDate': { 
              $gte: filterStartDate, 
              $lte: filterEndDate 
            } 
          });
        } else if (filterStartDate) {
          dateConditions.push({ 'formData.moveDate': { $gte: filterStartDate } });
        } else if (filterEndDate) {
          dateConditions.push({ 'formData.moveDate': { $lte: filterEndDate } });
        }
        
        // Add date conditions to existing $or if it exists, or create new one
        if (filter.$or) {
          // If there are existing $or conditions (like city filter), combine them with AND logic
          filter.$and = filter.$and || [];
          filter.$and.push({ $or: filter.$or }, { $or: dateConditions });
          delete filter.$or;
        } else {
          filter.$or = dateConditions;
        }
      } else {
        const dateQuery = {};
        if (filterStartDate) dateQuery.$gte = filterStartDate;
        if (filterEndDate) dateQuery.$lte = filterEndDate;
        filter.createdAt = dateQuery;
      }
    }

    // City filter (search in pickup and destination cities)
    if (city) {
      const cityConditions = [
        { 'formData.pickupAddress.city': new RegExp(city, 'i') },
        { 'formData.destinationAddress.city': new RegExp(city, 'i') },
        { 'formData.deliveryAddress.city': new RegExp(city, 'i') }, // For backward compatibility
        { 'formData.address.city': new RegExp(city, 'i') }, // For non-moving services
        // Also search in legacy city field for backward compatibility
        { 'city': new RegExp(city, 'i') },
        { 'location.city': new RegExp(city, 'i') }
      ];
      
      // Add city conditions to existing filter structure
      if (filter.$or) {
        // If there are existing $or conditions (like date filter), combine them with AND logic
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or }, { $or: cityConditions });
        delete filter.$or;
      } else if (filter.$and) {
        // If there's already an $and condition, add city filter to it
        filter.$and.push({ $or: cityConditions });
      } else {
        filter.$or = cityConditions;
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

    // If there's a search query, we need to use aggregation pipeline to search in populated user fields
    let leads, total;
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      
      // Build aggregation pipeline
      const pipeline = [
        // Lookup to join with LeadUser collection
        {
          $lookup: {
            from: 'leadusers',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        // Unwind user array to single object
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },
        // Match stage for search
        {
          $match: {
            ...filter,
            $or: [
              { leadId: searchRegex },
              { 'user.firstName': searchRegex },
              { 'user.lastName': searchRegex },
              { 'user.email': searchRegex },
              {
                $expr: {
                  $regexMatch: {
                    input: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    regex: search,
                    options: 'i'
                  }
                }
              }
            ]
          }
        },
        // Lookup for assignedPartner
        {
          $lookup: {
            from: 'partners',
            localField: 'assignedPartner',
            foreignField: '_id',
            as: 'assignedPartner'
          }
        },
        {
          $unwind: {
            path: '$assignedPartner',
            preserveNullAndEmptyArrays: true
          }
        },
        // Sort
        { $sort: sort },
        // Facet for pagination and total count
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limitNum }
            ],
            totalCount: [
              { $count: 'count' }
            ]
          }
        }
      ];

      const result = await Lead.aggregate(pipeline);
      leads = result[0].data;
      total = result[0].totalCount[0]?.count || 0;
    } else {
      // No search query, use regular find with populate
      [leads, total] = await Promise.all([
        Lead.find(filter)
          .populate('assignedPartner', 'companyName contactPerson.email')
          .populate({
            path: 'user',
            select: 'salutation firstName lastName email phone bestReachTime preferredContactTime consent',
            // Make population optional - don't fail if user reference is invalid
            options: { strictPopulate: false }
          })
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Lead.countDocuments(filter)
      ]);
    }

    // Transform leads to handle both old and new schema formats
    const transformedLeads = leads.map(lead => {
      // If user is not populated (old schema), keep the existing user object
      if (!lead.user || (typeof lead.user === 'object' && !lead.user._id)) {
        // Old schema: user is already an object with firstName, lastName, etc.
        return lead;
      }
      
      // New schema: user is populated from LeadUser collection
      return lead;
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Calculate stats for the filtered results (using the same filter for consistency)
    const statsFilter = { ...filter };
    
    const [pendingCount, assignedCount, acceptedCount] = await Promise.all([
      Lead.countDocuments({ ...statsFilter, status: 'pending' }),
      Lead.countDocuments({ ...statsFilter, status: 'assigned' }),
      Lead.countDocuments({ ...statsFilter, status: 'accepted' })
    ]);

    res.json({
      success: true,
      leads: transformedLeads,
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
        pending: pendingCount,
        assigned: assignedCount,
        accepted: acceptedCount
      },
      filters: {
        search,
        serviceType,
        status,
        assignedPartner: req.user.role === 'partner' ? req.user.id : assignedPartner,
        city,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get leads', 
      error: error.message 
    });
  }
};

// @desc    Get leads assigned to partner
// @route   GET /api/leads/partner/:partnerId
// @access  Private (Partner/Superadmin)
const getPartnerLeads = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const {
      page = 1,
      limit = 8,
      search,
      serviceType,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    // Partners can only see their own leads
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    // Build filter object
    const filter = { assignedPartner: partnerId };

    // Service type filter
    if (serviceType) {
      filter.serviceType = serviceType;
    }

    // Status filter - map partner status terms to actual database statuses
    if (status) {
      switch (status) {
        case 'pending':
          filter.status = 'assigned'; // Assigned but not yet acted upon
          break;
        case 'accepted':
          filter.status = 'accepted';
          break;
        case 'reject request':
          filter.cancellationRequested = true;
          filter.cancellationApproved = false;
          break;
        case 'reject':
          filter.status = 'cancelled';
          filter.cancellationApproved = true;
          break;
        case 'reject cancelled':
        case 'assigned':
          filter.status = 'assigned';
          break;
        default:
          filter.status = status;
      }
    }

    // Date range filter - use assignedAt for partner leads
    if (startDate || endDate) {
      filter.assignedAt = {};
      if (startDate) filter.assignedAt.$gte = new Date(startDate);
      if (endDate) filter.assignedAt.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { leadId: new RegExp(search, 'i') },
        { 'user.firstName': new RegExp(search, 'i') },
        { 'user.lastName': new RegExp(search, 'i') },
        { 'user.email': new RegExp(search, 'i') },
        // Full name search: firstName + " " + lastName
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
              regex: search,
              options: 'i'
            }
          }
        }
      ];
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
        .populate('user', 'salutation firstName lastName email phone bestReachTime preferredContactTime consent')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Lead.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      success: true,
      leads: transformedLeads,
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
        serviceType,
        status,
        partnerId,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get partner leads', 
      error: error.message 
    });
  }
};

// @desc    Get available partners for lead assignment
// @route   GET /api/leads/:leadId/available-partners
// @access  Private (Superadmin)
const getAvailablePartners = async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Get all active partners that provide this service
    const partners = await Partner.find({
      status: 'active',
      services: { $in: [lead.serviceType] }
    }).lean();

    // Calculate current week range
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // End of current week (Saturday)
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Get current week's lead assignments for all partners
    const currentWeekLeads = await Lead.find({
      assignedPartner: { $in: partners.map(p => p._id) },
      assignedAt: { $gte: currentWeekStart, $lte: currentWeekEnd }
    }).lean();

    // Create map of partner current week lead counts
    const partnerWeeklyCount = {};
    currentWeekLeads.forEach(leadAssignment => {
      const partnerId = leadAssignment.assignedPartner.toString();
      partnerWeeklyCount[partnerId] = (partnerWeeklyCount[partnerId] || 0) + 1;
    });

    // Filter and score partners
    const availablePartners = partners.map(partner => {
      const partnerId = partner._id.toString();
      const currentWeekLeadsCount = partnerWeeklyCount[partnerId] || 0;
      const avgLeadsPerWeek = partner.preferences?.averageLeadsPerWeek || 5;
      
      // Enhanced location matching logic with new city radius system
      let locationMatch = false;
      
      // Extract pickup and destination from formData (new format) or location (legacy format)
      const leadPickupCity = lead.formData?.pickupAddress?.city?.toLowerCase() || lead.location?.pickup?.city?.toLowerCase();
      const leadPickupCountry = lead.formData?.pickupAddress?.country?.toLowerCase() || lead.location?.pickup?.country?.toLowerCase();
      const leadDestinationCity = lead.formData?.destinationAddress?.city?.toLowerCase() || lead.location?.destination?.city?.toLowerCase();
      const leadDestinationCountry = lead.formData?.destinationAddress?.country?.toLowerCase() || lead.location?.destination?.country?.toLowerCase();
      
      // Fallback to legacy location format for single address
      const leadCity = leadPickupCity || lead.location?.city?.toLowerCase();
      const leadCountry = leadPickupCountry || lead.location?.country?.toLowerCase();
      
      if (lead.serviceType === 'moving' && partner.preferences?.moving) {
        // Read from new serviceArea structure (with fallback to old structure for backward compatibility)
        const serviceArea = partner.preferences.moving.serviceArea || {};
        const serviceAreaObj = serviceArea instanceof Map ? Object.fromEntries(serviceArea) : serviceArea;
        
        // Extract countries and citySettings from new structure for backward compatibility with existing logic
        const countries = Object.keys(serviceAreaObj);
        const citySettings = {};
        
        // Convert new structure to old structure format for existing logic
        Object.entries(serviceAreaObj).forEach(([countryName, config]) => {
          if (config.type === 'cities' && config.cities) {
            const citiesObj = config.cities instanceof Map ? Object.fromEntries(config.cities) : config.cities;
            Object.entries(citiesObj).forEach(([cityName, cityConfig]) => {
              const cityKey = `${countryName}-${cityName}`;
              citySettings[cityKey] = {
                radius: cityConfig.radius || 0,
                country: countryName
              };
            });
          }
        });
        
        // Fallback to old structure if new structure not available
        if (countries.length === 0 && partner.preferences.moving.countries) {
          countries.push(...partner.preferences.moving.countries);
          Object.assign(citySettings, partner.preferences.moving.citySettings || {});
        }
        
        // Priority 1: Check configured cities with radius
        if (Object.keys(citySettings).length > 0) {
          // Get unique countries that have cities configured
          const countriesWithCities = [...new Set(Object.keys(citySettings).map(cityKey => cityKey.split('-')[0]))];
          
          // Check both pickup and destination addresses
          const checkAddress = (addressCity, addressCountry) => {
            if (!addressCity || !addressCountry) return false;
            
            // If this country has cities configured, ONLY check cities (no country fallback)
            // Normalize country name to handle both codes and names
            const normalizedAddressCountry = normalizeCountryToName(addressCountry);
            const hasConfiguredCities = countriesWithCities.some(country => 
              countriesMatch(country, normalizedAddressCountry)
            );
            
            if (hasConfiguredCities) {
              for (const [cityKey, setting] of Object.entries(citySettings)) {
                const [partnerCountry, partnerCity] = cityKey.split('-');
                
                // Country must match first (use country matching utility)
                if (!countriesMatch(partnerCountry, addressCountry)) continue;
                
                const partnerCityLower = partnerCity.toLowerCase();
                const addressCityLower = addressCity.toLowerCase();
                
                // Check exact city match
                if (partnerCityLower === addressCityLower || 
                    partnerCityLower.includes(addressCityLower) || 
                    addressCityLower.includes(partnerCityLower)) {
                  
                  // City match found - check radius using real distance calculation
                  const radius = setting.radius || 0;
                  return isCityWithinRadius(partnerCity, addressCity, radius);
                }
              }
              // No city match found for this country with configured cities
              return false;
            } else {
              // This country has no cities configured, check if it's in the countries list
              return countries.some(country => 
                countriesMatch(country, addressCountry)
              );
            }
          };
          
          // For moving service: BOTH pickup AND destination must match
          let pickupMatch = false;
          let destinationMatch = false;
          
          // Check pickup address (use specific pickup data if available, otherwise fallback)
          if (leadPickupCity && leadPickupCountry) {
            pickupMatch = checkAddress(leadPickupCity, leadPickupCountry);
          } else if (leadCity && leadCountry) {
            pickupMatch = checkAddress(leadCity, leadCountry);
          }
          
          // Check destination address (use specific destination data if available)
          if (leadDestinationCity && leadDestinationCountry) {
            destinationMatch = checkAddress(leadDestinationCity, leadDestinationCountry);
          } else if (leadCity && leadCountry) {
            // Only fallback to legacy if no destination data exists
            destinationMatch = checkAddress(leadCity, leadCountry);
          }
          
          // Both addresses must match (for moving service with pickup and destination)
          if (leadPickupCity && leadDestinationCity) {
            // Modern format: both pickup AND destination must match their respective addresses
            locationMatch = pickupMatch && destinationMatch;
          } else {
            // Legacy format: single address, either pickup or destination matching is sufficient
            locationMatch = pickupMatch || destinationMatch;
          }
        } 
        // Priority 2: If NO cities configured at all, fall back to pure country matching
        else if (countries.length > 0) {
          const checkCountry = (addressCountry) => {
            if (!addressCountry) return false;
            return countries.some(country => 
              countriesMatch(country, addressCountry)
            );
          };
          
          // For moving service: BOTH pickup AND destination countries must match
          let pickupCountryMatch = false;
          let destinationCountryMatch = false;
          
          // Check pickup country (use specific pickup data if available, otherwise fallback)
          if (leadPickupCountry) {
            pickupCountryMatch = checkCountry(leadPickupCountry);
          } else if (leadCountry) {
            pickupCountryMatch = checkCountry(leadCountry);
          }
          
          // Check destination country (use specific destination data if available)
          if (leadDestinationCountry) {
            destinationCountryMatch = checkCountry(leadDestinationCountry);
          } else if (leadCountry) {
            // Only fallback to legacy if no destination data exists
            destinationCountryMatch = checkCountry(leadCountry);
          }
          
          // Both countries must match (for moving service with pickup and destination)
          if (leadPickupCountry && leadDestinationCountry) {
            locationMatch = pickupCountryMatch && destinationCountryMatch;
          } else {
            // For single address (legacy), just check that country
            locationMatch = pickupCountryMatch || destinationCountryMatch;
          }
        }
      } else if (lead.serviceType === 'cleaning' && partner.preferences?.cleaning) {
        const cities = partner.preferences.cleaning.cities || [];
        const cleaningRadius = partner.preferences.cleaning.radius || 0;
        
        // For cleaning: city-based matching with global radius
        if (cities.length > 0) {
          const addressCity = leadCity || leadPickupCity;
          
          locationMatch = cities.some(city => {
            const partnerCity = city.toLowerCase();
            const match = partnerCity === addressCity || 
                         partnerCity.includes(addressCity) || 
                         addressCity?.includes(partnerCity);
            
            if (match && cleaningRadius === 0) {
              // City only - exact match required
              return partnerCity === addressCity;
            }
            
            // TODO: Implement radius-based matching for cleaning service area
            return match;
          });
        }
      }

      // Calculate availability score
      const weeklyCapacityUsed = avgLeadsPerWeek > 0 ? (currentWeekLeadsCount / avgLeadsPerWeek) * 100 : 0;
      const hasCapacity = currentWeekLeadsCount < avgLeadsPerWeek;
      
      // Priority score: exclusive partners get higher priority
      let priorityScore = partner.partnerType === 'exclusive' ? 100 : 50;
      
      // Reduce score based on current workload
      priorityScore -= weeklyCapacityUsed;
      
      // Boost score for location match
      if (locationMatch) {
        priorityScore += 25;
      }
      
      // Boost score for better acceptance rate
      const acceptanceRate = partner.metrics?.totalLeadsReceived > 0 
        ? (partner.metrics.totalLeadsAccepted / partner.metrics.totalLeadsReceived) * 100 
        : 0;
      priorityScore += acceptanceRate * 0.2;

      return {
        _id: partner._id,
        partnerId: partner.partnerId,
        companyName: partner.companyName,
        contactPerson: partner.contactPerson,
        partnerType: partner.partnerType,
        currentWeekLeads: currentWeekLeadsCount,
        averageLeadsPerWeek: avgLeadsPerWeek,
        capacityUsed: Math.round(weeklyCapacityUsed),
        hasCapacity,
        locationMatch,
        acceptanceRate: Math.round(acceptanceRate),
        priorityScore: Math.round(priorityScore),
        services: partner.services,
        preferences: partner.preferences
      };
    })
    .filter(partner => partner.hasCapacity && partner.locationMatch); // Only show partners with capacity AND location match

    // Separate partners by type for tabbed display
    const exclusivePartners = availablePartners.filter(partner => partner.partnerType === 'exclusive');
    const basicPartners = availablePartners.filter(partner => partner.partnerType === 'basic');
    
    // Sort each type by priority score
    const sortedExclusivePartners = exclusivePartners.sort((a, b) => b.priorityScore - a.priorityScore);
    const sortedBasicPartners = basicPartners.sort((a, b) => b.priorityScore - a.priorityScore);

    res.json({
      success: true,
      lead: {
        id: lead._id,
        leadId: lead.leadId,
        serviceType: lead.serviceType,
        location: lead.location,
        user: lead.user
      },
      partnerTabs: {
        exclusive: {
          partners: sortedExclusivePartners,
          count: sortedExclusivePartners.length
        },
        basic: {
          partners: sortedBasicPartners,
          count: sortedBasicPartners.length
        }
      },
      // Legacy support - all partners combined, exclusive first
      availablePartners: [...sortedExclusivePartners, ...sortedBasicPartners],
      totalPartners: availablePartners.length,
      exclusiveAvailable: exclusivePartners.length > 0,
      basicAvailable: basicPartners.length > 0,
      weekRange: {
        start: currentWeekStart,
        end: currentWeekEnd
      }
    });

  } catch (error) {
    await logError('get_available_partners_failed', error, req, {
      leadId: req.params.leadId,
      serviceType: 'system'
    });
    res.status(500).json({ message: 'Failed to get available partners', error: error.message });
  }
};

// @desc    Assign lead to partner
// @route   PUT /api/leads/:leadId/assign
// @access  Private (Superadmin)
const assignLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { partnerId } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner || partner.status !== 'active') {
      return res.status(400).json({ message: 'Invalid or inactive partner' });
    }

    // Check if partner provides this service
    const partnerServices = partner.services.map(s => s.serviceType || s);
    if (!partnerServices.includes(lead.serviceType)) {
      return res.status(400).json({ message: 'Partner does not provide this service' });
    }

    // Check existing assignments for exclusive partner rules
    const existingAssignment = await Lead.findOne({
      _id: leadId,
      assignedPartner: { $exists: true },
      status: { $in: ['assigned', 'accepted'] }
    }).populate('assignedPartner');

    // Exclusive partner assignment rules
    if (partner.partnerType === 'exclusive') {
      if (existingAssignment && existingAssignment.assignedPartner) {
        // Rule 1: Cannot assign to different exclusive partner
        if (existingAssignment.assignedPartner.partnerType === 'exclusive' &&
            existingAssignment.assignedPartner._id.toString() !== partnerId) {
          return res.status(400).json({ 
            message: 'Lead is already assigned to another exclusive partner',
            rule: 'One lead can only be assigned to one exclusive partner at a time',
            currentAssignment: {
              partnerName: existingAssignment.assignedPartner.companyName,
              partnerType: 'exclusive',
              assignedAt: existingAssignment.assignedAt
            }
          });
        }
        
        // Rule 2: Cannot take accepted leads from basic partners
        if (existingAssignment.assignedPartner.partnerType === 'basic' && 
            existingAssignment.status === 'accepted') {
          return res.status(400).json({ 
            message: 'Lead has already been accepted by a basic partner and cannot be reassigned',
            rule: 'Exclusive partners can only take leads before basic partner acceptance',
            currentAssignment: {
              partnerName: existingAssignment.assignedPartner.companyName,
              partnerType: 'basic',
              status: 'accepted',
              acceptedAt: existingAssignment.acceptedAt
            }
          });
        }
      }
    } else if (partner.partnerType === 'basic') {
      // Rule 2: Basic cannot take lead from exclusive
      if (existingAssignment && 
          existingAssignment.assignedPartner && 
          existingAssignment.assignedPartner.partnerType === 'exclusive') {
        return res.status(400).json({ 
          message: 'Lead is already assigned to an exclusive partner and cannot be reassigned to basic partners',
          rule: 'Exclusive assignments are protected from basic partner reassignment',
          currentAssignment: {
            partnerName: existingAssignment.assignedPartner.companyName,
            partnerType: 'exclusive',
            assignedAt: existingAssignment.assignedAt
          }
        });
      }
    }

    // Check partner capacity (optional validation)
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const currentWeekLeadsCount = await Lead.countDocuments({
      assignedPartner: partnerId,
      assignedAt: { $gte: currentWeekStart, $lte: currentWeekEnd }
    });

    const avgLeadsPerWeek = partner.preferences?.averageLeadsPerWeek || 5;
    
    // Warn if over capacity (but still allow assignment)
    let capacityWarning = null;
    if (currentWeekLeadsCount >= avgLeadsPerWeek) {
      capacityWarning = `Partner is at/over capacity: ${currentWeekLeadsCount}/${avgLeadsPerWeek} leads this week`;
    }

    // Assign lead to partner (overwrites any existing assignment)
    const previousPartner = lead.assignedPartner;
    lead.assignedPartner = partnerId;
    lead.assignedAt = new Date();
    lead.status = 'assigned';
    await lead.save();

    // Update partner metrics
    partner.metrics.totalLeadsReceived += 1;
    await partner.save();

    // Create lead assignment notification for partner
    try {
      const leadData = {
        customerName: lead.customerName,
        location: lead.city || lead.country,
        service: lead.serviceType,
        priority: 'high'
      };
      
      await NotificationService.createLeadAssignedNotification(
        partnerId,
        leadId,
        leadData
      );
      
      logger.info(`Lead assignment notification created for partner ${partner.companyName}`);
    } catch (notificationError) {
      logger.error('Failed to create lead assignment notification:', notificationError);
      // Don't fail the entire operation if notification creation fails
    }

    // Log the assignment with context
    if (previousPartner) {
      logger.info(`Lead ${lead.leadId} reassigned from ${previousPartner} to ${partner.partnerType} partner ${partner.companyName}`);
    } else {
      logger.info(`Lead ${lead.leadId} assigned to ${partner.partnerType} partner ${partner.companyName}`);
    }

    res.json({
      success: true,
      message: 'Lead assigned successfully',
      lead,
      ...(capacityWarning && { warning: capacityWarning }),
      assignmentInfo: {
        partnerName: partner.companyName,
        partnerType: partner.partnerType,
        currentWeekLeads: currentWeekLeadsCount + 1,
        averageLeadsPerWeek: avgLeadsPerWeek,
        capacityUsed: Math.round(((currentWeekLeadsCount + 1) / avgLeadsPerWeek) * 100)
      }
    });
  } catch (error) {
    await logError('lead_assignment_failed', error, req, {
      leadId: req.params.leadId,
      partnerId: req.body.partnerId
    });
    res.status(500).json({ message: 'Failed to assign lead', error: error.message });
  }
};

// @desc    Accept lead (Partner)
// @route   PUT /api/leads/:leadId/accept
// @access  Private (Partner)
const acceptLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.assignedPartner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (lead.status !== 'assigned') {
      return res.status(400).json({ message: 'Lead cannot be accepted' });
    }

    lead.status = 'accepted';
    lead.acceptedAt = new Date();
    await lead.save();

    // Update partner metrics
    const partner = await Partner.findById(req.user.id);
    partner.metrics.totalLeadsAccepted += 1;
    await partner.save();

    logger.info(`Lead ${lead.leadId} accepted by partner ${req.user.id}`);

    res.json({
      success: true,
      message: 'Lead accepted successfully',
      lead: {
        ...lead.toObject(),
        // Now partner can see full contact details
        user: lead.user
      }
    });
  } catch (error) {
    await logError('lead_accept_failed', error, req, {
      leadId: req.params.leadId,
      partnerId: req.user.id
    });
    res.status(500).json({ message: 'Failed to accept lead', error: error.message });
  }
};

// @desc    Request lead cancellation
// @route   PUT /api/leads/:leadId/cancel
// @access  Public (User) or Private (Partner)
const requestCancellation = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { reason } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.status === 'cancelled') {
      return res.status(400).json({ message: 'Lead already cancelled' });
    }

    lead.cancellationRequested = true;
    lead.cancellationReason = reason;
    lead.cancellationRequestedAt = new Date();
    await lead.save();

    logger.info(`Cancellation requested for lead ${lead.leadId}`);

    res.json({
      success: true,
      message: 'Cancellation request submitted. Awaiting admin approval.'
    });
  } catch (error) {
    await logError('cancellation_request_failed', error, req, {
      leadId: req.params.leadId
    });
    res.status(500).json({ message: 'Failed to request cancellation', error: error.message });
  }
};

// @desc    Get lead by ID
// @route   GET /api/leads/:leadId
// @access  Private (Superadmin/Partner)
const getLeadById = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId)
      .populate('assignedPartner', 'companyName contactPerson.email')
      .populate('user', 'salutation firstName lastName email phone bestReachTime preferredContactTime consent');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check permissions - partners can only see their assigned leads
    if (req.user.role === 'partner' && lead.assignedPartner?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mask sensitive contact information if partner hasn't accepted the lead
    let responseData = { ...lead.toObject() };
    
    if (req.user.role === 'partner' && lead.status !== 'accepted') {
      // Mask user contact details
      if (responseData.user) {
        responseData.user = {
          ...responseData.user,
          phone: '***-***-****',
          email: '***@***.***',
        };
      }
      
      // Mask location/address details
      if (responseData.location) {
        responseData.location = {
          ...responseData.location,
          from: responseData.location.from ? {
            ...responseData.location.from,
            address: '*** Hidden until accepted ***',
            coordinates: [0, 0]
          } : undefined,
          to: responseData.location.to ? {
            ...responseData.location.to,
            address: '*** Hidden until accepted ***', 
            coordinates: [0, 0]
          } : undefined,
          property: responseData.location.property ? {
            ...responseData.location.property,
            address: '*** Hidden until accepted ***',
            coordinates: [0, 0]
          } : undefined
        };
      }
    }

    res.json({
      success: true,
      lead: responseData
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get lead', error: error.message });
  }
};

// Helper function to extract city from address
const extractCityFromAddress = (address) => {
  // Simple implementation - in production, use geocoding service
  const parts = address.split(',');
  return parts[parts.length - 2]?.trim() || '';
};

// @desc    Get leads statistics
// @route   GET /api/leads/stats
// @access  Private (Superadmin/Partner)
const getLeadStats = async (req, res) => {
  try {
    // This is a placeholder endpoint - implement actual statistics logic
    res.json({
      success: true,
      stats: {
        total: 0,
        pending: 0,
        assigned: 0,
        completed: 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get lead statistics', 
      error: error.message 
    });
  }
};

// @desc    Update lead status
// @route   PATCH /api/leads/:leadId/status
// @access  Private (Superadmin/Partner)
const updateLeadStatus = async (req, res) => {
  try {
    // This endpoint is not implemented yet
    res.status(501).json({ 
      success: false,
      message: 'Status update endpoint not implemented yet' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to update lead status', 
      error: error.message 
    });
  }
};

// @desc    Export leads to Excel format
// @route   GET /api/leads/export/xlsx
// @access  Private (Superadmin)
const exportLeadsToExcel = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const {
      serviceType,
      status,
      assignedPartner,
      startDate,
      endDate,
      city,
      search
    } = req.query;

    // Build filter object (same as getAllLeads)
    const filter = {};
    
    // Service type filter
    if (serviceType) {
      filter.serviceType = serviceType;
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Assigned partner filter
    if (assignedPartner && assignedPartner !== 'all') {
      if (assignedPartner === 'unassigned') {
        filter.$or = [
          { assignedPartner: { $exists: false } },
          { assignedPartner: null }
        ];
      } else {
        filter.assignedPartner = assignedPartner;
      }
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // City filter
    if (city) {
      filter.$or = filter.$or ? [
        ...filter.$or,
        { 'formData.pickupAddress': new RegExp(city, 'i') },
        { 'formData.deliveryAddress': new RegExp(city, 'i') },
        { 'location.city': new RegExp(city, 'i') }
      ] : [
        { 'formData.pickupAddress': new RegExp(city, 'i') },
        { 'formData.deliveryAddress': new RegExp(city, 'i') },
        { 'location.city': new RegExp(city, 'i') }
      ];
    }
    

    // Get all leads matching filter (no pagination for export)
    const leads = await Lead.find(filter)
      .populate('assignedPartner', 'companyName partnerType contactPerson')
      .populate('user', 'salutation firstName lastName email phone bestReachTime preferredContactTime consent')
      .sort({ createdAt: -1 })
      .lean();

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads Export');

    // Define columns with more comprehensive data
    worksheet.columns = [
      { header: 'Lead ID', key: 'leadId', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 20 },
      { header: 'Salutation', key: 'salutation', width: 12 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Service Type', key: 'serviceType', width: 15 },
      { header: 'Location/City', key: 'city', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Assigned Partner', key: 'assignedPartner', width: 25 },
      { header: 'Partner Type', key: 'partnerType', width: 12 },
      { header: 'Partner Contact', key: 'partnerContact', width: 20 },
      { header: 'Source Domain', key: 'sourceDomain', width: 30 },
      { header: 'Estimated Value (€)', key: 'estimatedValue', width: 18 },
      { header: 'Pickup Address', key: 'pickupAddress', width: 40 },
      { header: 'Delivery Address', key: 'deliveryAddress', width: 40 },
      { header: 'Room Count', key: 'roomCount', width: 12 },
      { header: 'Area Size', key: 'areaSize', width: 12 },
      { header: 'Additional Services', key: 'additionalServices', width: 30 },
      { header: 'Preferred Contact Time', key: 'preferredContactTime', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Assigned At', key: 'assignedAt', width: 20 },
      { header: 'Accepted At', key: 'acceptedAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows with comprehensive information
    leads.forEach(lead => {
      const customerName = lead.user ? 
        `${lead.user.firstName || ''} ${lead.user.lastName || ''}`.trim() : 
        '';
      
      const partnerContact = lead.assignedPartner?.contactPerson ? 
        `${lead.assignedPartner.contactPerson.firstName || ''} ${lead.assignedPartner.contactPerson.lastName || ''}`.trim() :
        '';
        
      // Extract form data for additional fields
      const formData = lead.formData || {};
      const additionalServices = Array.isArray(formData.additionalServices) ? 
        formData.additionalServices.join(', ') : 
        formData.additionalServices || '';
      
      worksheet.addRow({
        leadId: lead.leadId || lead._id.toString(),
        customerName,
        salutation: lead.user?.salutation || '',
        email: lead.user?.email || '',
        phone: lead.user?.phone || '',
        serviceType: lead.serviceType || '',
        city: lead.location?.city || formData.address || '',
        status: lead.status || 'pending',
        assignedPartner: lead.assignedPartner?.companyName || 'Unassigned',
        partnerType: lead.assignedPartner?.partnerType || '',
        partnerContact: partnerContact,
        sourceDomain: lead.sourceDomain || '',
        estimatedValue: lead.estimatedValue || '',
        pickupAddress: formData.pickupAddress || formData.address || '',
        deliveryAddress: formData.deliveryAddress || '',
        roomCount: formData.roomCount || '',
        areaSize: formData.areaSize || '',
        additionalServices: additionalServices,
        preferredContactTime: lead.user?.preferredContactTime || formData.preferredContactTime || '',
        createdAt: new Date(lead.createdAt).toLocaleDateString('en-GB'),
        assignedAt: lead.assignedAt ? new Date(lead.assignedAt).toLocaleDateString('en-GB') : '',
        acceptedAt: lead.acceptedAt ? new Date(lead.acceptedAt).toLocaleDateString('en-GB') : '',
        updatedAt: lead.updatedAt && lead.updatedAt !== lead.createdAt ? 
          new Date(lead.updatedAt).toLocaleDateString('en-GB') : ''
      });
    });

    // Set response headers
    const filename = `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    // Log after Excel file is sent (don't send response)
    await createAuditLog(req.user?.id, 'data_exported', 'Export', null, {
      format: 'xlsx', 
      recordCount: leads.length, 
      filters: { serviceType, status, assignedPartner, startDate, endDate }
    }, req.ip);

  } catch (error) {
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      await createAuditLog(req.user?.id, 'error_logged', 'Export', null, { 
        format: 'xlsx', 
        error: error.message 
      }, req.ip);
      res.status(500).json({ message: 'Failed to export leads to Excel', error: error.message });
    } else {
      // If headers are already sent, just log the error without sending response
      await createAuditLog(req.user?.id, 'error_logged', 'Export', null, { 
        format: 'xlsx', 
        error: error.message 
      }, req.ip);
    }
  }
};

// @desc    Export leads to PDF format
// @route   GET /api/leads/export/pdf
// @access  Private (Superadmin)
// Assumes: Lead model is imported and createAuditLog is available in scope

const exportLeadsToPDF = async (req, res) => {
  const PDFDocument = require('pdfkit');

  // small helper to safely stringify values
  const s = (v, fallback = 'N/A') => (v === undefined || v === null || v === '' ? fallback : String(v));

  try {
    const {
      serviceType,
      status,
      assignedPartner,
      startDate,
      endDate,
      search
    } = req.query;

    // === Build filter safely ===
    const filter = {}; // <<< make sure filter is declared BEFORE use

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { leadId: searchRegex },
        { 'user.firstName': searchRegex },
        { 'user.lastName': searchRegex },
        { 'user.email': searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
              regex: search,
              options: 'i'
            }
          }
        }
      ];
    }

    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.status = status;

    if (assignedPartner && assignedPartner !== 'all') {
      if (assignedPartner === 'unassigned') {
        filter.$or = [
          { assignedPartner: { $exists: false } },
          { assignedPartner: null }
        ];
      } else {
        filter.assignedPartner = assignedPartner;
      }
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // === Fetch leads ===
    const leads = await Lead.find(filter)
      .populate('assignedPartner', 'companyName partnerType contactPerson')
      .populate('user', 'salutation firstName lastName email phone bestReachTime preferredContactTime consent')
      .sort({ createdAt: -1 })
      .lean();

    // === Prepare PDF doc ===
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      info: {
        Title: 'Leads Export Report',
        Author: 'Leadform CRM'
      }
    });

    const filename = `leads_export_${new Date().toISOString().split('T')[0]}.pdf`;

    // Expose headers for frontend
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition,Content-Type');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe streaming PDF
    doc.pipe(res);

    // Basic document header (title + meta)
    const addDocHeader = () => {
      doc.fillColor('#2563eb').fontSize(20).font('Helvetica-Bold').text('Leadform CRM', { align: 'left' });
      doc.moveDown(0.15);
      doc.fillColor('#1e40af').fontSize(14).font('Helvetica').text('Leads Export Report', { align: 'left' });
      doc.moveDown(0.2);
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
        .text(`Generated: ${new Date().toLocaleString('en-GB')}    Total Records: ${leads.length}`)
        .moveDown(0.5);
      // separator
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.6);
    };

    // Table column definitions (adjust widths as needed)
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const cols = [
      { key: 'leadId', title: 'Lead ID', width: Math.floor(pageWidth * 0.16) },
      { key: 'name', title: 'Name', width: Math.floor(pageWidth * 0.26) },
      { key: 'serviceType', title: 'Service', width: Math.floor(pageWidth * 0.12) },
      { key: 'city', title: 'City', width: Math.floor(pageWidth * 0.14) },
      { key: 'status', title: 'Status', width: Math.floor(pageWidth * 0.12) },
      { key: 'partner', title: 'Partner', width: Math.floor(pageWidth * 0.14) },
      { key: 'created', title: 'Created', width: Math.floor(pageWidth * 0.16) }
    ];

    // Draw table header
    const drawTableHeader = () => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
      const startX = doc.page.margins.left;
      let x = startX;
      const y = doc.y;
      cols.forEach((c) => {
        doc.text(c.title, x, y, { width: c.width, align: 'left' });
        x += c.width;
      });
      doc.moveDown(0.8);
      // line below header
      doc.moveTo(startX, doc.y - 4).lineTo(doc.page.width - doc.page.margins.right, doc.y - 4).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(9).fillColor('#374151');
    };

    // Draw one row; returns how much vertical space consumed
    const drawTableRow = (lead) => {
      // Prepare cell strings
      const leadId = s(lead.leadId, lead._id ? lead._id.toString().substring(0, 12) : '');
      const name = lead.user ? `${s(lead.user.firstName, '')} ${s(lead.user.lastName, '')}`.trim() : s(lead.name, '');
      const serviceTypeText = s(lead.serviceType, '');
      const city = (lead.location && lead.location.city) ? s(lead.location.city) : s(lead.city, '');
      const statusText = s(lead.status, '');
      const partner = lead.assignedPartner ? s(lead.assignedPartner.companyName, '') : s(lead.partnerName, '');
      const created = lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-GB') : '';

      const values = [leadId, name, serviceTypeText, city, statusText, partner, created];

      // measure heights for each cell
      const cellHeights = values.map((val, idx) => {
        return doc.heightOfString(val, { width: cols[idx].width, align: 'left' });
      });

      const rowHeight = Math.max(...cellHeights, 14) + 6; // pad a bit

      // Check for page overflow
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        addDocHeader();
        drawTableHeader();
      }

      // Draw the text cells
      let x = doc.page.margins.left;
      const y = doc.y;
      values.forEach((val, idx) => {
        doc.text(val, x, y, { width: cols[idx].width, align: 'left' });
        x += cols[idx].width;
      });

      doc.moveDown(rowHeight / 12); // approximate moving down by measured height
      // draw separator line after row
      doc.moveTo(doc.page.margins.left, doc.y - 4).lineTo(doc.page.width - doc.page.margins.right, doc.y - 4).strokeColor('#f3f4f6').stroke();

      return rowHeight;
    };

    // Start document content
    addDocHeader();
    drawTableHeader();

    if (!leads || leads.length === 0) {
      doc.moveDown(1);
      doc.fontSize(11).fillColor('#6b7280').text('No leads found for the given filters.', { align: 'left' });
    } else {
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        try {
          drawTableRow(lead);
        } catch (leadErr) {
          console.error('Error rendering table row for lead:', lead && lead._id, leadErr);
          // write a small error row and continue
          if (doc.y > doc.page.height - 120) {
            doc.addPage();
            addDocHeader();
            drawTableHeader();
          }
          doc.fillColor('#ef4444').fontSize(9).text(`Error rendering lead ${s(lead && lead._id, 'unknown')}`, { align: 'left' });
          doc.moveDown(0.5);
          doc.fillColor('#374151');
        }
      }
    }

    // finalize pdf and end stream
    doc.end();

    // audit log (fire-and-forget)
    try {
      await createAuditLog(req.user?.id, 'data_exported', 'Export', null, {
        format: 'pdf',
        recordCount: (leads && leads.length) || 0,
        filters: { serviceType, status, assignedPartner, startDate, endDate }
      }, req.ip);
    } catch (logErr) {
      console.error('Audit log failed after PDF export:', logErr);
    }

  } catch (error) {
    console.error('Export to PDF failed (top-level):.............', error);
    // If response already started streaming, we cannot send JSON; just log.
    if (!res.headersSent) {
      try {
        await createAuditLog(req.user?.id, 'error_logged', 'Export', null, { format: 'pdf', error: error.message }, req.ip);
      } catch (le) {
        console.error('Failed to log error:', le);
      }
      return res.status(500).json({ message: 'Failed to export leads to PDF', error: error.message });
    }
  }
};
//diff design
// const exportLeadsToPDF = async (req, res) => {
//   const PDFDocument = require('pdfkit');

//   // small helper to safely stringify values
//   const s = (v, fallback = 'N/A') => (v === undefined || v === null || v === '' ? fallback : String(v));

//   try {
//     const {
//       serviceType,
//       status,
//       assignedPartner,
//       startDate,
//       endDate,
//       search
//     } = req.query;

//     // === Build filter safely ===
//     const filter = {}; // <<< make sure filter is declared BEFORE use

//     if (search) {
//       const searchRegex = new RegExp(search, 'i');
//       filter.$or = [
//         { leadId: searchRegex },
//         { 'user.firstName': searchRegex },
//         { 'user.lastName': searchRegex },
//         { 'user.email': searchRegex },
//         {
//           $expr: {
//             $regexMatch: {
//               input: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
//               regex: search,
//               options: 'i'
//             }
//           }
//         }
//       ];
//     }

//     if (serviceType) filter.serviceType = serviceType;
//     if (status) filter.status = status;

//     if (assignedPartner && assignedPartner !== 'all') {
//       if (assignedPartner === 'unassigned') {
//         filter.$or = [
//           { assignedPartner: { $exists: false } },
//           { assignedPartner: null }
//         ];
//       } else {
//         filter.assignedPartner = assignedPartner;
//       }
//     }

//     if (startDate || endDate) {
//       filter.createdAt = {};
//       if (startDate) filter.createdAt.$gte = new Date(startDate);
//       if (endDate) filter.createdAt.$lte = new Date(endDate);
//     }

//     // === Fetch leads ===
//     const leads = await Lead.find(filter)
//       .populate('assignedPartner', 'companyName partnerType contactPerson')
//       .sort({ createdAt: -1 })
//       .lean();

//     // === Prepare PDF doc (no buffered pages) ===
//     const doc = new PDFDocument({
//       margin: 40,
//       size: 'A4',
//       // bufferPages: true, // NOT using buffered pages here to avoid switchToPage; uncomment only if you handle it
//       info: {
//         Title: 'Leads Export Report',
//         Author: 'Leadform CRM'
//       }
//     });

//     const filename = `leads_export_${new Date().toISOString().split('T')[0]}.pdf`;

//     // Expose headers for frontend
//     res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition,Content-Type');
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

//     // Pipe streaming PDF
//     doc.pipe(res);

//     // Simple header function
//     const addHeader = () => {
//       doc.fillColor('#2563eb').fontSize(22).text('Leadform CRM', { align: 'left' });
//       doc.moveDown(0.2);
//       doc.fillColor('#1e40af').fontSize(14).text('Leads Export Report', { align: 'left' });
//       doc.moveDown(0.2);
//       doc.fillColor('#6b7280').fontSize(9)
//         .text(`Generated: ${new Date().toLocaleString('en-GB')}`)
//         .text(`Total Records: ${leads.length}`);
//       doc.moveDown(0.4);
//       doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#e5e7eb').stroke();
//       doc.moveDown(0.5);
//     };

//     // Render a single lead block; returns new y position
//     const addLeadDetails = (lead) => {
//       const startY = doc.y;
//       const leftColX = doc.page.margins.left;
//       const rightColX = doc.page.width / 2 + 10;
//       const lineHeight = 12;

//       // header rectangle (light)
//       doc.save();
//       doc.rect(leftColX - 8, startY - 6, doc.page.width - doc.page.margins.left - doc.page.margins.right + 16, 22)
//         .fill('#f3f4f6');
//       doc.restore();

//       // Lead header
//       doc.fillColor('#1f2937').fontSize(11).font('Helvetica-Bold')
//         .text(`Lead ID: ${s(lead.leadId, lead._id ? lead._id.toString().substring(0, 12) : 'N/A')}`, leftColX, startY - 2);
//       doc.fillColor('#374151').fontSize(10).font('Helvetica')
//         .text(`Status: ${s(lead.status, 'pending')}`, rightColX, startY - 2);

//       doc.moveDown(1.8);

//       // Customer info
//       const name = lead.user ? `${s(lead.user.firstName, '')} ${s(lead.user.lastName, '')}`.trim() : 'N/A';
//       doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text('Customer:', leftColX);
//       doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(`Name: ${name}`, leftColX);
//       if (lead.user?.email) doc.text(`Email: ${lead.user.email}`, rightColX);
//       if (lead.user?.phone) doc.text(`Phone: ${lead.user.phone}`, leftColX);
//       doc.moveDown(0.6);

//       // Service info
//       doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text('Service:', leftColX);
//       doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(`Type: ${s(lead.serviceType)}`, leftColX);
//       if (lead.location?.city) doc.text(`City: ${lead.location.city}`, rightColX);
//       if (lead.estimatedValue) doc.text(`Estimated: €${lead.estimatedValue}`, rightColX);
//       doc.moveDown(0.6);

//       // Partner if any
//       if (lead.assignedPartner) {
//         doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text('Partner:', leftColX);
//         doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(`${s(lead.assignedPartner.companyName)}`, leftColX);
//         if (lead.assignedAt) doc.text(`Assigned: ${new Date(lead.assignedAt).toLocaleDateString()}`, rightColX);
//         doc.moveDown(0.6);
//       }

//       // Timeline
//       doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text('Timeline:', leftColX);
//       doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(`Created: ${new Date(lead.createdAt).toLocaleString()}`, leftColX);
//       doc.moveDown(0.8);

//       // horizontal separator
//       doc.moveTo(leftColX - 8, doc.y).lineTo(doc.page.width - doc.page.margins.right + 8, doc.y).strokeColor('#e5e7eb').stroke();
//       doc.moveDown(0.6);

//       // check for page overflow and add new page if needed
//       if (doc.y > doc.page.height - 120) {
//         doc.addPage();
//         addHeader();
//       }
//     };

//     // === Start PDF ===
//     addHeader();

//     // If no leads, show friendly message
//     if (!leads || leads.length === 0) {
//       doc.moveDown(1);
//       doc.fontSize(12).fillColor('#6b7280').text('No leads found for the given filters.', { align: 'left' });
//     } else {
//       for (let i = 0; i < leads.length; i++) {
//         const lead = leads[i];
//         try {
//           addLeadDetails(lead);
//         } catch (leadErr) {
//           console.error('Error rendering lead in PDF (id):', lead && lead._id, leadErr);
//           // continue to next lead
//           if (doc.y > doc.page.height - 100) {
//             doc.addPage();
//             addHeader();
//           }
//           doc.fillColor('#ef4444').fontSize(9).text(`Error rendering lead ${s(lead && lead._id, 'unknown')}`, { continued: false });
//           doc.moveDown(0.5);
//         }
//       }
//     }

//     // finalize
//     doc.end();

//     // audit log (fire-and-forget)
//     try {
//       await createAuditLog(req.user?.id, 'data_exported', 'Export', null, {
//         format: 'pdf',
//         recordCount: (leads && leads.length) || 0,
//         filters: { serviceType, status, assignedPartner, startDate, endDate }
//       }, req.ip);
//     } catch (logErr) {
//       console.error('Audit log failed after PDF export:', logErr);
//     }

//   } catch (error) {
//     console.error('Export to PDF failed (top-level):.............', error);
//     // If response already started streaming, we cannot send JSON; just log.
//     if (!res.headersSent) {
//       try {
//         await createAuditLog(req.user?.id, 'error_logged', 'Export', null, { format: 'pdf', error: error.message }, req.ip);
//       } catch (le) {
//         console.error('Failed to log error:', le);
//       }
//       return res.status(500).json({ message: 'Failed to export leads to PDF', error: error.message });
//     }
//   }
// };



// @desc    Reject lead by partner
// @route   POST /api/leads/:leadId/reject
// @access  Private (Partner)
const rejectLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Rejection reason is required' 
      });
    }

    const lead = await Lead.findById(leadId)
      .populate('assignedPartner', 'companyName contactPerson.email')
      .populate('user', 'salutation firstName lastName email phone bestReachTime preferredContactTime consent');

    if (!lead) {
      return res.status(404).json({ 
        success: false,
        message: 'Lead not found' 
      });
    }

    // Check if the partner is assigned to this lead
    if (req.user.role === 'partner' && lead.assignedPartner?._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not assigned to this lead' 
      });
    }

    // Check if lead is in a state that can be rejected
    if (lead.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        message: 'Lead is already cancelled' 
      });
    }

    if (lead.status === 'accepted') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot reject an already accepted lead' 
      });
    }

    // Update lead status to rejected
    lead.status = 'cancelled';
    lead.cancellationReason = reason;
    lead.cancellationRequestedAt = new Date();
    lead.cancellationApproved = true; // Partner rejection is auto-approved
    await lead.save();

    // Update partner metrics
    if (lead.assignedPartner) {
      await Partner.findByIdAndUpdate(lead.assignedPartner._id, {
        $inc: { 
          'metrics.totalLeadsCancelled': 1 
        }
      });
    }

    logger.info(`Lead ${lead.leadId} rejected by partner ${lead.assignedPartner.companyName} with reason: ${reason}`);

    res.json({
      success: true,
      message: 'Lead rejected successfully',
      lead: {
        id: lead._id,
        leadId: lead.leadId,
        status: lead.status,
        rejectionReason: reason,
        rejectedAt: lead.cancellationRequestedAt
      }
    });

  } catch (error) {
    logger.error('Reject lead failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to reject lead', 
      error: error.message 
    });
  }
};

// Background geocoding helper for lead locations
async function geocodeLeadLocationsBackground(leadId, formData, serviceType) {
  try {
    const GeocodingService = require('../services/geocodingService');
    const lead = await Lead.findById(leadId);
    
    if (!lead) {
      throw new Error('Lead not found');
    }

    let locationsToGeocode = [];

    if (serviceType === 'moving') {
      // Extract pickup and destination locations for moving service
      if (formData.pickupAddress || formData.pickupLocation) {
        const pickupData = formData.pickupAddress || formData.pickupLocation;
        locationsToGeocode.push({
          type: 'pickup',
          address: pickupData.address || pickupData,
          city: pickupData.city,
          postalCode: pickupData.postalCode,
          country: pickupData.country || 'Germany'
        });
      }

      if (formData.destinationAddress || formData.destinationLocation) {
        const destData = formData.destinationAddress || formData.destinationLocation;
        locationsToGeocode.push({
          type: 'destination',
          address: destData.address || destData,
          city: destData.city,
          postalCode: destData.postalCode,
          country: destData.country || 'Germany'
        });
      }
    } else if (serviceType === 'cleaning') {
      // Extract service location for cleaning service
      if (formData.serviceAddress || formData.address) {
        const serviceData = formData.serviceAddress || formData;
        locationsToGeocode.push({
          type: 'service',
          address: serviceData.address || serviceData.serviceAddress,
          city: serviceData.city,
          postalCode: serviceData.postalCode,
          country: serviceData.country || 'Germany'
        });
      }
    }

    // Process each location
    const locationUpdates = {};
    
    for (const locationInfo of locationsToGeocode) {
      try {
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

        const fullAddress = [
          locationInfo.address,
          locationInfo.city,
          locationInfo.postalCode,
          locationInfo.country
        ].filter(Boolean).join(', ');

        const result = await GeocodingService.getCityCoordinates(
          locationInfo.city || locationInfo.address,
          locationInfo.country || 'Germany'
        );

        if (locationInfo.type === 'pickup') {
          locationUpdates.pickupLocation = {
            address: locationInfo.address,
            city: result.city || locationInfo.city,
            country: result.country || locationInfo.country,
            postalCode: locationInfo.postalCode,
            coordinates: {
              lat: result.lat,
              lng: result.lng
            }
          };
        } else if (locationInfo.type === 'destination') {
          locationUpdates.destinationLocation = {
            address: locationInfo.address,
            city: result.city || locationInfo.city,
            country: result.country || locationInfo.country,
            postalCode: locationInfo.postalCode,
            coordinates: {
              lat: result.lat,
              lng: result.lng
            }
          };
        } else if (locationInfo.type === 'service') {
          locationUpdates.serviceLocation = {
            serviceAddress: locationInfo.address,
            city: result.city || locationInfo.city,
            country: result.country || locationInfo.country,
            postalCode: locationInfo.postalCode,
            coordinates: {
              lat: result.lat,
              lng: result.lng
            }
          };
        }

        logger.info(`Geocoded ${locationInfo.type} location for lead ${leadId}: ${locationInfo.city} -> ${result.lat}, ${result.lng}`);

      } catch (error) {
        logger.error(`Failed to geocode ${locationInfo.type} location for lead ${leadId}: ${error.message}`);
      }
    }

    // Update lead with geocoded coordinates
    if (Object.keys(locationUpdates).length > 0) {
      await Lead.findByIdAndUpdate(leadId, locationUpdates);
      logger.info(`Updated lead ${leadId} with ${Object.keys(locationUpdates).length} geocoded locations`);
    }

  } catch (error) {
    logger.error(`Lead background geocoding failed for ${leadId}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createLead,
  getAllLeads,
  getPartnerLeads,
  getLeadById,
  getAvailablePartners,
  assignLead,
  acceptLead,
  requestCancellation,
  rejectLead,
  getLeadStats,
  updateLeadStatus,
  exportLeadsToExcel,
  exportLeadsToPDF
};