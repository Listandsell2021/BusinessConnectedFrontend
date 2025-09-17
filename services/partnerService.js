// Partner Service - Partner Management Logic
const Partner = require('../models/Partner');
const Lead = require('../models/Lead');
const Log = require('../models/Log');
const emailService = require('./emailService');

class PartnerService {
  // Calculate partner performance metrics
  static async updatePartnerMetrics(partnerId) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) throw new Error('Partner not found');

      // Get all partner leads
      const leads = await Lead.find({ assignedPartner: partnerId });
      
      const acceptedLeads = leads.filter(lead => lead.status === 'accepted');
      const cancelledLeads = leads.filter(lead => lead.status === 'cancelled');
      
      // Calculate metrics
      const totalRevenue = acceptedLeads.reduce((sum, lead) => sum + (lead.actualValue || 0), 0);
      
      // Calculate average response time (mock calculation)
      const avgResponseTime = this.calculateAverageResponseTime(leads);
      
      // Update partner metrics
      partner.metrics = {
        totalLeadsReceived: leads.length,
        totalLeadsAccepted: acceptedLeads.length,
        totalLeadsCancelled: cancelledLeads.length,
        totalRevenue,
        averageResponseTime: avgResponseTime,
        rating: this.calculatePartnerRating(partner)
      };

      await partner.save();
      return partner.metrics;
    } catch (error) {
      console.error('Error updating partner metrics:', error);
      throw error;
    }
  }

  // Calculate average response time in minutes
  static calculateAverageResponseTime(leads) {
    const responseTimes = leads
      .filter(lead => lead.acceptedAt && lead.assignedAt)
      .map(lead => {
        const responseTime = new Date(lead.acceptedAt) - new Date(lead.assignedAt);
        return responseTime / (1000 * 60); // Convert to minutes
      });

    if (responseTimes.length === 0) return 0;
    
    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(avgTime);
  }

  // Calculate partner rating (0-5 scale)
  static calculatePartnerRating(partner) {
    const metrics = partner.metrics;
    
    // Base rating factors
    const acceptanceRate = metrics.totalLeadsReceived > 0 
      ? metrics.totalLeadsAccepted / metrics.totalLeadsReceived 
      : 0;
    
    const cancellationRate = metrics.totalLeadsReceived > 0 
      ? metrics.totalLeadsCancelled / metrics.totalLeadsReceived 
      : 0;
    
    // Response time factor (better if under 60 minutes)
    const responseTimeFactor = metrics.averageResponseTime <= 60 ? 1 : 0.8;
    
    // Calculate rating
    let rating = 5;
    rating *= acceptanceRate; // 0-1 based on acceptance rate
    rating *= (1 - cancellationRate * 0.5); // Penalty for cancellations
    rating *= responseTimeFactor; // Bonus for quick response
    
    return Math.max(0, Math.min(5, Math.round(rating * 10) / 10));
  }

  // Get partner recommendations for a lead
  static async getPartnerRecommendations(leadId, limit = 3) {
    try {
      const lead = await Lead.findById(leadId);
      if (!lead) throw new Error('Lead not found');

      // Find eligible partners
      const eligiblePartners = await this.findEligiblePartners(lead);
      
      // Score and sort partners
      const scoredPartners = await Promise.all(
        eligiblePartners.map(async (partner) => {
          const score = await this.calculatePartnerScore(partner, lead);
          return { partner, score };
        })
      );

      // Sort by score and return top recommendations
      const recommendations = scoredPartners
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => ({
          partner: item.partner,
          score: item.score,
          reasons: this.getRecommendationReasons(item.partner, lead)
        }));

      return recommendations;
    } catch (error) {
      console.error('Error getting partner recommendations:', error);
      throw error;
    }
  }

  // Find eligible partners for a lead
  static async findEligiblePartners(lead) {
    const query = {
      status: 'active',
      serviceType: lead.serviceType
    };

    const partners = await Partner.find(query);
    
    return partners.filter(partner => {
      const preferences = partner.preferences[lead.serviceType];
      if (!preferences) return false;

      // Location preferences are handled by leadService.checkLocationMatch()
      // This basic check is now delegated to the proper radius-based matching

      // Check capacity (weekly leads limit)
      const weeklyLimit = preferences.averageLeadsPerWeek || 10;
      const currentWeeklyLeads = partner.metrics.weeklyLeadsReceived || 0;
      if (currentWeeklyLeads >= weeklyLimit) return false;

      return true;
    });
  }

  // Calculate partner matching score for a lead
  static async calculatePartnerScore(partner, lead) {
    let score = 0;

    // Base score factors
    const metrics = partner.metrics;
    
    // Acceptance rate (40% of score)
    const acceptanceRate = metrics.totalLeadsReceived > 0 
      ? metrics.totalLeadsAccepted / metrics.totalLeadsReceived 
      : 0.5; // Default for new partners
    score += acceptanceRate * 40;

    // Partner type bonus (20% of score)
    if (partner.partnerType === 'exclusive') {
      score += 20;
    } else {
      score += 15;
    }

    // Rating (20% of score)
    score += (metrics.rating / 5) * 20;

    // Response time (10% of score)
    const responseBonus = metrics.averageResponseTime <= 60 ? 10 : 5;
    score += responseBonus;

    // Capacity factor (10% of score)
    const preferences = partner.preferences[lead.serviceType];
    const weeklyLimit = preferences?.averageLeadsPerWeek || 10;
    const currentWeekly = metrics.weeklyLeadsReceived || 0;
    const capacityRatio = (weeklyLimit - currentWeekly) / weeklyLimit;
    score += Math.max(0, capacityRatio) * 10;

    return Math.round(score);
  }

  // Get reasons for partner recommendation
  static getRecommendationReasons(partner, lead) {
    const reasons = [];
    const metrics = partner.metrics;

    if (partner.partnerType === 'exclusive') {
      reasons.push('Exclusive Partner');
    }

    const acceptanceRate = metrics.totalLeadsReceived > 0 
      ? (metrics.totalLeadsAccepted / metrics.totalLeadsReceived) * 100 
      : 0;

    if (acceptanceRate >= 80) {
      reasons.push('High Acceptance Rate');
    }

    if (metrics.rating >= 4) {
      reasons.push('Excellent Rating');
    }

    if (metrics.averageResponseTime <= 30) {
      reasons.push('Fast Response Time');
    }

    // Location match using serviceArea structure
    const preferences = partner.preferences[lead.serviceType];
    if (preferences && preferences.serviceArea && Object.keys(preferences.serviceArea).length > 0) {
      // Check if partner has any service area configured
      let hasServiceArea = false;
      for (const [country, countryData] of Object.entries(preferences.serviceArea)) {
        if (countryData.type === 'cities' && countryData.cities && Object.keys(countryData.cities).length > 0) {
          hasServiceArea = true;
          break;
        } else if (countryData.type === 'country') {
          hasServiceArea = true;
          break;
        }
      }
      if (hasServiceArea) {
        reasons.push('Service Area Configured');
      }
    }

    return reasons;
  }

  // Update weekly lead counters (call this weekly via cron job)
  static async resetWeeklyCounters() {
    try {
      await Partner.updateMany(
        {},
        { $set: { 'metrics.weeklyLeadsReceived': 0 } }
      );
      
      console.log('Weekly lead counters reset successfully');
    } catch (error) {
      console.error('Error resetting weekly counters:', error);
    }
  }

  // Get partner performance summary
  static async getPerformanceSummary(partnerId, period = '30d') {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) throw new Error('Partner not found');

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
      const leads = await Lead.find({
        assignedPartner: partnerId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const accepted = leads.filter(lead => lead.status === 'accepted');
      const cancelled = leads.filter(lead => lead.status === 'cancelled');
      const pending = leads.filter(lead => lead.status === 'assigned');

      // Calculate metrics
      const performance = {
        period: { startDate, endDate },
        totalLeads: leads.length,
        acceptedLeads: accepted.length,
        cancelledLeads: cancelled.length,
        pendingLeads: pending.length,
        acceptanceRate: leads.length > 0 ? (accepted.length / leads.length) * 100 : 0,
        revenue: accepted.reduce((sum, lead) => sum + (lead.actualValue || 0), 0),
        avgLeadValue: accepted.length > 0 
          ? accepted.reduce((sum, lead) => sum + (lead.actualValue || 0), 0) / accepted.length 
          : 0,
        serviceBreakdown: this.getServiceBreakdown(leads)
      };

      return performance;
    } catch (error) {
      console.error('Error getting performance summary:', error);
      throw error;
    }
  }

  // Get service breakdown
  static getServiceBreakdown(leads) {
    const breakdown = {};
    
    leads.forEach(lead => {
      if (!breakdown[lead.serviceType]) {
        breakdown[lead.serviceType] = {
          total: 0,
          accepted: 0,
          cancelled: 0
        };
      }
      
      breakdown[lead.serviceType].total++;
      
      if (lead.status === 'accepted') {
        breakdown[lead.serviceType].accepted++;
      } else if (lead.status === 'cancelled') {
        breakdown[lead.serviceType].cancelled++;
      }
    });

    return breakdown;
  }

  // Send performance report to partner
  static async sendPerformanceReport(partnerId, period = '30d') {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) throw new Error('Partner not found');

      const performance = await this.getPerformanceSummary(partnerId, period);

      // Send email report (implement email template)
      // await emailService.sendPerformanceReport(partner, performance);

      return performance;
    } catch (error) {
      console.error('Error sending performance report:', error);
      throw error;
    }
  }
}

module.exports = PartnerService;