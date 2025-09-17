const mongoose = require('mongoose');
const Partner = require('../models/Partner');

async function cleanupLegacyPartnerFields() {
  try {
    console.log('Starting cleanup of legacy partner fields and ensuring proper structure...');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    }

    // Find all partners to check for cleanup and structure updates
    const allPartners = await Partner.find({});
    console.log(`Found ${allPartners.length} partners to process`);

    let cleanedCount = 0;
    let structureUpdatedCount = 0;

    for (const partner of allPartners) {
      console.log(`\nProcessing partner: ${partner.partnerId || partner._id} (${partner.serviceType})`);

      // Prepare the update operations
      const updateQuery = {
        $unset: {},
        $set: {}
      };

      // Check which legacy fields exist and mark them for removal
      if (partner.preferences?.serviceAreas !== undefined) {
        updateQuery.$unset['preferences.serviceAreas'] = 1;
        console.log(`  - Removing legacy serviceAreas field`);
      }

      if (partner.preferences?.radius !== undefined) {
        updateQuery.$unset['preferences.radius'] = 1;
        console.log(`  - Removing legacy radius field`);
      }

      if (partner.preferences?.maxLeadsPerWeek !== undefined) {
        updateQuery.$unset['preferences.maxLeadsPerWeek'] = 1;
        console.log(`  - Removing maxLeadsPerWeek field`);
      }

      if (partner.preferences?.workingHours !== undefined) {
        updateQuery.$unset['preferences.workingHours'] = 1;
        console.log(`  - Removing workingHours field`);
      }

      // For moving partners, ensure proper pickup/destination structure and remove cleaning prefs
      if (partner.serviceType === 'moving') {
        const movingPrefs = partner.preferences?.moving || {};

        // Check if pickup structure is missing or incomplete
        if (!movingPrefs.pickup || !movingPrefs.pickup.serviceArea) {
          updateQuery.$set['preferences.moving.pickup.serviceArea'] = {};
          console.log(`  - Adding missing pickup serviceArea structure`);
          structureUpdatedCount++;
        }

        // Check if destination structure is missing or incomplete
        if (!movingPrefs.destination || !movingPrefs.destination.serviceArea) {
          updateQuery.$set['preferences.moving.destination.serviceArea'] = {};
          console.log(`  - Adding missing destination serviceArea structure`);
          structureUpdatedCount++;
        }

        // Remove cleaning preferences from moving partners
        if (partner.preferences?.cleaning !== undefined) {
          updateQuery.$unset['preferences.cleaning'] = 1;
          console.log(`  - Removing cleaning preferences from moving partner`);
        }
      }

      // For cleaning partners, ensure proper cleaning structure and remove moving prefs
      if (partner.serviceType === 'cleaning') {
        const cleaningPrefs = partner.preferences?.cleaning || {};

        if (!cleaningPrefs.cities || !cleaningPrefs.countries || cleaningPrefs.radius === undefined) {
          updateQuery.$set['preferences.cleaning'] = {
            cities: cleaningPrefs.cities || [],
            countries: cleaningPrefs.countries || [],
            radius: cleaningPrefs.radius !== undefined ? cleaningPrefs.radius : 50
          };
          console.log(`  - Ensuring complete cleaning structure`);
        }

        // Remove moving preferences from cleaning partners
        if (partner.preferences?.moving !== undefined) {
          updateQuery.$unset['preferences.moving'] = 1;
          console.log(`  - Removing moving preferences from cleaning partner`);
        }
      }

      // Only update if there are changes to make
      const hasUnsetFields = Object.keys(updateQuery.$unset).length > 0;
      const hasSetFields = Object.keys(updateQuery.$set).length > 0;

      if (hasUnsetFields || hasSetFields) {
        // Build the actual update query based on what needs to be done
        const finalUpdateQuery = {};
        if (hasUnsetFields) finalUpdateQuery.$unset = updateQuery.$unset;
        if (hasSetFields) finalUpdateQuery.$set = updateQuery.$set;

        await Partner.updateOne({ _id: partner._id }, finalUpdateQuery);
        cleanedCount++;
        console.log(`  ✓ Updated partner ${partner.partnerId || partner._id}`);
      }
    }

    console.log(`\nCleanup completed. Cleaned ${cleanedCount} partners.`);

    // Verify the cleanup
    const verifyPartners = await Partner.find({}).limit(3).select('partnerId serviceType preferences');

    console.log('\nVerification: Checking cleaned structure...');
    for (const partner of verifyPartners) {
      console.log(`\nPartner ${partner.partnerId} (${partner.serviceType}):`);

      if (partner.serviceType === 'moving') {
        console.log(`  ✓ Has moving.pickup: ${!!partner.preferences?.moving?.pickup}`);
        console.log(`  ✓ Has moving.destination: ${!!partner.preferences?.moving?.destination}`);
        console.log(`  ✓ No cleaning prefs: ${!partner.preferences?.cleaning}`);
      } else if (partner.serviceType === 'cleaning') {
        console.log(`  ✓ Has cleaning structure: ${!!partner.preferences?.cleaning}`);
        console.log(`  ✓ No moving prefs: ${!partner.preferences?.moving}`);
      }

      console.log(`  ✓ No legacy serviceAreas: ${!partner.preferences?.serviceAreas}`);
      console.log(`  ✓ No legacy radius: ${!partner.preferences?.radius}`);
      console.log(`  ✓ No workingHours: ${!partner.preferences?.workingHours}`);
      console.log(`  ✓ No maxLeadsPerWeek: ${!partner.preferences?.maxLeadsPerWeek}`);
    }

    return true;
  } catch (error) {
    console.error('Cleanup failed:', error);
    return false;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupLegacyPartnerFields()
    .then((success) => {
      if (success) {
        console.log('Cleanup completed successfully');
        process.exit(0);
      } else {
        console.log('Cleanup failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}

module.exports = cleanupLegacyPartnerFields;