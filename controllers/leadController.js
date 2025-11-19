// Lead Controller - Dynamic Lead Management
const Lead = require('../models/Lead');
const LeadUser = require('../models/LeadUser');  // Import LeadUser model at top level
const Partner = require('../models/Partner');
const Log = require('../models/Log');
const Service = require('../models/Service');
const { createAuditLog, logError } = require('../middleware/logging');
const logger = require('../utils/logger');
const NotificationService = require('../services/notificationService');

// Helper function to calculate admin status based on assignment pattern and business rules
const calculateAdminStatus = async (lead, settings = null) => {
  // Get settings if not provided
  if (!settings) {
    const Settings = require('../models/Settings');
    settings = await Settings.getSettings();
  }
  if (!lead.partnerAssignments || lead.partnerAssignments.length === 0) {
    // Check if lead date has passed without any assignments
    if (lead.formData?.fixedDate) {
      const leadDate = new Date(lead.formData.fixedDate);
      const now = new Date();
      if (leadDate < now) {
        return 'pending'; // Date passed but never assigned - stays pending but no assign allowed
      }
    }
    return 'pending'; // No partners assigned yet
  }

  // Get assignment statuses and partner types
  const activeAssignments = lead.partnerAssignments.filter(a => !['rejected', 'cancelled'].includes(a.status || 'pending'));
  const statuses = activeAssignments.map(a => a.status || 'pending');
  const pendingCount = statuses.filter(s => s === 'pending').length;
  const acceptedCount = statuses.filter(s => s === 'accepted').length;
  const cancelRequestedCount = statuses.filter(s => s === 'cancel_requested').length;

  // Check if lead date has passed
  const isDatePassed = lead.formData?.fixedDate ? new Date(lead.formData.fixedDate) < new Date() : false;

  // If all partners cancelled/rejected
  if (lead.partnerAssignments.every(a => ['rejected', 'cancelled'].includes(a.status || 'pending'))) {
    return 'pending'; // Back to pending, can assign new partners (regardless of date)
  }

  // If date passed and no one accepted
  if (isDatePassed && acceptedCount === 0 && cancelRequestedCount === 0) {
    return 'pending'; // Date expired, but still keep as pending (admin decides)
  }

  // If at least one partner accepted (even with cancel requests)
  if (acceptedCount > 0 || cancelRequestedCount > 0) {
    return 'assigned'; // Keep within 3-tier system - assigned means actively working
  }

  // Check assignment completion based on partner types
  const hasExclusivePartner = activeAssignments.some(a =>
    (a.partner && a.partner.partnerType === 'exclusive')
  );

  if (hasExclusivePartner) {
    // For exclusive partners, only one can be assigned
    return 'assigned';
  } else {
    // For basic partners, check if we need more assignments
    const maxBasicPartners = settings.system?.basicPartnerLeadLimit || 3; // From admin setting
    const basicAssignmentCount = activeAssignments.length;

    if (basicAssignmentCount < maxBasicPartners) {
      return 'partial_assigned'; // Can assign more basic partners
    } else if (pendingCount > 0) {
      return 'assigned'; // Waiting for responses
    } else {
      return 'assigned'; // All assigned, waiting for responses
    }
  }
};

