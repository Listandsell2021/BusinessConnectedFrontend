// Migration script to add leadPrice and partnerType to existing partner assignments
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');
const Settings = require('../models/Settings');

// Load environment variables
require('dotenv').config();

async function migratePartnerAssignmentPrices() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    console.log('Connected to MongoDB');

    // Get current settings
    console.log('Fetching current settings...');
    const settings = await Settings.getSettings();
    console.log('Current pricing settings:', JSON.stringify(settings.pricing, null, 2));

    // Find all leads with partner assignments that don't have leadPrice
    console.log('Finding leads with partner assignments missing pricing...');
    const leadsToUpdate = await Lead.find({
      'partnerAssignments.0': { $exists: true },
      $or: [
        { 'partnerAssignments.leadPrice': { $exists: false } },
        { 'partnerAssignments.partnerType': { $exists: false } }
      ]
    }).populate('partnerAssignments.partner', 'partnerType');

    console.log(`Found ${leadsToUpdate.length} leads that need migration`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const lead of leadsToUpdate) {
      console.log(`\nProcessing lead ${lead.leadId} (${lead.serviceType})`);

      let leadModified = false;

      for (const assignment of lead.partnerAssignments) {
        // Skip if assignment already has both fields
        if (assignment.leadPrice !== undefined && assignment.partnerType !== undefined) {
          console.log(`  Assignment for partner ${assignment.partner._id} already has pricing - skipping`);
          continue;
        }

        // Get partner info
        const partner = assignment.partner;
        if (!partner || !partner.partnerType) {
          console.log(`  Partner ${assignment.partner._id} not found or missing partnerType - skipping`);
          skippedCount++;
          continue;
        }

        // Get pricing for this service type and partner type
        const pricing = settings.pricing[lead.serviceType];
        if (!pricing || !pricing[partner.partnerType]) {
          console.log(`  No pricing found for ${lead.serviceType} ${partner.partnerType} - using default`);
          // Use default pricing
          assignment.leadPrice = lead.serviceType === 'moving' ? 25 : 15;
          assignment.partnerType = partner.partnerType;
        } else {
          assignment.leadPrice = pricing[partner.partnerType].perLeadPrice;
          assignment.partnerType = partner.partnerType;
        }

        console.log(`  Updated assignment: partner=${partner._id}, type=${assignment.partnerType}, price=€${assignment.leadPrice}`);
        leadModified = true;
      }

      if (leadModified) {
        await lead.save();
        updatedCount++;
        console.log(`  ✅ Lead ${lead.leadId} updated successfully`);
      } else {
        console.log(`  ⏭️  Lead ${lead.leadId} no changes needed`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`Total leads processed: ${leadsToUpdate.length}`);
    console.log(`Leads updated: ${updatedCount}`);
    console.log(`Assignments skipped: ${skippedCount}`);
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migratePartnerAssignmentPrices();
}

module.exports = migratePartnerAssignmentPrices;