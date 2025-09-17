// Lead Service - Business Logic Layer
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');
const Log = require('../models/Log');
const { getServiceByDomain } = require('../config/services');
const emailService = require('./emailService');

class LeadService {
  // Auto-assign leads to partners based on preferences and priority
  static async autoAssignLead(leadId) {
    try {
      const lead = await Lead.findById(leadId);
      if (!lead || lead.status !== 'pending') {
        return { success: false, message: 'Lead not available for assignment' };
      }

      // Find eligible partners
      const eligiblePartners = await this.findEligiblePartners(lead);

      if (eligiblePartners.length === 0) {
        return { success: false, message: 'No eligible partners found' };
      }

      // Priority: Exclusive partners first, then Basic partners
      const exclusivePartners = eligiblePartners.filter(p => p.partnerType === 'exclusive');
      const basicPartners = eligiblePartners.filter(p => p.partnerType === 'basic');

      let selectedPartner;
      
      if (exclusivePartners.length > 0) {
        // Select exclusive partner with least recent leads
        selectedPartner = this.selectPartnerByLoadBalancing(exclusivePartners);
      } else if (basicPartners.length > 0) {
        // Select basic partner with load balancing
        selectedPartner = this.selectPartnerByLoadBalancing(basicPartners);
      }

      if (!selectedPartner) {
        return { success: false, message: 'Failed to select partner' };
      }

      // Assign lead
      await this.assignLeadToPartner(leadId, selectedPartner._id);

      return { 
        success: true, 
        message: 'Lead auto-assigned successfully',
        partner: selectedPartner
      };
    } catch (error) {
      console.error('Auto-assign error:', error);
      return { success: false, message: 'Auto-assignment failed' };
    }
  }

  // Find partners eligible for a lead based on preferences and radius matching
  static async findEligiblePartners(lead) {
    const query = {
      status: 'active',
      serviceType: lead.serviceType
    };

    const partners = await Partner.find(query);

    // Filter by location preferences using radius-based matching
    return partners.filter(partner => {
      const preferences = partner.preferences[lead.serviceType];
      if (!preferences) return false;

      // Check if partner has any service area configured at all
      const hasServiceArea = preferences.serviceArea &&
                            Object.keys(preferences.serviceArea).length > 0;

      // If no service area configured, partner is not eligible
      if (!hasServiceArea) {
        console.log(`❌ Partner ${partner.companyName} excluded: No service area configured`);
        return false;
      }

      // Check weekly lead limit
      const weeklyLimit = preferences.averageLeadsPerWeek || 10;
      if (partner.metrics.weeklyLeadsReceived >= weeklyLimit) {
        console.log(`❌ Partner ${partner.companyName} excluded: Weekly limit reached`);
        return false;
      }

      // Radius-based location matching
      const isWithinServiceArea = this.checkLocationMatch(partner, lead, lead.serviceType);

      if (!isWithinServiceArea) {
        console.log(`❌ Partner ${partner.companyName} excluded: Not within service area`);
      } else {
        console.log(`✅ Partner ${partner.companyName} eligible for lead`);
      }

      return isWithinServiceArea;
    });
  }

  // Enhanced location matching using existing serviceArea structure with coordinates
  static checkLocationMatch(partner, lead, serviceType) {
    const { isWithinServiceRadius } = require('../utils/geoUtils');
    
    const preferences = partner.preferences[serviceType];
    if (!preferences) return false;

    // Use existing serviceArea structure with coordinates
    if (preferences.serviceArea && Object.keys(preferences.serviceArea).length > 0) {
      return this.checkServiceAreaRadiusMatch(partner, lead, serviceType);
    }

    // Fallback to legacy city/country matching
    return this.checkLegacyLocationMatch(partner, lead, serviceType);
  }

  // Radius-based matching using existing serviceArea structure
  static checkServiceAreaRadiusMatch(partner, lead, serviceType) {
    const { isWithinServiceRadius } = require('../utils/geoUtils');
    const preferences = partner.preferences[serviceType];

    if (!preferences.serviceArea || Object.keys(preferences.serviceArea).length === 0) {
      return false;
    }

    // Get lead coordinates based on service type
    const leadLocations = this.getLeadCoordinates(lead, serviceType);

    if (leadLocations.length === 0) {
      // No coordinates available, fallback to city name matching
      return this.checkLegacyLocationMatch(partner, lead, serviceType);
    }

    // Check each country in serviceArea
    for (const [country, countryData] of Object.entries(preferences.serviceArea)) {
      // Check if partner has cities configured for this country
      const hasCitiesConfigured = countryData.type === 'cities' &&
                                 countryData.cities &&
                                 Object.keys(countryData.cities).length > 0;

      if (hasCitiesConfigured) {
        // If cities are configured, match by cities only (with radius)
        for (const [cityName, cityData] of Object.entries(countryData.cities)) {
          if (cityData.coordinates && cityData.coordinates.lat && cityData.coordinates.lng) {

            // Test against each lead location
            for (const leadLocation of leadLocations) {
              const result = isWithinServiceRadius(leadLocation, {
                name: cityName,
                coordinates: cityData.coordinates,
                radius: cityData.radius || 0
              });

              if (result.isWithinRadius) {
                console.log(`✅ Lead location match: ${leadLocation.name} within ${result.distance}km of partner city ${cityName} (radius: ${cityData.radius}km)`);
                return true;
              }
            }
          }
        }
      } else {
        // If no cities configured (whole country mode), match by country only
        // For whole country mode, we should check if lead is in same country
        const leadCountry = this.extractLeadCountry(lead, serviceType);
        if (leadCountry && country.toLowerCase().includes(leadCountry.toLowerCase())) {
          console.log(`✅ Lead country match: ${leadCountry} matches partner country ${country} (whole country mode)`);
          return true;
        }
      }
    }

    console.log(`❌ No radius match found for lead ${lead.leadId}`);
    return false;
  }