// Helper function to check if lead can accept more partner assignments
const canAssignMorePartners = async (lead, settings = null) => {
  // Get settings if not provided
  if (!settings) {
    const Settings = require('../models/Settings');
    settings = await Settings.getSettings();
  }
  if (!lead.partnerAssignments) return true;

  // Check if lead date has passed
  const isDatePassed = lead.formData?.fixedDate ? new Date(lead.formData.fixedDate) < new Date() : false;
  if (isDatePassed) return false; // Cannot assign after date passed

  const activeAssignments = lead.partnerAssignments.filter(a => !['rejected', 'cancelled'].includes(a.status || 'pending'));

  // Check for exclusive partners
  const hasExclusivePartner = activeAssignments.some(a =>
    (a.partner && a.partner.partnerType === 'exclusive')
  );

  if (hasExclusivePartner) {
    return false; // Cannot assign more if exclusive partner already assigned
  }

  // For basic partners, check against limit
  const maxBasicPartners = settings.system?.basicPartnerLeadLimit || 3; // From admin setting
  return activeAssignments.length < maxBasicPartners;
};

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

    // Ensure moveType is not set for cleaning service
    if (serviceType === 'cleaning' && moveType) {
      return res.status(400).json({ 
        success: false, 
        message: 'moveType should not be provided for cleaning service' 
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
        bestReachTime: userInfo.bestReachTime,
        preferredContactTime: userInfo.preferredContactTime || userInfo.bestReachTime,
        consent: userInfo.consent || false
      };
    } else if (formData) {
      userData = {
        salutation: formData.salutation || 'mister',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        bestReachTime: formData.bestReachTime,
        preferredContactTime: formData.preferredContactTime,
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

    // Validate required coordinates for moving service (in formData)
    if (serviceType === 'moving') {
      const pickupAddress = formData?.pickupAddress || req.body.pickupAddress;
      const destinationAddress = formData?.destinationAddress || req.body.destinationAddress;
      
      if (!pickupAddress?.coordinates?.lat || !pickupAddress?.coordinates?.lng) {
        return res.status(400).json({ 
          success: false, 
          message: 'Pickup address coordinates (lat, lng) are required in formData for moving service' 
        });
      }
      
      if (!destinationAddress?.coordinates?.lat || !destinationAddress?.coordinates?.lng) {
        return res.status(400).json({ 
          success: false, 
          message: 'Destination address coordinates (lat, lng) are required in formData for moving service' 
        });
      }
      
      // Validate business-specific fields for business moveType
      if (moveType === 'business') {
        if (!formData?.estimatedCommercialArea) {
          return res.status(400).json({ 
            success: false, 
            message: 'estimatedCommercialArea is required for business moving service' 
          });
        }
        
        if (!formData?.bestReachTime) {
          return res.status(400).json({ 
            success: false, 
            message: 'bestReachTime is required for business moving service' 
          });
        }
        
        // Validate bestReachTime format
        const validReachTimes = ['8-12', '12-16', '16-20'];
        if (!validReachTimes.includes(formData.bestReachTime)) {
          return res.status(400).json({ 
            success: false, 
            message: 'bestReachTime must be one of: 8-12, 12-16, 16-20' 
          });
        }
        
        // Validate additionalServices array if provided
        if (formData?.additionalServices && !Array.isArray(formData.additionalServices)) {
          return res.status(400).json({ 
            success: false, 
            message: 'additionalServices must be an array' 
          });
        }
        
        // Validate moveDateType for business
        if (formData?.moveDateType && !['fixed', 'flexible'].includes(formData.moveDateType)) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveDateType for business must be either "fixed" or "flexible"' 
          });
        }
      }
      
      // Validate long_distance-specific fields for long_distance moveType
      if (moveType === 'long_distance') {
        if (!formData?.transportType) {
          return res.status(400).json({ 
            success: false, 
            message: 'transportType is required for long distance moving service' 
          });
        }
        
        // Validate transportType enum
        const validTransportTypes = ['complete_household', 'part_of_household', 'individual_pieces', 'small_move'];
        if (!validTransportTypes.includes(formData.transportType)) {
          return res.status(400).json({ 
            success: false, 
            message: 'transportType must be one of: complete_household, part_of_household, individual_pieces, small_move' 
          });
        }
        
        // Validate roomsIncluded if transportType is complete_household
        if (formData.transportType === 'complete_household' && !formData?.roomsIncluded) {
          return res.status(400).json({ 
            success: false, 
            message: 'roomsIncluded is required when transportType is complete_household' 
          });
        }
        
        // Validate roomsIncluded enum
        if (formData?.roomsIncluded) {
          const validRooms = ['1', '2', '3', '4', '5_or_more'];
          if (!validRooms.includes(formData.roomsIncluded)) {
            return res.status(400).json({ 
              success: false, 
              message: 'roomsIncluded must be one of: 1, 2, 3, 4, 5_or_more' 
            });
          }
        }
        
        if (!formData?.estimatedLivingSpace) {
          return res.status(400).json({ 
            success: false, 
            message: 'estimatedLivingSpace is required for long distance moving service' 
          });
        }
        
        // Validate servicesWanted array if provided
        if (formData?.servicesWanted && !Array.isArray(formData.servicesWanted)) {
          return res.status(400).json({ 
            success: false, 
            message: 'servicesWanted must be an array' 
          });
        }
        
        // Validate costCoverage if provided
        if (formData?.costCoverage) {
          const validCostCoverage = ['private_payment', 'employer_coverage'];
          if (!validCostCoverage.includes(formData.costCoverage)) {
            return res.status(400).json({ 
              success: false, 
              message: 'costCoverage must be one of: private_payment, employer_coverage' 
            });
          }
        }
        
        // Validate moveDateType for long_distance
        if (formData?.moveDateType && !['fixed', 'flexible'].includes(formData.moveDateType)) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveDateType for long distance must be either "fixed" or "flexible"' 
          });
        }
      }
      
      // Validate special_transport-specific fields for special_transport moveType
      if (moveType === 'special_transport') {
        // Validate moveOutProperty
        if (!formData?.moveOutProperty) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveOutProperty is required for special transport moving service' 
          });
        }
        
        // Validate moveOutProperty.propertyType
        if (!formData.moveOutProperty?.propertyType) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveOutProperty.propertyType is required for special transport moving service' 
          });
        }
        
        const validPropertyTypes = ['house', 'apartment'];
        if (!validPropertyTypes.includes(formData.moveOutProperty.propertyType)) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveOutProperty.propertyType must be one of: house, apartment' 
          });
        }
        
        // Validate elevator field
        if (formData.moveOutProperty?.elevatorAvailable !== undefined) {
          const validElevatorOptions = [true, false, 'yes', 'no'];
          if (!validElevatorOptions.includes(formData.moveOutProperty.elevatorAvailable)) {
            return res.status(400).json({ 
              success: false, 
              message: 'moveOutProperty.elevatorAvailable must be true, false, "yes", or "no"' 
            });
          }
        }
        
        // Validate moveInProperty
        if (!formData?.moveInProperty) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveInProperty is required for special transport moving service' 
          });
        }
        
        // Validate moveInProperty.propertyType
        if (!formData.moveInProperty?.propertyType) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveInProperty.propertyType is required for special transport moving service' 
          });
        }
        
        if (!validPropertyTypes.includes(formData.moveInProperty.propertyType)) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveInProperty.propertyType must be one of: house, apartment' 
          });
        }
        
        // Validate elevator field for move-in
        if (formData.moveInProperty?.elevatorAvailable !== undefined) {
          const validElevatorOptions = [true, false, 'yes', 'no'];
          if (!validElevatorOptions.includes(formData.moveInProperty.elevatorAvailable)) {
            return res.status(400).json({ 
              success: false, 
              message: 'moveInProperty.elevatorAvailable must be true, false, "yes", or "no"' 
            });
          }
        }
        
        // Validate moveDateType for special_transport
        if (formData?.moveDateType && !['fixed', 'flexible'].includes(formData.moveDateType)) {
          return res.status(400).json({ 
            success: false, 
            message: 'moveDateType for special transport must be either "fixed" or "flexible"' 
          });
        }
      }
    }

    // Validate cleaning service fields
    if (serviceType === 'cleaning') {
      // Validate locationType
      if (!formData?.locationType) {
        return res.status(400).json({ 
          success: false, 
          message: 'locationType is required for cleaning service' 
        });
      }
      
      const validLocationTypes = ['single_location', 'multiple_regional', 'multiple_nationwide'];
      if (!validLocationTypes.includes(formData.locationType)) {
        return res.status(400).json({ 
          success: false, 
          message: 'locationType must be one of: single_location, multiple_regional, multiple_nationwide' 
        });
      }
      
      // Validate cleaning fields for all location types
      if (formData.locationType === 'single_location' || formData.locationType === 'multiple_regional' || formData.locationType === 'multiple_nationwide') {
        // Validate cleaning frequency
        if (!formData?.cleaningFrequency) {
          return res.status(400).json({ 
            success: false, 
            message: 'cleaningFrequency is required for single location cleaning' 
          });
        }
        
        const validFrequencies = ['regularly', 'unique', 'if_necessary'];
        if (!validFrequencies.includes(formData.cleaningFrequency)) {
          return res.status(400).json({ 
            success: false, 
            message: 'cleaningFrequency must be one of: regularly, unique, if_necessary' 
          });
        }
        
        // Validate object type
        if (!formData?.objectType) {
          return res.status(400).json({ 
            success: false, 
            message: 'objectType is required for single location cleaning' 
          });
        }
        
        const validObjectTypes = ['office', 'clinic_practice', 'law_firm', 'store_branch', 'kindergarten', 'hotel_guesthouse', 'fitness_wellness', 'gastronomy', 'apartment_house', 'miscellaneous'];
        if (!validObjectTypes.includes(formData.objectType)) {
          return res.status(400).json({ 
            success: false, 
            message: 'objectType must be one of: office, clinic_practice, law_firm, store_branch, kindergarten, hotel_guesthouse, fitness_wellness, gastronomy, apartment_house, miscellaneous' 
          });
        }
        
        // Validate services array
        if (!formData?.services || !Array.isArray(formData.services) || formData.services.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'services array is required for single location cleaning' 
          });
        }
        
        const validServices = ['maintenance_cleaning', 'window_cleaning', 'basic_cleaning', 'carpet_cleaning', 'facade_cleaning', 'staircase_cleaning', 'roof_cleaning', 'winter_service', 'construction_cleaning', 'miscellaneous'];
        const invalidServices = formData.services.filter(service => !validServices.includes(service));
        if (invalidServices.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: `Invalid services: ${invalidServices.join(', ')}. Valid options: ${validServices.join(', ')}` 
          });
        }
        
        // Validate desired start
        if (!formData?.desiredStart) {
          return res.status(400).json({ 
            success: false, 
            message: 'desiredStart is required for single location cleaning' 
          });
        }
        
        const validDesiredStart = ['asap', 'next_month', 'later_flexible'];
        if (!validDesiredStart.includes(formData.desiredStart)) {
          return res.status(400).json({ 
            success: false, 
            message: 'desiredStart must be one of: asap, next_month, later_flexible' 
          });
        }
        
        // Validate service address and coordinates
        if (!formData?.serviceAddress) {
          return res.status(400).json({ 
            success: false, 
            message: 'serviceAddress is required for cleaning service' 
          });
        }
        
        if (!formData.serviceAddress?.coordinates?.lat || !formData.serviceAddress?.coordinates?.lng) {
          return res.status(400).json({ 
            success: false, 
            message: 'Service address coordinates (lat, lng) are required for cleaning service' 
          });
        }
        
        // Validate surface area
        if (!formData?.surfaceArea) {
          return res.status(400).json({ 
            success: false, 
            message: 'surfaceArea is required for single location cleaning' 
          });
        }
        
        const validSurfaceAreas = ['under_200', '200_to_500', '500_to_1000', '1000_to_3000', '3000_to_5000', '5000_to_10000', 'over_10000', 'custom'];
        if (!validSurfaceAreas.includes(formData.surfaceArea)) {
          return res.status(400).json({ 
            success: false, 
            message: 'surfaceArea must be one of: under_200, 200_to_500, 500_to_1000, 1000_to_3000, 3000_to_5000, 5000_to_10000, over_10000, custom' 
          });
        }
        
        // If custom surface area, validate customSurfaceArea field
        if (formData.surfaceArea === 'custom' && !formData?.customSurfaceArea) {
          return res.status(400).json({ 
            success: false, 
            message: 'customSurfaceArea is required when surfaceArea is "custom"' 
          });
        }
      }
    }

    // Prepare lead data (no duplicate locations - they're in formData)
    const leadData = {
      serviceType,
      sourceDomain,
      user: leadUser._id,
      formData: formData || req.body,
      partnerAssignments: []
    };

    // Only add moveType for moving service
    if (serviceType === 'moving') {
      leadData.moveType = moveType;
    }

    // Add service location for all cleaning service types
    if (serviceType === 'cleaning') {
      const { serviceAddress } = formData;
      leadData.serviceLocation = {
        serviceAddress: serviceAddress.address || '',
        city: serviceAddress.city || '',
        country: serviceAddress.country || 'Germany',
        postalCode: serviceAddress.postalCode || '',
        coordinates: {
          lat: parseFloat(serviceAddress.coordinates.lat),
          lng: parseFloat(serviceAddress.coordinates.lng)
        }
      };
    }

    // Create lead
    const lead = new Lead(leadData);

    await lead.save();

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
          details: { 
            domain: sourceDomain, 
            serviceType, 
            moveType
          },
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

    // Prepare response data based on service type
    const responseData = {
      leadId: lead.leadId,
      serviceType: lead.serviceType,
      overallStatus: lead.overallStatus,
      partnerAssignments: lead.partnerAssignments,
      createdAt: lead.createdAt
    };

    // Add service-specific fields
    if (serviceType === 'moving') {
      responseData.moveType = lead.moveType;
      responseData.pickupLocation = lead.pickupLocation; // Virtual field from formData
      responseData.destinationLocation = lead.destinationLocation; // Virtual field from formData
    } else if (serviceType === 'cleaning') {
      responseData.serviceLocation = lead.serviceLocation;
      // Add cleaning-specific fields if needed
      if (lead.formData?.locationType) {
        responseData.locationType = lead.formData.locationType;
      }
      if (lead.formData?.objectType) {
        responseData.objectType = lead.formData.objectType;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: responseData
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
      filter['partnerAssignments.partner'] = req.user.id;
    }

    // Service type filter
    if (serviceType) {
      filter.serviceType = serviceType;
    }

    // Status filter - map to partnerAssignments status
    if (status) {
      // Use the new main status field for filtering
      filter.status = status;
    }

    // Assigned partner filter (for superadmin)
    if (assignedPartner && req.user.role === 'superadmin') {
      if (assignedPartner === 'unassigned') {
        // Filter for leads with no assigned partners
        filter.$or = filter.$or ? [
          ...filter.$or,
          { partnerAssignments: { $size: 0 } },
          { partnerAssignments: { $exists: false } }
        ] : [
          { partnerAssignments: { $size: 0 } },
          { partnerAssignments: { $exists: false } }
        ];
      } else {
        filter['partnerAssignments.partner'] = assignedPartner;
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
              // Enhanced full name search with null/undefined handling
              {
                $expr: {
                  $and: [
                    { $ne: ['$user.firstName', null] },
                    { $ne: ['$user.lastName', null] },
                    {
                      $regexMatch: {
                        input: {
                          $concat: [
                            { $ifNull: ['$user.firstName', ''] },
                            ' ',
                            { $ifNull: ['$user.lastName', ''] }
                          ]
                        },
                        regex: search,
                        options: 'i'
                      }
                    }
                  ]
                }
              },
              // Additional search patterns for partial matches
              {
                $expr: {
                  $regexMatch: {
                    input: {
                      $concat: [
                        { $ifNull: ['$user.lastName', ''] },
                        ' ',
                        { $ifNull: ['$user.firstName', ''] }
                      ]
                    },
                    regex: search,
                    options: 'i'
                  }
                }
              }
            ]
          }
        },
        // Lookup for partnerAssignments partners
        {
          $lookup: {
            from: 'partners',
            localField: 'partnerAssignments.partner',
            foreignField: '_id',
            as: 'partnerDetails'
          }
        },
        // Add partner details to partnerAssignments and virtual fields
        {
          $addFields: {
            partnerAssignments: {
              $map: {
                input: '$partnerAssignments',
                as: 'assignment',
                in: {
                  $mergeObjects: [
                    '$$assignment',
                    {
                      partnerInfo: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$partnerDetails',
                              cond: { $eq: ['$$this._id', '$$assignment.partner'] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            },
            // Add virtual fields for compatibility
            status: {
              $cond: {
                if: { $eq: [{ $size: '$partnerAssignments' }, 0] },
                then: 'pending',
                else: {
                  $let: {
                    vars: {
                      statuses: { $map: { input: '$partnerAssignments', as: 'a', in: '$$a.status' } }
                    },
                    in: {
                      $cond: {
                        if: { $allElementsTrue: { $map: { input: '$$statuses', as: 's', in: { $eq: ['$$s', 'accepted'] } } } },
                        then: 'accepted',
                        else: {
                          $cond: {
                            if: { $in: ['accepted', '$$statuses'] },
                            then: 'partially_assigned',
                            else: {
                              $cond: {
                                if: { $in: ['pending', '$$statuses'] },
                                then: 'assigned',
                                else: 'cancelled'
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            assignedPartner: { $arrayElemAt: ['$partnerDetails', 0] },
            pickupLocation: '$formData.pickupAddress',
            destinationLocation: '$formData.destinationAddress'
          }
        },
        // Remove partnerDetails array
        {
          $unset: 'partnerDetails'
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

      // Populate partner data for aggregation results
      if (leads.length > 0) {
        await Lead.populate(leads, [
          {
            path: 'partnerAssignments.partner',
            select: 'companyName contactPerson.email partnerType',
            options: { strictPopulate: false }
          },
          {
            path: 'assignedPartner',
            select: 'companyName contactPerson.email partnerType',
            options: { strictPopulate: false }
          }
        ]);
      }
    } else {
      // No search query, use regular find with populate
      [leads, total] = await Promise.all([
        Lead.find(filter)
          .populate({
            path: 'partnerAssignments.partner',
            select: 'companyName contactPerson.email partnerType',
            options: { strictPopulate: false }
          })
          .populate({
            path: 'user',
            select: 'salutation firstName lastName email phone bestReachTime preferredContactTime consent',
            // Make population optional - don't fail if user reference is invalid
            options: { strictPopulate: false }
          })
          .populate({
            path: 'assignedPartner',
            select: 'companyName contactPerson.email partnerType',
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
    const transformedLeads = await Promise.all(leads.map(async (lead) => {
      // Convert to regular object to add virtual fields
      let leadObj;
      if (lead.toObject) {
        leadObj = lead.toObject({ virtuals: true });
      } else {
        // Handle aggregation results or plain objects
        leadObj = JSON.parse(JSON.stringify(lead));
      }
      
      // Ensure formData is preserved
      if (lead.formData && !leadObj.formData) {
        leadObj.formData = JSON.parse(JSON.stringify(lead.formData));
      }
      
      // Add computed virtual fields for frontend compatibility
      // Use new 3-tier admin status system
      leadObj.status = await calculateAdminStatus(lead);

      // For partners, override with their most recent active assignment status
      if (req.user.role === 'partner' && lead.partnerAssignments && lead.partnerAssignments.length > 0) {
        // Find all assignments for this partner
        const partnerAssignments = lead.partnerAssignments.filter(a =>
          (a.partner && (a.partner.toString() === req.user.id || a.partner._id?.toString() === req.user.id))
        );

        if (partnerAssignments.length > 0) {
          // Get the most recent assignment (by assignedAt date)
          const mostRecentAssignment = partnerAssignments.reduce((latest, current) => {
            const latestDate = new Date(latest.assignedAt);
            const currentDate = new Date(current.assignedAt);
            return currentDate > latestDate ? current : latest;
          });

          leadObj.status = mostRecentAssignment.status;
          leadObj.partnerStatus = mostRecentAssignment.status;
        }
      }

      if (lead.partnerAssignments && lead.partnerAssignments.length > 0) {
        
        // Add assignedPartner for backward compatibility (use first partner)
        const firstAssignment = lead.partnerAssignments[0];
        leadObj.assignedPartner = firstAssignment.partner;
        
        // Add assignedPartners array
        leadObj.assignedPartners = lead.partnerAssignments.map(a => ({
          _id: a.partner._id || a.partner,
          companyName: a.partner.companyName || a.partnerInfo?.companyName || 'Unknown Partner',
          status: a.status,
          assignedAt: a.assignedAt
        }));
        
        // Add acceptedPartner if any assignment is accepted
        const acceptedAssignment = lead.partnerAssignments.find(a => a.status === 'accepted');
        if (acceptedAssignment) {
          leadObj.acceptedPartner = {
            _id: acceptedAssignment.partner._id || acceptedAssignment.partner,
            companyName: acceptedAssignment.partner.companyName || acceptedAssignment.partnerInfo?.companyName || 'Unknown Partner'
          };
        }

        // Add assignment metadata
        const activeAssignments = lead.partnerAssignments.filter(a => !['rejected', 'cancelled'].includes(a.status || 'pending'));
        const hasExclusivePartner = activeAssignments.some(a =>
          (a.partner && a.partner.partnerType === 'exclusive')
        );

        // Get settings for maxAllowed calculation
        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();
        const maxBasicPartners = settings.system?.basicPartnerLeadLimit || 3;

        leadObj.assignmentInfo = {
          totalAssigned: lead.partnerAssignments.length,
          activeAssignments: activeAssignments.length,
          maxAllowed: hasExclusivePartner ? 1 : maxBasicPartners,
          hasExclusivePartner,
          canAssignMore: await canAssignMorePartners(lead, settings),
          isDatePassed: lead.formData?.fixedDate ? new Date(lead.formData.fixedDate) < new Date() : false
        };
      } else {
        leadObj.status = 'pending';
        leadObj.assignedPartner = null;
        leadObj.assignedPartners = [];

        // Add assignment metadata for unassigned leads
        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();
        const maxBasicPartners = settings.system?.basicPartnerLeadLimit || 3;

        leadObj.assignmentInfo = {
          totalAssigned: 0,
          activeAssignments: 0,
          maxAllowed: maxBasicPartners,
          hasExclusivePartner: false,
          canAssignMore: await canAssignMorePartners(lead, settings),
          isDatePassed: lead.formData?.fixedDate ? new Date(lead.formData.fixedDate) < new Date() : false
        };
      }
      
      // Add virtual location fields for backward compatibility
      if (lead.formData || leadObj.formData) {
        const formData = lead.formData || leadObj.formData;
        leadObj.pickupLocation = formData.pickupAddress || null;
        leadObj.destinationLocation = formData.destinationAddress || null;
        
        // Also ensure formData is available at root level
        if (!leadObj.formData) {
          leadObj.formData = formData;
        }
        
        // Add debug logging
        console.log(`Lead ${leadObj.leadId || leadObj._id}: formData keys:`, Object.keys(formData));
        if (formData.pickupAddress) console.log('  - pickupAddress:', formData.pickupAddress);
        if (formData.destinationAddress) console.log('  - destinationAddress:', formData.destinationAddress);
      }

      return leadObj;
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Calculate stats for the filtered results
    let pendingCount = 0;
    let partialAssignedCount = 0;
    let assignedCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;

    // For partners, count by their assignment statuses; for admins, count by computed lead statuses
    if (req.user.role === 'partner') {
      // Count partner-specific assignment statuses
      for (const lead of transformedLeads) {
        switch (lead.status) { // This is now the partner's assignment status
          case 'pending':
            pendingCount++;
            break;
          case 'accepted':
            acceptedCount++;
            break;
          case 'rejected':
            rejectedCount++;
            break;
          case 'cancelled':
            cancelledCount++;
            break;
        }
      }
    } else {
      // Count admin lead statuses (existing logic for admins)
      for (const lead of transformedLeads) {
        switch (lead.status) {
          case 'pending':
            pendingCount++;
            break;
          case 'partial_assigned':
            partialAssignedCount++;
            break;
          case 'assigned':
            assignedCount++;
            break;
          case 'accepted':
            acceptedCount++;
            break;
        }
      }
    }

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
      stats: req.user.role === 'partner' ? {
        total,
        pending: pendingCount,
        accepted: acceptedCount,
        rejected: rejectedCount,
        cancelled: cancelledCount
      } : {
        total,
        pending: pendingCount,
        partial_assigned: partialAssignedCount,
        assigned: assignedCount + partialAssignedCount, // Combine for UI display
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

    // Build filter object - use partnerAssignments array
    const filter = { 'partnerAssignments.partner': partnerId };

    // Service type filter
    if (serviceType) {
      filter.serviceType = serviceType;
    }

    // Status filter - map partner status terms to partnerAssignments status
    if (status) {
      switch (status) {
        case 'pending':
          filter['partnerAssignments.status'] = 'pending';
          break;
        case 'accepted':
          filter['partnerAssignments.status'] = 'accepted';
          break;
        case 'reject request':
          filter['partnerAssignments.cancellationRequested'] = true;
          filter['partnerAssignments.cancellationApproved'] = false;
          break;
        case 'reject':
          filter['partnerAssignments.status'] = 'cancelled';
          break;
        case 'reject cancelled':
        case 'assigned':
          filter['partnerAssignments.status'] = { $in: ['pending', 'accepted'] };
          break;
        default:
          filter['partnerAssignments.status'] = status;
      }
    }

    // Date range filter - use partnerAssignments.assignedAt for partner leads
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      filter['partnerAssignments.assignedAt'] = dateFilter;
    }

    // Search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { leadId: searchRegex },
        { 'user.firstName': searchRegex },
        { 'user.lastName': searchRegex },
        { 'user.email': searchRegex },
        // Enhanced full name search with null/undefined handling
        {
          $expr: {
            $and: [
              { $ne: ['$user.firstName', null] },
              { $ne: ['$user.lastName', null] },
              {
                $regexMatch: {
                  input: {
                    $concat: [
                      { $ifNull: ['$user.firstName', ''] },
                      ' ',
                      { $ifNull: ['$user.lastName', ''] }
                    ]
                  },
                  regex: search,
                  options: 'i'
                }
              }
            ]
          }
        },
        // Additional search patterns for partial matches
        {
          $expr: {
            $regexMatch: {
              input: {
                $concat: [
                  { $ifNull: ['$user.lastName', ''] },
                  ' ',
                  { $ifNull: ['$user.firstName', ''] }
                ]
              },
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
        .populate({
          path: 'partnerAssignments.partner',
          select: 'companyName contactPerson.email',
          options: { strictPopulate: false }
        })
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

    // Transform leads for frontend compatibility
    const transformedLeads = leads.map(lead => {
      const leadObj = lead.toObject ? lead.toObject({ virtuals: true }) : { ...lead };
      
      // Add computed fields for frontend compatibility
      if (lead.partnerAssignments && lead.partnerAssignments.length > 0) {
        const partnerAssignment = lead.partnerAssignments.find(a => a.partner.toString() === partnerId);
        if (partnerAssignment) {
          leadObj.status = partnerAssignment.status;
          leadObj.assignedPartner = partnerAssignment.partner;
        }
      } else {
        leadObj.status = 'pending';
      }
      
      // Add virtual location fields
      if (lead.formData) {
        leadObj.pickupLocation = lead.formData.pickupAddress || null;
        leadObj.destinationLocation = lead.formData.destinationAddress || null;
      }
      
      return leadObj;
    });

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

    // Get admin settings for weekly lead limits
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    const adminLimits = settings.leadDistribution[lead.serviceType];

    // Get all active partners that provide this service (for search fallback)
    const allActivePartners = await Partner.find({
      deleted: { $ne: true },
      status: 'active',
      serviceType: lead.serviceType
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
      'partnerAssignments.partner': { $in: allActivePartners.map(p => p._id) },
      'partnerAssignments.assignedAt': { $gte: currentWeekStart, $lte: currentWeekEnd }
    }).lean();

    // Create map of partner current week lead counts
    const partnerWeeklyCount = {};
    currentWeekLeads.forEach(lead => {
      lead.partnerAssignments?.forEach(assignment => {
        if (assignment.assignedAt >= currentWeekStart && assignment.assignedAt <= currentWeekEnd) {
          const partnerId = assignment.partner.toString();
          partnerWeeklyCount[partnerId] = (partnerWeeklyCount[partnerId] || 0) + 1;
        }
      });
    });

    // Extract lead locations
    const leadPickupCity = lead.formData?.pickupAddress?.city?.toLowerCase();
    const leadPickupCountry = lead.formData?.pickupAddress?.country?.toLowerCase();
    const leadDestinationCity = lead.formData?.destinationAddress?.city?.toLowerCase();
    const leadDestinationCountry = lead.formData?.destinationAddress?.country?.toLowerCase();

    // Helper function to check location match for pickup or destination preferences
    const checkLocationMatch = (partnerServiceArea, leadCity, leadCountry) => {
      if (!leadCity || !leadCountry) return false;
      if (!partnerServiceArea || Object.keys(partnerServiceArea).length === 0) return false; // No preferences = cannot match

      // Check if partner has country-only or city-level preferences
      const serviceArea = partnerServiceArea instanceof Map
        ? Object.fromEntries(partnerServiceArea)
        : partnerServiceArea;

      for (const [countryName, config] of Object.entries(serviceArea)) {
        if (!countriesMatch(countryName, leadCountry)) continue;

        if (config.type === 'cities' && config.cities) {
          // Partner has city-level preferences - match specific cities only
          const citiesObj = config.cities instanceof Map ? Object.fromEntries(config.cities) : config.cities;
          for (const [cityName, cityConfig] of Object.entries(citiesObj)) {
            const partnerCityLower = cityName.toLowerCase();
            const leadCityLower = leadCity.toLowerCase();

            if (partnerCityLower === leadCityLower ||
                partnerCityLower.includes(leadCityLower) ||
                leadCityLower.includes(partnerCityLower)) {
              return true; // City match found
            }
          }
          return false; // No matching city found for this country
        } else {
          // Partner has country-only preferences - match by country
          return true;
        }
      }
      return false;
    };

    // Filter partners for suggestions based on all criteria
    const suggestedPartners = allActivePartners.map(partner => {
      const partnerId = partner._id.toString();
      const currentWeekLeadsCount = partnerWeeklyCount[partnerId] || 0;

      // Get admin-configured weekly limit based on partner type
      const weeklyLimit = partner.partnerType === 'exclusive'
        ? adminLimits.exclusive.leadsPerWeek
        : adminLimits.basic.leadsPerWeek;

      // Check weekly capacity against admin settings
      const hasWeeklyCapacity = currentWeekLeadsCount < weeklyLimit;

      let pickupMatch = false;
      let destinationMatch = false;

      if (lead.serviceType === 'moving') {
        // Check pickup location match against pickup preferences
        pickupMatch = checkLocationMatch(
          partner.preferences?.pickup?.serviceArea,
          leadPickupCity,
          leadPickupCountry
        );

        // Check destination location match against destination preferences
        destinationMatch = checkLocationMatch(
          partner.preferences?.destination?.serviceArea,
          leadDestinationCity,
          leadDestinationCountry
        );
      }

      // Both pickup AND destination must match for moving partners
      // For cleaning, check service address against cleaning preferences
      let locationMatch = false;
      if (lead.serviceType === 'moving') {
        locationMatch = pickupMatch && destinationMatch;
      } else if (lead.serviceType === 'cleaning') {
        // Extract cleaning service location
        const serviceCity = lead.formData?.serviceAddress?.city?.toLowerCase() ||
                           lead.formData?.address?.city?.toLowerCase();
        const serviceCountry = lead.formData?.serviceAddress?.country?.toLowerCase() ||
                              lead.formData?.address?.country?.toLowerCase();

        // Check location match against cleaning preferences
        locationMatch = checkLocationMatch(
          partner.preferences?.cleaning?.serviceArea,
          serviceCity,
          serviceCountry
        );
      }

      // Calculate priority score
      const weeklyCapacityUsed = weeklyLimit > 0 ? (currentWeekLeadsCount / weeklyLimit) * 100 : 0;
      let priorityScore = partner.partnerType === 'exclusive' ? 100 : 50;
      priorityScore -= weeklyCapacityUsed;
      if (locationMatch) priorityScore += 25;

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
        weeklyLimit: weeklyLimit,
        capacityUsed: Math.round(weeklyCapacityUsed),
        hasWeeklyCapacity,
        pickupMatch,
        destinationMatch,
        locationMatch,
        acceptanceRate: Math.round(acceptanceRate),
        priorityScore: Math.round(priorityScore),
        preferences: partner.preferences
      };
    })
    .filter(partner => {
      // All conditions must be met for partner to be suggested:
      // 1. Not deleted (already filtered in query)
      // 2. Must be active (already filtered in query)
      // 3. Location must match (capacity check removed to allow selection in all cases)
      return partner.locationMatch;
    });

    // Separate suggested partners by type
    const exclusivePartners = suggestedPartners.filter(p => p.partnerType === 'exclusive');
    const basicPartners = suggestedPartners.filter(p => p.partnerType === 'basic');

    // Sort by priority score
    const sortedExclusivePartners = exclusivePartners.sort((a, b) => b.priorityScore - a.priorityScore);
    const sortedBasicPartners = basicPartners.sort((a, b) => b.priorityScore - a.priorityScore);

    // Determine tab display logic
    let showTabs = true;
    let defaultTab = 'basic';

    if (exclusivePartners.length > 0) {
      // Auto-select exclusive tab if exclusive partners available
      defaultTab = 'exclusive';
    } else if (basicPartners.length === 0) {
      // No suggested partners available - remove tabs, search from all active partners
      showTabs = false;
      defaultTab = null;
    }

    res.json({
      success: true,
      lead: {
        id: lead._id,
        leadId: lead.leadId,
        serviceType: lead.serviceType,
        location: lead.location,
        user: lead.user
      },
      showTabs,
      defaultTab,
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
      // All active partners for search fallback when no suggestions
      allActivePartners: allActivePartners.map(p => ({
        _id: p._id,
        partnerId: p.partnerId,
        companyName: p.companyName,
        contactPerson: p.contactPerson,
        partnerType: p.partnerType,
        preferences: p.preferences
      })),
      totalSuggested: suggestedPartners.length,
      totalActive: allActivePartners.length,
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

    const lead = await Lead.findById(leadId).populate('partnerAssignments.partner');
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner || partner.status !== 'active') {
      return res.status(400).json({ message: 'Invalid or inactive partner' });
    }

    // Check if partner provides this service
    if (partner.serviceType !== lead.serviceType) {
      return res.status(400).json({ message: 'Partner does not provide this service' });
    }

    // Check if more partners can be assigned using business logic
    if (!(await canAssignMorePartners(lead))) {
      const isDatePassed = lead.formData?.fixedDate ? new Date(lead.formData.fixedDate) < new Date() : false;
      if (isDatePassed) {
        return res.status(400).json({
          message: 'Cannot assign partners to leads with passed dates',
          rule: 'Lead date has expired'
        });
      }

      // Check if exclusive partner exists
      const hasExclusivePartner = lead.partnerAssignments?.some(a =>
        !['rejected', 'cancelled'].includes(a.status || 'pending') &&
        a.partner?.partnerType === 'exclusive'
      );

      if (hasExclusivePartner) {
        return res.status(400).json({
          message: 'Lead already assigned to exclusive partner',
          rule: 'Only one exclusive partner allowed per lead'
        });
      }

      // Check max basic partners limit
      const activeBasicCount = lead.partnerAssignments?.filter(a =>
        !['rejected', 'cancelled'].includes(a.status || 'pending') &&
        a.partner?.partnerType !== 'exclusive'
      ).length || 0;

      // Get settings to check the limit
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const maxBasicPartners = settings.system?.basicPartnerLeadLimit || 3;
      if (activeBasicCount >= maxBasicPartners) {
        return res.status(400).json({
          message: `Maximum ${maxBasicPartners} basic partners already assigned`,
          rule: 'Admin-configured limit reached'
        });
      }
    }

    // Check existing assignments for exclusive partner rules
    const existingAssignment = await Lead.findOne({
      _id: leadId,
      'partnerAssignments.0': { $exists: true },
      status: { $in: ['assigned', 'accepted'] }
    }).populate('partnerAssignments.partner');

    // Exclusive partner assignment rules
    if (partner.partnerType === 'exclusive') {
      if (existingAssignment && existingAssignment.partnerAssignments?.length > 0) {
        const currentAssignments = existingAssignment.partnerAssignments.filter(a => a.status !== 'rejected');

        for (const assignment of currentAssignments) {
          const assignedPartner = assignment.partner;

          // Rule 1: Cannot assign to different exclusive partner
          if (assignedPartner.partnerType === 'exclusive' && assignedPartner._id.toString() !== partnerId) {
            return res.status(400).json({
              message: 'Lead is already assigned to another exclusive partner',
              rule: 'One lead can only be assigned to one exclusive partner at a time',
              currentAssignment: {
                partnerName: assignedPartner.companyName,
                partnerType: 'exclusive',
                assignedAt: assignment.assignedAt
              }
            });
          }

          // Rule 2: Cannot take accepted leads from basic partners
          if (assignedPartner.partnerType === 'basic' && assignment.status === 'accepted') {
            return res.status(400).json({
              message: 'Lead has already been accepted by a basic partner and cannot be reassigned',
              rule: 'Accepted leads cannot be transferred to exclusive partners',
              currentAssignment: {
                partnerName: assignedPartner.companyName,
                partnerType: 'basic',
                status: 'accepted',
                acceptedAt: assignment.acceptedAt
              }
            });
          }
        }
      }
    } else if (partner.partnerType === 'basic') {
      // Rule 2: Basic cannot take lead from exclusive
      if (existingAssignment && existingAssignment.partnerAssignments?.length > 0) {
        const exclusiveAssignment = existingAssignment.partnerAssignments.find(
          a => a.partner.partnerType === 'exclusive' && a.status !== 'rejected'
        );

        if (exclusiveAssignment) {
          return res.status(400).json({
            message: 'Lead is already assigned to an exclusive partner and cannot be reassigned to basic partners',
            rule: 'Exclusive assignments are protected from basic partner reassignment',
            currentAssignment: {
              partnerName: exclusiveAssignment.partner.companyName,
              partnerType: 'exclusive',
              assignedAt: exclusiveAssignment.assignedAt
            }
          });
        }
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
      'partnerAssignments.partner': partnerId,
      'partnerAssignments.assignedAt': { $gte: currentWeekStart, $lte: currentWeekEnd }
    });

    const avgLeadsPerWeek = partner.preferences?.averageLeadsPerWeek || 5;

    // Always show capacity info after assignment
    let capacityInfo = null;
    if (currentWeekLeadsCount >= avgLeadsPerWeek) {
      capacityInfo = `Partner is at/over capacity: ${currentWeekLeadsCount}/${avgLeadsPerWeek} leads this week`;
    } else {
      capacityInfo = `Partner capacity: ${currentWeekLeadsCount}/${avgLeadsPerWeek} leads this week`;
    }

    // Check if partner has an active (non-rejected, non-cancelled) assignment
    const activeAssignment = lead.partnerAssignments.find(
      assignment => assignment.partner.toString() === partnerId &&
                   !['rejected', 'cancelled'].includes(assignment.status)
    );

    if (activeAssignment) {
      // Partner has active assignment, just update status if needed
      activeAssignment.status = 'pending';
      activeAssignment.assignedAt = new Date();
    } else {
      // Create new partner assignment (even if partner was previously assigned but rejected/cancelled)
      // This ensures clean separation between old and new assignments
      lead.partnerAssignments.push({
        partner: partnerId,
        assignedAt: new Date(),
        status: 'pending'
      });
    }

    // Update lead status using new 3-tier admin system
    lead.status = await calculateAdminStatus(lead);
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
    logger.info(`Lead ${lead.leadId} assigned to ${partner.partnerType} partner ${partner.companyName}`);

    res.json({
      success: true,
      message: 'Lead assigned successfully',
      lead,
      capacityInfo: capacityInfo,
      assignmentInfo: {
        partnerName: partner.companyName,
        partnerType: partner.partnerType,
        currentWeekLeads: currentWeekLeadsCount + 1,
        averageLeadsPerWeek: avgLeadsPerWeek,
        capacityUsed: Math.round(((currentWeekLeadsCount + 1) / avgLeadsPerWeek) * 100)
      }
    });
  } catch (error) {
    await logError('error_logged', error, req, {
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

    // Check if partner has access to this lead
    // For assigned leads, check assignedPartner field
    // For multi-partner assignments, check partnerAssignments array
    const partnerId = req.user.id;
    let hasAccess = false;

    if (lead.assignedPartner && lead.assignedPartner.toString() === partnerId) {
      hasAccess = true;
    } else if (lead.partnerAssignments && lead.partnerAssignments.length > 0) {
      hasAccess = lead.partnerAssignments.some(assignment =>
        assignment.partner.toString() === partnerId
      );
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied - You are not assigned to this lead' });
    }

    // Find the most recent assignment for this partner
    const partnerAssignments = lead.partnerAssignments.filter(
      assignment => assignment.partner.toString() === partnerId
    );

    if (partnerAssignments.length === 0) {
      return res.status(400).json({ message: 'Partner assignment not found' });
    }

    // Get the most recent assignment (by assignedAt date)
    const partnerAssignment = partnerAssignments.reduce((latest, current) => {
      const latestDate = new Date(latest.assignedAt);
      const currentDate = new Date(current.assignedAt);
      return currentDate > latestDate ? current : latest;
    });

    if (partnerAssignment.status === 'accepted') {
      return res.status(400).json({ message: 'You have already accepted this lead' });
    }

    // Check if the assignment is in a state that can be accepted
    // Allow acceptance of pending assignments (including reassigned previously rejected leads)
    const allowedAssignmentStatuses = ['pending'];
    if (!allowedAssignmentStatuses.includes(partnerAssignment.status)) {
      return res.status(400).json({ message: `Assignment cannot be accepted - current status: ${partnerAssignment.status}` });
    }

    // Update partner assignment status in partnerAssignments array
    partnerAssignment.status = 'accepted';
    partnerAssignment.acceptedAt = new Date();

    // Populate partner data before calculating admin status
    await lead.populate('partnerAssignments.partner');

    // NOTE: Do NOT update overall lead status - only update specific partner assignment status
    // The overall lead status should remain as 'assigned' or 'partial_assigned' to allow other partners to still accept/reject

    // Set acceptedAt if this is first acceptance
    if (!lead.acceptedAt) {
      lead.acceptedAt = new Date();
    }

    // Set assignedPartner for backward compatibility (use accepting partner)
    if (!lead.assignedPartner) {
      lead.assignedPartner = partnerId;
    }

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

    const lead = await Lead.findById(leadId)
      .populate('partnerAssignments.partner', 'companyName contactPerson.email partnerType');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.status === 'cancelled') {
      return res.status(400).json({ message: 'Lead already cancelled' });
    }

    // For partner requests, handle per-partner cancellation
    if (req.user && req.user.role === 'partner') {
      const partnerId = req.user.id;

      // Find partner assignment
      const partnerAssignment = lead.partnerAssignments.find(
        assignment => assignment.partner._id.toString() === partnerId
      );

      if (!partnerAssignment) {
        return res.status(403).json({ message: 'You are not assigned to this lead' });
      }

      if (partnerAssignment.status !== 'accepted') {
        return res.status(400).json({
          message: 'Can only request cancellation for accepted leads. Use reject for unaccepted leads.'
        });
      }

      if (partnerAssignment.cancellationRequested) {
        return res.status(400).json({ message: 'Cancellation already requested for this assignment' });
      }

      // Update partner assignment with cancellation request
      partnerAssignment.status = 'cancellationRequested';
      partnerAssignment.cancellationRequested = true;
      partnerAssignment.cancellationReason = reason;
      partnerAssignment.cancellationRequestedAt = new Date();

      await lead.save();

      const partnerInfo = partnerAssignment.partner.companyName || 'Unknown Partner';
      logger.info(`Cancellation requested by partner ${partnerInfo} for lead ${lead.leadId}`);

      res.json({
        success: true,
        message: 'Cancellation request submitted. Awaiting admin approval.',
        data: {
          leadId: lead.leadId,
          partnerAssignment: {
            partner: partnerInfo,
            status: partnerAssignment.status,
            cancellationRequested: true
          }
        }
      });
    } else {
      // For customer/user cancellation requests (legacy behavior)
      lead.cancellationRequested = true;
      lead.cancellationReason = reason;
      lead.cancellationRequestedAt = new Date();
      await lead.save();

      logger.info(`Cancellation requested for lead ${lead.leadId}`);

      res.json({
        success: true,
        message: 'Cancellation request submitted. Awaiting admin approval.'
      });
    }
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
      .populate({
        path: 'partnerAssignments.partner',
        select: 'companyName contactPerson.email',
        options: { strictPopulate: false }
      })
      .populate('user', 'salutation firstName lastName email phone bestReachTime preferredContactTime consent');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check permissions - partners can only see leads they are assigned to
    if (req.user.role === 'partner') {
      const isAssigned = lead.partnerAssignments.some(assignment => {
        const partnerId = assignment.partner._id || assignment.partner;
        return partnerId.toString() === req.user.id;
      });

      if (!isAssigned) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Get partner's assignment status for masking logic
    let partnerAssignment = null;
    if (req.user.role === 'partner') {
      partnerAssignment = lead.partnerAssignments.find(assignment => {
        const partnerId = assignment.partner._id || assignment.partner;
        return partnerId.toString() === req.user.id;
      });
    }

    // Mask sensitive contact information if partner hasn't accepted the lead
    let responseData = { ...lead.toObject({ virtuals: true }) };
    
    // Add computed fields for frontend compatibility
    if (lead.partnerAssignments && lead.partnerAssignments.length > 0) {
      const statuses = lead.partnerAssignments.map(a => a.status);
      if (statuses.every(s => s === 'accepted')) {
        responseData.status = 'accepted';
      } else if (statuses.some(s => s === 'accepted')) {
        responseData.status = 'partially_assigned';
      } else if (statuses.some(s => s === 'pending')) {
        responseData.status = 'assigned';
      } else {
        responseData.status = 'pending';
      }
      
      // Add backward compatibility fields
      responseData.assignedPartner = lead.partnerAssignments[0].partner;
      responseData.assignedPartners = lead.partnerAssignments.map(a => ({
        _id: a.partner._id || a.partner,
        companyName: a.partner.companyName || 'Unknown Partner',
        status: a.status,
        assignedAt: a.assignedAt
      }));
    } else {
      responseData.status = 'pending';
    }
    
    // Add virtual location fields
    if (lead.formData) {
      responseData.pickupLocation = lead.formData.pickupAddress || null;
      responseData.destinationLocation = lead.formData.destinationAddress || null;
    }

    // Add partner-specific status if partner is viewing
    if (req.user.role === 'partner' && partnerAssignment) {
      // Handle cancel request status
      responseData.partnerStatus = partnerAssignment.cancellationRequested && partnerAssignment.status === 'accepted'
        ? 'cancel_requested'
        : partnerAssignment.status;
      responseData.partnerAssignedAt = partnerAssignment.assignedAt;
      responseData.partnerAcceptedAt = partnerAssignment.acceptedAt;
      responseData.partnerRejectedAt = partnerAssignment.rejectedAt;
      responseData.partnerCancellationRequested = partnerAssignment.cancellationRequested || false;
      responseData.partnerCancellationReason = partnerAssignment.cancellationReason;
    }
    
    if (req.user.role === 'partner' && (!partnerAssignment || partnerAssignment.status !== 'accepted')) {
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
        // Enhanced full name search with null/undefined handling
        {
          $expr: {
            $and: [
              { $ne: ['$user.firstName', null] },
              { $ne: ['$user.lastName', null] },
              {
                $regexMatch: {
                  input: {
                    $concat: [
                      { $ifNull: ['$user.firstName', ''] },
                      ' ',
                      { $ifNull: ['$user.lastName', ''] }
                    ]
                  },
                  regex: search,
                  options: 'i'
                }
              }
            ]
          }
        },
        // Additional search patterns for partial matches
        {
          $expr: {
            $regexMatch: {
              input: {
                $concat: [
                  { $ifNull: ['$user.lastName', ''] },
                  ' ',
                  { $ifNull: ['$user.firstName', ''] }
                ]
              },
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
        Author: 'ProvenHub'
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
      // Add logo
      const path = require('path');
      const logoPath = path.join(__dirname, '../public/logo.png');
      try {
        doc.image(logoPath, doc.page.margins.left, doc.y, { width: 100 });
        doc.moveDown(2.5);
      } catch (error) {
        console.error('Error loading logo for PDF:', error);
        // Fallback to text if logo fails
        doc.fillColor('#2563eb').fontSize(20).font('Helvetica-Bold').text('ProvenHub', { align: 'left' });
        doc.moveDown(0.15);
      }
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
      .populate('partnerAssignments.partner', 'companyName contactPerson.email')
      .populate('user', 'salutation firstName lastName email phone bestReachTime preferredContactTime consent');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const partnerId = req.user.id;

    // Find the most recent assignment for this partner
    const partnerAssignments = lead.partnerAssignments.filter(
      assignment => assignment.partner._id.toString() === partnerId
    );

    if (partnerAssignments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this lead'
      });
    }

    // Get the most recent assignment (by assignedAt date)
    const partnerAssignment = partnerAssignments.reduce((latest, current) => {
      const latestDate = new Date(latest.assignedAt);
      const currentDate = new Date(current.assignedAt);
      return currentDate > latestDate ? current : latest;
    });

    // Check if this specific partner assignment can be rejected
    if (partnerAssignment.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already accepted lead. Use cancel request instead.'
      });
    }

    // Only allow rejection of pending assignments (including reassigned previously rejected leads)
    if (partnerAssignment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Assignment cannot be rejected - current status: ${partnerAssignment.status}`
      });
    }

    // Update partner assignment status to rejected
    partnerAssignment.status = 'rejected';
    partnerAssignment.rejectionReason = reason;
    partnerAssignment.rejectedAt = new Date();

    // Update overall lead status using new 3-tier admin system
    lead.status = await calculateAdminStatus(lead);

    // Set cancellation details if all partners rejected
    const allStatuses = lead.partnerAssignments.map(a => a.status);
    if (allStatuses.every(s => s === 'rejected' || s === 'cancelled')) {
      lead.cancellationReason = 'All partners rejected';
      lead.cancellationApproved = true;
    }

    await lead.save();

    // Update partner metrics
    await Partner.findByIdAndUpdate(partnerId, {
      $inc: {
        'metrics.totalLeadsRejected': 1
      }
    });

    const partnerInfo = partnerAssignment.partner.companyName || 'Unknown Partner';
    logger.info(`Lead ${lead.leadId} rejected by partner ${partnerInfo} with reason: ${reason}`);

    res.json({
      success: true,
      message: 'Lead rejected successfully',
      lead: {
        id: lead._id,
        leadId: lead.leadId,
        overallStatus: lead.status,
        partnerStatus: partnerAssignment.status,
        rejectionReason: reason,
        rejectedAt: partnerAssignment.rejectedAt
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

// @desc    Assign multiple partners to a lead
// @route   POST /api/leads/:leadId/assign-partners
// @access  Private (Admin only)
const assignMultiplePartners = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { partnerIds } = req.body;

    if (!partnerIds || !Array.isArray(partnerIds) || partnerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Partner IDs array is required'
      });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Verify all partners exist
    const partners = await Partner.find({ _id: { $in: partnerIds } });
    if (partners.length !== partnerIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some partners not found'
      });
    }

    // Get current pricing settings
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();

    // Assign each partner
    const assignmentResults = [];
    for (const partnerId of partnerIds) {
      // Find the partner to get their type
      const partner = partners.find(p => p._id.toString() === partnerId.toString());
      const partnerType = partner.partnerType;

      // Get the appropriate lead price based on service type and partner type
      const leadPrice = settings.pricing[lead.serviceType][partnerType].perLeadPrice;

      const assigned = lead.assignPartner(partnerId, leadPrice, partnerType);
      if (assigned) {
        assignmentResults.push({
          partnerId,
          status: 'assigned',
          assignedAt: new Date(),
          leadPrice: leadPrice,
          partnerType: partnerType
        });
      } else {
        assignmentResults.push({
          partnerId,
          status: 'already_assigned'
        });
      }
    }

    await lead.save();
    await lead.populate('partnerAssignments.partner', 'companyName contactPerson partnerType');

    res.json({
      success: true,
      message: 'Partners assigned successfully',
      data: {
        leadId: lead.leadId,
        overallStatus: lead.overallStatus,
        partnerAssignments: lead.partnerAssignments,
        assignmentResults
      }
    });

  } catch (error) {
    console.error('assignMultiplePartners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign partners',
      error: error.message
    });
  }
};

// @desc    Update partner assignment status
// @route   PUT /api/leads/:leadId/partners/:partnerId/status
// @access  Private (Partner/Admin)
const updatePartnerAssignmentStatus = async (req, res) => {
  try {
    const { leadId, partnerId } = req.params;
    const { status, reason } = req.body;

    if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: accepted, rejected, or cancelled'
      });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if user is the assigned partner or admin
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Partners can only update their own assignments'
      });
    }

    const updated = lead.updatePartnerStatus(partnerId, status, reason);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Partner assignment not found'
      });
    }

    await lead.save();
    await lead.populate('partnerAssignments.partner', 'companyName contactPerson partnerType');

    res.json({
      success: true,
      message: `Partner assignment ${status} successfully`,
      data: {
        leadId: lead.leadId,
        overallStatus: lead.overallStatus,
        partnerAssignments: lead.partnerAssignments
      }
    });

  } catch (error) {
    console.error('updatePartnerAssignmentStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update partner assignment status',
      error: error.message
    });
  }
};

// @desc    Request cancellation for partner assignment
// @route   POST /api/leads/:leadId/partners/:partnerId/cancel
// @access  Private (Partner/Admin)
const requestPartnerCancellation = async (req, res) => {
  try {
    const { leadId, partnerId } = req.params;
    const { reason } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if user is the assigned partner or admin
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Partners can only cancel their own assignments'
      });
    }

    const assignment = lead.partnerAssignments.find(
      a => a.partner.toString() === partnerId.toString()
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Partner assignment not found'
      });
    }

    // Check if cancellation request was already rejected
    if (assignment.cancellationRejected === true) {
      return res.status(400).json({
        success: false,
        message: 'Your cancellation request was already rejected. You cannot send another cancellation request for this lead.',
        code: 'CANCELLATION_ALREADY_REJECTED'
      });
    }

    // Check if cancellation request is already pending
    if (assignment.cancellationRequested === true && !assignment.cancellationApproved && !assignment.cancellationRejected) {
      return res.status(400).json({
        success: false,
        message: 'A cancellation request is already pending for this assignment.',
        code: 'CANCELLATION_ALREADY_PENDING'
      });
    }

    // Check if cancellation was already approved
    if (assignment.cancellationApproved === true) {
      return res.status(400).json({
        success: false,
        message: 'This assignment is already cancelled.',
        code: 'ALREADY_CANCELLED'
      });
    }

    assignment.cancellationRequested = true;
    assignment.cancellationReason = reason || 'No reason provided';
    assignment.cancellationRequestedAt = new Date();

    await lead.save();
    await lead.populate('partnerAssignments.partner', 'companyName contactPerson partnerType');

    res.json({
      success: true,
      message: 'Cancellation requested successfully',
      data: {
        leadId: lead.leadId,
        partnerAssignments: lead.partnerAssignments
      }
    });

  } catch (error) {
    console.error('requestPartnerCancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request cancellation',
      error: error.message
    });
  }
};

// @desc    Approve/reject partner cancellation request
// @route   PUT /api/leads/:leadId/partners/:partnerId/cancel
// @access  Private (Admin only)
const handlePartnerCancellation = async (req, res) => {
  try {
    const { leadId, partnerId } = req.params;
    const { approved, action, reason } = req.body;

    // Handle both old format (approved: true/false) and new format (action: 'approve'/'reject')
    const isApproved = approved === true || action === 'approve';

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Find the most recent assignment for this partner
    const partnerAssignments = lead.partnerAssignments.filter(
      a => a.partner.toString() === partnerId.toString()
    );

    if (partnerAssignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner assignment not found'
      });
    }

    // Get the most recent assignment (by assignedAt date)
    const assignment = partnerAssignments.reduce((latest, current) => {
      const latestDate = new Date(latest.assignedAt);
      const currentDate = new Date(current.assignedAt);
      return currentDate > latestDate ? current : latest;
    });

    if (!assignment.cancellationRequested) {
      return res.status(400).json({
        success: false,
        message: 'No cancellation request found for this assignment'
      });
    }

    if (isApproved) {
      // Approve the cancellation request
      assignment.cancellationApproved = true;
      assignment.cancellationApprovedAt = new Date();
      assignment.status = 'cancelled';
      assignment.cancellationRequested = false; // Clear the request flag

      // Update lead status using calculateAdminStatus
      lead.status = await calculateAdminStatus(lead);
    } else {
      // Reject the cancellation request
      assignment.cancellationRejected = true;
      assignment.cancellationRejectionReason = reason || 'No reason provided';
      assignment.cancellationRejectedAt = new Date();
      assignment.cancellationRequested = false;  // Clear the request flag
      assignment.status = 'accepted'; // Return to accepted status
    }

    await lead.save();
    await lead.populate('partnerAssignments.partner', 'companyName contactPerson partnerType');

    res.json({
      success: true,
      message: isApproved ? 'Cancellation approved' : 'Cancellation rejected',
      data: {
        leadId: lead.leadId,
        status: lead.status,
        partnerAssignments: lead.partnerAssignments
      }
    });

  } catch (error) {
    console.error('handlePartnerCancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle cancellation request',
      error: error.message
    });
  }
};

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
  exportLeadsToPDF,
  assignMultiplePartners,
  updatePartnerAssignmentStatus,
  requestPartnerCancellation,
  handlePartnerCancellation
};