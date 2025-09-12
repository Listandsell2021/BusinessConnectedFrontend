const Lead = require('../models/Lead');
const Partner = require('../models/Partner');

// @desc    Get Superadmin dashboard data
// @route   GET /api/dashboard/superadmin
// @access  Private (Superadmin)
const getSuperadminDashboard = async (req, res) => {
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
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Build filters
    const leadFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    const partnerFilter = {};
    
    if (serviceType) {
      leadFilter.serviceType = serviceType;
      partnerFilter['services.serviceType'] = serviceType;
    }

    // Get KPIs
    const [
      totalLeads,
      pendingLeads,
      assignedLeads,
      acceptedLeads,
      cancelledLeads,
      totalPartners,
      activePartners,
      exclusivePartners
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Lead.countDocuments({ ...leadFilter, status: 'pending' }),
      Lead.countDocuments({ ...leadFilter, status: 'assigned' }),
      Lead.countDocuments({ ...leadFilter, status: 'accepted' }),
      Lead.countDocuments({ ...leadFilter, status: 'cancelled' }),
      Partner.countDocuments(partnerFilter),
      Partner.countDocuments({ ...partnerFilter, status: 'active' }),
      Partner.countDocuments({ ...partnerFilter, partnerType: 'exclusive' })
    ]);

    // Get leads trend (daily for last 30 days)
    const leadsPerDay = await Lead.aggregate([
      { $match: leadFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          moving: { $sum: { $cond: [{ $eq: ["$serviceType", "moving"] }, 1, 0] } },
          cleaning: { $sum: { $cond: [{ $eq: ["$serviceType", "cleaning"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get leads by domain
    const leadsByDomain = await Lead.aggregate([
      { $match: leadFilter },
      {
        $group: {
          _id: "$sourceDomain",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get top performing partners
    const topPartners = await Partner.aggregate([
      { $match: partnerFilter },
      {
        $project: {
          companyName: 1,
          'metrics.totalLeadsAccepted': 1,
          'metrics.totalRevenue': 1,
          acceptanceRate: {
            $cond: {
              if: { $eq: ["$metrics.totalLeadsReceived", 0] },
              then: 0,
              else: {
                $multiply: [
                  { $divide: ["$metrics.totalLeadsAccepted", "$metrics.totalLeadsReceived"] },
                  100
                ]
              }
            }
          }
        }
      },
      { $sort: { 'metrics.totalLeadsAccepted': -1 } },
      { $limit: 10 }
    ]);

    const dashboardData = {
      kpis: {
        totalLeads,
        pendingLeads,
        assignedLeads,
        acceptedLeads,
        cancelledLeads,
        totalPartners,
        activePartners,
        exclusivePartners
      },
      charts: {
        leadsPerDay,
        leadsByDomain,
        topPartners
      },
      period: { startDate, endDate }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get dashboard data', 
      error: error.message 
    });
  }
};

// @desc    Get Partner dashboard data
// @route   GET /api/dashboard/partner/:partnerId
// @access  Private (Partner/Superadmin)
const getPartnerDashboard = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { period = '30d' } = req.query;

    // Partners can only see their own dashboard
    if (req.user.role === 'partner' && req.user.id !== partnerId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
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

    const leadFilter = {
      assignedPartner: partnerId,
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Get KPIs including pending cancellation approvals
    const [
      totalLeads,
      acceptedLeads,
      cancelledLeads,
      pendingLeads,
      pendingCancellationLeads
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Lead.countDocuments({ ...leadFilter, status: 'accepted' }),
      Lead.countDocuments({ ...leadFilter, status: 'cancelled' }),
      Lead.countDocuments({ ...leadFilter, status: 'assigned' }),
      Lead.countDocuments({ ...leadFilter, status: 'pending_cancellation' })
    ]);

    // Get revenue
    const revenueResult = await Lead.aggregate([
      { $match: { ...leadFilter, status: 'accepted' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$actualValue" },
          estimatedRevenue: { $sum: "$estimatedValue" }
        }
      }
    ]);

    const revenue = revenueResult[0] || { totalRevenue: 0, estimatedRevenue: 0 };

    // Get leads trend
    const leadsPerDay = await Lead.aggregate([
      { $match: leadFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          received: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get service breakdown
    const serviceBreakdown = await Lead.aggregate([
      { $match: leadFilter },
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } }
        }
      }
    ]);

    const dashboardData = {
      kpis: {
        totalLeads,
        acceptedLeads,
        cancelledLeads,
        pendingLeads,
        pendingCancellationLeads, // Leads requesting cancellation (pending superadmin approval)
        acceptanceRate: totalLeads > 0 ? (acceptedLeads / totalLeads) * 100 : 0,
        totalRevenue: revenue.totalRevenue,
        estimatedRevenue: revenue.estimatedRevenue
      },
      charts: {
        leadsPerDay,
        serviceBreakdown
      },
      period: { startDate, endDate }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to get partner dashboard', 
      error: error.message 
    });
  }
};

module.exports = {
  getSuperadminDashboard,
  getPartnerDashboard
};