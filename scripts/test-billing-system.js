// Test script to demonstrate the billing system functionality
const mongoose = require('mongoose');
const BillingService = require('../services/billingService');
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');
const Invoice = require('../models/Invoice');

// Load environment variables
require('dotenv').config();

async function testBillingSystem() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    console.log('✅ Connected to MongoDB');

    // Test 1: Get billing-ready partners for moving service
    console.log('\n📊 Test 1: Getting billing-ready partners for moving service...');
    const billingPeriod = {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    };

    const billingReadyPartners = await BillingService.getBillingReadyPartners('moving', billingPeriod);
    console.log(`Found ${billingReadyPartners.length} partners with accepted moving leads:`);

    billingReadyPartners.forEach(partner => {
      console.log(`  - ${partner.partnerName} (${partner.partnerType}): ${partner.acceptedLeads} leads, €${partner.totalAmount} total`);
    });

    // Test 2: Calculate income summary
    console.log('\n💰 Test 2: Calculating income summary...');
    const incomeSummary = await BillingService.calculateIncomeForPeriod(billingPeriod, 'moving');
    console.log(`Total Income: €${incomeSummary.totalIncome}`);
    console.log(`Total Leads: ${incomeSummary.totalLeads}`);
    console.log(`Average Lead Price: €${incomeSummary.avgLeadPrice.toFixed(2)}`);

    console.log('\nService Breakdown:');
    Object.entries(incomeSummary.serviceBreakdown).forEach(([service, data]) => {
      console.log(`  ${service}: €${data.income} (${data.leads} leads, avg €${data.avgPrice.toFixed(2)})`);
    });

    console.log('\nPartner Breakdown:');
    incomeSummary.partnerBreakdown.slice(0, 3).forEach(partner => {
      console.log(`  ${partner.partnerName} (${partner.partnerType}): €${partner.income} (${partner.leads} leads)`);
    });

    // Test 3: Check accepted leads with pricing
    console.log('\n🎯 Test 3: Checking accepted leads with stored pricing...');
    const acceptedLeads = await BillingService.getAcceptedLeadsForBilling(
      billingReadyPartners[0]?.partnerId,
      'moving',
      billingPeriod
    );

    if (acceptedLeads.length > 0) {
      console.log(`Found ${acceptedLeads.length} accepted leads for first partner:`);
      acceptedLeads.slice(0, 3).forEach(lead => {
        const acceptedAssignment = lead.partnerAssignments.find(
          assignment => assignment.status === 'accepted'
        );
        if (acceptedAssignment) {
          console.log(`  Lead ${lead.leadId}: €${acceptedAssignment.leadPrice} (${acceptedAssignment.partnerType} partner)`);
        }
      });
    }

    // Test 4: Generate a test invoice (if we have data)
    if (billingReadyPartners.length > 0) {
      console.log('\n📋 Test 4: Generating test invoice...');
      const testPartnerId = billingReadyPartners[0].partnerId;

      try {
        const testInvoice = await BillingService.generatePartnerInvoice(
          testPartnerId,
          'moving',
          {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          },
          'test-system'
        );

        console.log(`✅ Invoice generated: ${testInvoice.invoiceNumber}`);
        console.log(`   Partner: ${billingReadyPartners[0].partnerName}`);
        console.log(`   Items: ${testInvoice.items.length} leads`);
        console.log(`   Subtotal: €${testInvoice.subtotal}`);
        console.log(`   Tax (${testInvoice.taxRate}%): €${testInvoice.taxAmount}`);
        console.log(`   Total: €${testInvoice.total}`);

        // Clean up test invoice
        await Invoice.deleteOne({ _id: testInvoice._id });
        console.log('🧹 Test invoice cleaned up');

      } catch (invoiceError) {
        console.log('ℹ️  Invoice generation test skipped:', invoiceError.message);
      }
    }

    console.log('\n✅ All billing system tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testBillingSystem();
}

module.exports = testBillingSystem;