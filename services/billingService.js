// Billing Service - Invoice and Income Management based on Accepted Leads
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');
const Invoice = require('../models/Invoice');
const Revenue = require('../models/Revenue');
const Settings = require('../models/Settings');

class BillingService {

  /**
   * Generate invoice for a partner based on accepted leads in a billing period
   * @param {String} partnerId - Partner ID
   * @param {String} serviceType - Service type (moving/cleaning)
   * @param {Object} billingPeriod - { startDate, endDate }
   * @param {String} createdBy - User ID who created the invoice
   * @returns {Object} Invoice data
   */
  static async generatePartnerInvoice(partnerId, serviceType, billingPeriod, createdBy) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        throw new Error('Partner not found');
      }

      // Find all leads with accepted assignments for this partner in the billing period
      const acceptedLeads = await this.getAcceptedLeadsForBilling(partnerId, serviceType, billingPeriod);

      if (acceptedLeads.length === 0) {
        throw new Error('No accepted leads found for the billing period');
      }

      // Calculate invoice totals
      const invoiceItems = [];
      let subtotal = 0;

      for (const lead of acceptedLeads) {
        const acceptedAssignment = lead.partnerAssignments.find(
          assignment => assignment.partner.toString() === partnerId.toString() &&
                       assignment.status === 'accepted'
        );

        if (acceptedAssignment && acceptedAssignment.leadPrice) {
          invoiceItems.push({
            leadId: lead._id,
            leadNumber: lead.leadId,
            serviceType: lead.serviceType,
            acceptedDate: acceptedAssignment.acceptedAt,
            amount: acceptedAssignment.leadPrice,
            description: `${lead.serviceType === 'moving' ? 'Moving' : 'Cleaning'} Lead - ${lead.leadId}`,
            customerInfo: {
              name: lead.user ? `${lead.user.firstName} ${lead.user.lastName}` : 'Unknown',
              city: lead.serviceLocation?.city || lead.city || 'Unknown'
            }
          });
          subtotal += acceptedAssignment.leadPrice;
        }
      }

      // Get tax rate from settings
      const settings = await Settings.getSettings();
      const taxRate = settings.system.taxRate || 19; // Default 19%
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + taxAmount;

      // Create invoice
      const invoice = new Invoice({
        partnerId,
        serviceType,
        billingPeriod: {
          startDate: new Date(billingPeriod.startDate),
          endDate: new Date(billingPeriod.endDate)
        },
        items: invoiceItems,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: 'draft',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdBy
      });

      await invoice.save();

      // Create revenue entries for each accepted lead
      await this.createRevenueEntries(acceptedLeads, partnerId);

      return invoice;

    } catch (error) {
      console.error('Error generating partner invoice:', error);
      throw error;
    }
  }

  /**
   * Get accepted leads for billing period
   * @param {String} partnerId
   * @param {String} serviceType
   * @param {Object} billingPeriod
   * @returns {Array} Accepted leads
   */
  static async getAcceptedLeadsForBilling(partnerId, serviceType, billingPeriod) {
    const query = {
      serviceType,
      'partnerAssignments': {
        $elemMatch: {
          partner: partnerId,
          status: 'accepted',
          acceptedAt: {
            $gte: new Date(billingPeriod.startDate),
            $lte: new Date(billingPeriod.endDate)
          }
        }
      }
    };

    return await Lead.find(query)
      .populate('user', 'firstName lastName email')
      .populate('partnerAssignments.partner', 'companyName partnerType');
  }

  /**
   * Create revenue entries for accepted leads
   * @param {Array} acceptedLeads
   * @param {String} partnerId
   */
  static async createRevenueEntries(acceptedLeads, partnerId) {
    for (const lead of acceptedLeads) {
      const acceptedAssignment = lead.partnerAssignments.find(
        assignment => assignment.partner.toString() === partnerId.toString() &&
                     assignment.status === 'accepted'
      );

      if (!acceptedAssignment) continue;

      // Check if revenue entry already exists
      const existingRevenue = await Revenue.findOne({
        leadId: lead._id,
        partnerId: partnerId
      });

      if (!existingRevenue) {
        const revenue = new Revenue({
          leadId: lead._id,
          partnerId: partnerId,
          serviceType: lead.serviceType,
          amount: acceptedAssignment.leadPrice,
          commission: acceptedAssignment.leadPrice * 0.1, // 10% commission
          customer: {
            name: lead.user ? `${lead.user.firstName} ${lead.user.lastName}` : 'Unknown',
            email: lead.user?.email || 'unknown@example.com',
            city: lead.serviceLocation?.city || lead.city || 'Unknown'
          },
          status: 'confirmed',
          revenueDate: acceptedAssignment.acceptedAt,
          createdBy: partnerId
        });

        await revenue.save();
      }
    }
  }

  /**
   * Calculate income summary for a period based on accepted leads
   * @param {Object} period - { startDate, endDate }
   * @param {String} serviceType - Optional filter by service type
   * @param {String} partnerId - Optional filter by partner
   * @returns {Object} Income summary
   */
  static async calculateIncomeForPeriod(period, serviceType = null, partnerId = null) {
    try {
      const query = {
        'partnerAssignments': {
          $elemMatch: {
            status: 'accepted',
            acceptedAt: {
              $gte: new Date(period.startDate),
              $lte: new Date(period.endDate)
            }
          }
        }
      };

      if (serviceType) {
        query.serviceType = serviceType;
      }

      if (partnerId) {
        query['partnerAssignments.partner'] = partnerId;
      }

      const leads = await Lead.find(query)
        .populate('partnerAssignments.partner', 'companyName partnerType');

      let totalIncome = 0;
      let totalLeads = 0;
      const serviceBreakdown = {};
      const partnerBreakdown = {};

      for (const lead of leads) {
        for (const assignment of lead.partnerAssignments) {
          if (assignment.status === 'accepted' &&
              assignment.acceptedAt >= new Date(period.startDate) &&
              assignment.acceptedAt <= new Date(period.endDate)) {

            // Filter by partner if specified
            if (partnerId && assignment.partner._id.toString() !== partnerId.toString()) {
              continue;
            }

            const leadPrice = assignment.leadPrice || 0;
            totalIncome += leadPrice;
            totalLeads++;

            // Service breakdown
            if (!serviceBreakdown[lead.serviceType]) {
              serviceBreakdown[lead.serviceType] = {
                income: 0,
                leads: 0,
                avgPrice: 0
              };
            }
            serviceBreakdown[lead.serviceType].income += leadPrice;
            serviceBreakdown[lead.serviceType].leads++;
            serviceBreakdown[lead.serviceType].avgPrice =
              serviceBreakdown[lead.serviceType].income / serviceBreakdown[lead.serviceType].leads;

            // Partner breakdown
            const partnerKey = assignment.partner._id.toString();
            if (!partnerBreakdown[partnerKey]) {
              partnerBreakdown[partnerKey] = {
                partnerName: assignment.partner.companyName,
                partnerType: assignment.partner.partnerType,
                income: 0,
                leads: 0,
                avgPrice: 0
              };
            }
            partnerBreakdown[partnerKey].income += leadPrice;
            partnerBreakdown[partnerKey].leads++;
            partnerBreakdown[partnerKey].avgPrice =
              partnerBreakdown[partnerKey].income / partnerBreakdown[partnerKey].leads;
          }
        }
      }

      const avgLeadPrice = totalLeads > 0 ? totalIncome / totalLeads : 0;

      return {
        period,
        totalIncome,
        totalLeads,
        avgLeadPrice,
        serviceBreakdown,
        partnerBreakdown: Object.values(partnerBreakdown)
      };

    } catch (error) {
      console.error('Error calculating income for period:', error);
      throw error;
    }
  }

  /**
   * Get billing-ready partners for a service type and period
   * @param {String} serviceType
   * @param {Object} billingPeriod
   * @returns {Array} Partners with accepted leads
   */
  static async getBillingReadyPartners(serviceType, billingPeriod) {
    const pipeline = [
      {
        $match: {
          serviceType,
          'partnerAssignments': {
            $elemMatch: {
              status: 'accepted',
              acceptedAt: {
                $gte: new Date(billingPeriod.startDate),
                $lte: new Date(billingPeriod.endDate)
              }
            }
          }
        }
      },
      {
        $unwind: '$partnerAssignments'
      },
      {
        $match: {
          'partnerAssignments.status': 'accepted',
          'partnerAssignments.acceptedAt': {
            $gte: new Date(billingPeriod.startDate),
            $lte: new Date(billingPeriod.endDate)
          }
        }
      },
      {
        $group: {
          _id: '$partnerAssignments.partner',
          acceptedLeads: { $sum: 1 },
          totalAmount: { $sum: '$partnerAssignments.leadPrice' }
        }
      },
      {
        $lookup: {
          from: 'partners',
          localField: '_id',
          foreignField: '_id',
          as: 'partner'
        }
      },
      {
        $unwind: '$partner'
      },
      {
        $project: {
          partnerId: '$_id',
          partnerName: '$partner.companyName',
          partnerType: '$partner.partnerType',
          acceptedLeads: 1,
          totalAmount: 1,
          avgLeadPrice: { $divide: ['$totalAmount', '$acceptedLeads'] }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ];

    return await Lead.aggregate(pipeline);
  }

  /**
   * Generate invoices for all eligible partners for a billing period
   * @param {String} serviceType
   * @param {Object} billingPeriod
   * @param {String} createdBy
   * @returns {Array} Generated invoices
   */
  static async generateBulkInvoices(serviceType, billingPeriod, createdBy) {
    try {
      const eligiblePartners = await this.getBillingReadyPartners(serviceType, billingPeriod);
      const invoices = [];

      for (const partnerData of eligiblePartners) {
        try {
          const invoice = await this.generatePartnerInvoice(
            partnerData.partnerId,
            serviceType,
            billingPeriod,
            createdBy
          );
          invoices.push(invoice);
        } catch (error) {
          console.error(`Failed to generate invoice for partner ${partnerData.partnerId}:`, error);
        }
      }

      return invoices;
    } catch (error) {
      console.error('Error generating bulk invoices:', error);
      throw error;
    }
  }
}

module.exports = BillingService;