  // Get lead coordinates from formData (cleaned up structure)
  static getLeadCoordinates(lead, serviceType) {
    const locations = [];

    if (serviceType === 'moving') {
      // For moving service, check formData pickup and destination addresses
      if (lead.formData?.pickupAddress?.coordinates) {
        locations.push({
          name: `${lead.formData.pickupAddress.city} (pickup)`,
          lat: lead.formData.pickupAddress.coordinates.lat,
          lng: lead.formData.pickupAddress.coordinates.lng
        });
      }

      if (lead.formData?.destinationAddress?.coordinates) {
        locations.push({
          name: `${lead.formData.destinationAddress.city} (destination)`,
          lat: lead.formData.destinationAddress.coordinates.lat,
          lng: lead.formData.destinationAddress.coordinates.lng
        });
      }
    } else if (serviceType === 'cleaning') {
      // For cleaning service, check formData service address
      if (lead.formData?.serviceAddress?.coordinates) {
        locations.push({
          name: `${lead.formData.serviceAddress.city} (service)`,
          lat: lead.formData.serviceAddress.coordinates.lat,
          lng: lead.formData.serviceAddress.coordinates.lng
        });
      } else if (lead.formData?.address?.coordinates) {
        locations.push({
          name: `${lead.formData.address.city} (service)`,
          lat: lead.formData.address.coordinates.lat,
          lng: lead.formData.address.coordinates.lng
        });
      }
    }

    // Fallback to legacy location if available
    if (locations.length === 0 && lead.location && lead.location.coordinates) {
      locations.push({
        name: `${lead.location.city} (legacy)`,
        lat: lead.location.coordinates.lat,
        lng: lead.location.coordinates.lng
      });
    }

    return locations;
  }

