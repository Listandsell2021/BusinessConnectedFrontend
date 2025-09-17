const mongoose = require('mongoose');
const Partner = require('../models/Partner');
require('dotenv').config();

const cleanupCleaningPreferences = async () => {
  try {
    console.log('🧹 Starting cleanup of cleaning service preferences...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all cleaning partners
    const cleaningPartners = await Partner.find({
      serviceType: 'cleaning'
    });

    console.log(`📊 Found ${cleaningPartners.length} cleaning partners to cleanup`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const partner of cleaningPartners) {
      try {
        const cleaningPrefs = partner.preferences?.cleaning;
        if (!cleaningPrefs) continue;

        console.log(`\n🔄 Cleaning partner: ${partner.companyName} (${partner.partnerId})`);

        let hasChanges = false;
        const originalKeys = Object.keys(cleaningPrefs.toObject ? cleaningPrefs.toObject() : cleaningPrefs);
        console.log(`  📋 Current keys:`, originalKeys);

        // Keys to keep
        const keysToKeep = ['countries', 'serviceArea'];

        // Keys to remove (legacy)
        const keysToRemove = ['cities', 'citySettings', 'radius'];

        // Check what needs to be removed (include all legacy keys regardless of value)
        const keysFoundToRemove = keysToRemove.filter(key =>
          cleaningPrefs.hasOwnProperty(key)
        );

        console.log(`  🔍 Legacy keys check:`, {
          cities: cleaningPrefs.cities,
          citySettings: cleaningPrefs.citySettings,
          radius: cleaningPrefs.radius
        });

        if (keysFoundToRemove.length > 0) {
          console.log(`  🗑️  Removing legacy keys:`, keysFoundToRemove);

          // Use MongoDB $unset to remove the fields directly
          const unsetFields = {};
          keysFoundToRemove.forEach(key => {
            unsetFields[`preferences.cleaning.${key}`] = 1;
          });

          // Use updateOne with $unset to remove fields and $set to ensure required fields
          await Partner.updateOne(
            { _id: partner._id },
            {
              $unset: unsetFields,
              $set: {
                'preferences.cleaning.countries': cleaningPrefs.countries || [],
                'preferences.cleaning.serviceArea': cleaningPrefs.serviceArea || {}
              }
            }
          );

          cleanedCount++;
          console.log(`  ✅ Successfully cleaned preferences using $unset`);

          // Verify the changes
          const updatedPartner = await Partner.findById(partner._id).select('preferences.cleaning');
          const finalKeys = Object.keys(updatedPartner.preferences.cleaning.toObject()).filter(key =>
            updatedPartner.preferences.cleaning[key] !== undefined
          );
          console.log(`  📋 Final keys:`, finalKeys);
        } else {
          console.log(`  ✅ Already clean - no legacy keys found`);
        }

      } catch (error) {
        console.error(`❌ Error cleaning partner ${partner.companyName}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎯 Cleanup Summary:`);
    console.log(`✅ Successfully cleaned: ${cleanedCount} partners`);
    console.log(`❌ Errors encountered: ${errorCount} partners`);
    console.log(`📊 Total partners processed: ${cleaningPartners.length}`);

    if (cleanedCount > 0) {
      console.log(`\n🔍 Verification - Checking cleaned data...`);
      const verificationPartners = await Partner.find({
        serviceType: 'cleaning'
      }).select('companyName partnerId preferences.cleaning');

      console.log(`\n📋 Final structure for all cleaning partners:`);
      verificationPartners.forEach(partner => {
        const cleaningKeys = Object.keys(partner.preferences.cleaning.toObject()).filter(key =>
          partner.preferences.cleaning[key] !== undefined
        );
        console.log(`  📍 ${partner.companyName}: [${cleaningKeys.join(', ')}]`);
      });
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run cleanup
if (require.main === module) {
  cleanupCleaningPreferences();
}

module.exports = { cleanupCleaningPreferences };