  // Legacy location matching using serviceArea structure (fallback)
  static checkLegacyLocationMatch(partner, lead, serviceType) {
    const preferences = partner.preferences[serviceType];

    // Check serviceArea structure (without coordinates)
    if (preferences.serviceArea && Object.keys(preferences.serviceArea).length > 0) {
      const leadCity = this.extractLeadCity(lead, serviceType);
      const leadCountry = this.extractLeadCountry(lead, serviceType);

      for (const [country, countryData] of Object.entries(preferences.serviceArea)) {
        // Check if partner has cities configured for this country
        const hasCitiesConfigured = countryData.type === 'cities' &&
                                   countryData.cities &&
                                   Object.keys(countryData.cities).length > 0;

        if (hasCitiesConfigured) {
          // If cities are configured, match by cities only (ignore country-level match)
          if (leadCity) {
            for (const cityName of Object.keys(countryData.cities)) {
              if (cityName.toLowerCase().includes(leadCity.toLowerCase()) ||
                  leadCity.toLowerCase().includes(cityName.toLowerCase())) {
                return true;
              }
            }
          }
        } else {
          // If no cities configured (whole country mode), match by country only
          if (leadCountry && country.toLowerCase().includes(leadCountry.toLowerCase())) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // Extract city from lead based on service type (using formData)
  static extractLeadCity(lead, serviceType) {
    if (serviceType === 'moving') {
      return lead.formData?.pickupAddress?.city || lead.formData?.destinationAddress?.city || lead.location?.city;
    } else if (serviceType === 'cleaning') {
      return lead.formData?.serviceAddress?.city || lead.formData?.address?.city || lead.location?.city;
    }
    return lead.location?.city;
  }

  // Extract country from lead based on service type (using formData)
  static extractLeadCountry(lead, serviceType) {
    if (serviceType === 'moving') {
      return lead.formData?.pickupAddress?.country || lead.formData?.destinationAddress?.country || lead.location?.country;
    } else if (serviceType === 'cleaning') {
      return lead.formData?.serviceAddress?.country || lead.formData?.address?.country || lead.location?.country;
    }
    return lead.location?.country;
  }

  // Select partner using load balancing
  static selectPartnerByLoadBalancing(partners) {
    if (partners.length === 1) return partners[0];

    // Sort by least leads received this week
    return partners.sort((a, b) => {
      const aWeeklyLeads = a.metrics.weeklyLeadsReceived || 0;
      const bWeeklyLeads = b.metrics.weeklyLeadsReceived || 0;
      return aWeeklyLeads - bWeeklyLeads;
    })[0];
  }

  // Assign lead to specific partner
  static async assignLeadToPartner(leadId, partnerId) {
    const lead = await Lead.findById(leadId);
    const partner = await Partner.findById(partnerId);

    if (!lead || !partner) {
      throw new Error('Lead or partner not found');
    }

    // Get current pricing settings
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();

    // Get the appropriate lead price based on service type and partner type
    const leadPrice = settings.pricing[lead.serviceType][partner.partnerType].perLeadPrice;

    // Use the updated assignPartner method that includes pricing
    const assigned = lead.assignPartner(partnerId, leadPrice, partner.partnerType);

    if (!assigned) {
      throw new Error('Partner already assigned to this lead');
    }

    // Update lead legacy fields for backward compatibility
    lead.assignedPartner = partnerId;
    lead.assignedAt = new Date();
    lead.status = 'assigned';
    await lead.save();

    // Update partner metrics
    partner.metrics.totalLeadsReceived += 1;
    partner.metrics.weeklyLeadsReceived = (partner.metrics.weeklyLeadsReceived || 0) + 1;
    await partner.save();

    // Send notification to partner
    await emailService.sendLeadAssignmentNotification(partner, lead);

    // Create log entry
    await Log.createLog({
      actor: { type: 'system', name: 'Auto Assignment' },
      action: 'lead_assigned',
      serviceType: lead.serviceType,
      leadId: lead._id,
      partnerId: partner._id,
      status: 'success',
      message: `Lead ${lead.leadId} automatically assigned to ${partner.companyName}`,
      details: {
        assignmentMethod: 'auto',
        partnerType: partner.partnerType
      }
    });

    return { lead, partner };
  }

  // Calculate lead value/pricing
  static calculateLeadValue(lead) {
    try {
      const serviceConfig = getServiceByDomain(lead.sourceDomain);
      if (!serviceConfig || !serviceConfig.pricing) {
        return 50; // Default value
      }

      let value = serviceConfig.pricing.baseCost;
      const factors = serviceConfig.pricing.factors;
      const formData = lead.formData;

      // Apply pricing factors based on form data
      for (const [key, multiplier] of Object.entries(factors)) {
        if (formData[key]) {
          if (typeof multiplier === 'object') {
            // Handle complex pricing (e.g., room count, area size)
            if (multiplier[formData[key]]) {
              value += multiplier[formData[key]];
            }
          } else {
            // Simple multiplier
            value *= multiplier;
          }
        }
      }

      return Math.round(value);
    } catch (error) {
      console.error('Pricing calculation error:', error);
      return 50; // Fallback value
    }
  }

  // Get lead statistics
  static async getLeadStatistics(filters = {}) {
    const pipeline = [];

    // Match stage
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }

    // Group by status
    pipeline.push({
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgValue: { $avg: '$estimatedValue' }
      }
    });

    const statusStats = await Lead.aggregate(pipeline);

    // Get service breakdown
    const serviceStats = await Lead.aggregate([
      ...(Object.keys(filters).length > 0 ? [{ $match: filters }] : []),
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
          totalValue: { $sum: '$estimatedValue' }
        }
      }
    ]);

    // Get daily trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrend = await Lead.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      statusBreakdown: statusStats,
      serviceBreakdown: serviceStats,
      dailyTrend
    };
  }

  // Process cancellation request
  static async processCancellationRequest(leadId, approved, reason, adminId) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (approved) {
      lead.status = 'cancelled';
      lead.cancellationApproved = true;
      
      // Update partner metrics if lead was assigned
      if (lead.assignedPartner) {
        const partner = await Partner.findById(lead.assignedPartner);
        if (partner) {
          partner.metrics.totalLeadsCancelled += 1;
          await partner.save();
        }
      }
    } else {
      lead.cancellationRequested = false;
      lead.cancellationReason = null;
      lead.cancellationRequestedAt = null;
    }

    await lead.save();

    // Log the decision
    await Log.createLog({
      actor: { type: 'superadmin', id: adminId },
      action: approved ? 'cancellation_approved' : 'cancellation_rejected',
      serviceType: lead.serviceType,
      leadId: lead._id,
      partnerId: lead.assignedPartner,
      status: 'success',
      message: `Cancellation ${approved ? 'approved' : 'rejected'} for lead ${lead.leadId}`,
      details: { reason, adminDecision: approved }
    });

    return lead;
  }
}

module.exports = LeadService;