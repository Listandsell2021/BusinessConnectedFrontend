const mongoose = require('mongoose');
const Partner = require('../models/Partner');
require('dotenv').config();

const removeOldCountriesArray = async () => {
  try {
    console.log('🗑️ Removing old countries array from cleaning preferences...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all cleaning partners that still have countries array
    const cleaningPartners = await Partner.find({
      serviceType: 'cleaning',
      'preferences.cleaning.countries': { $exists: true }
    });

    console.log(`📊 Found ${cleaningPartners.length} cleaning partners with countries array`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const partner of cleaningPartners) {
      try {
        console.log(`\n🔄 Processing partner: ${partner.companyName} (${partner.partnerId})`);

        const cleaningPrefs = partner.preferences.cleaning;
        const currentCountries = cleaningPrefs.countries || [];
        const serviceAreaKeys = Object.keys(cleaningPrefs.serviceArea || {});

        console.log(`  📋 Current countries array: [${currentCountries.join(', ')}]`);
        console.log(`  📍 ServiceArea keys: [${serviceAreaKeys.join(', ')}]`);

        // Check if serviceArea exists and has data
        if (serviceAreaKeys.length > 0) {
          console.log(`  ✅ ServiceArea has data - removing countries array`);

          // Use direct MongoDB update to remove the countries field
          await Partner.updateOne(
            { _id: partner._id },
            { $unset: { 'preferences.cleaning.countries': '' } }
          );

          cleanedCount++;
          console.log(`  💾 Successfully removed countries array`);
        } else if (currentCountries.length > 0) {
          console.log(`  ⚠️  ServiceArea is empty but countries array exists - keeping for now`);
          console.log(`  📝 You may need to rebuild serviceArea from countries data first`);
        } else {
          console.log(`  ✅ No countries array to remove`);
        }

      } catch (error) {
        console.error(`❌ Error processing partner ${partner.companyName}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎯 Cleanup Summary:`);
    console.log(`✅ Successfully cleaned: ${cleanedCount} partners`);
    console.log(`❌ Errors encountered: ${errorCount} partners`);
    console.log(`📊 Total partners processed: ${cleaningPartners.length}`);

    if (cleanedCount > 0) {
      console.log(`\n🔍 Verification - Checking final structure...`);
      const verificationPartners = await Partner.find({
        serviceType: 'cleaning'
      }).select('companyName partnerId preferences.cleaning');

      console.log(`\n📋 Final structure for all cleaning partners:`);
      verificationPartners.forEach(partner => {
        const cleaningPrefs = partner.preferences.cleaning;
        const keys = Object.keys(cleaningPrefs.toObject());
        const serviceAreaKeys = Object.keys(cleaningPrefs.serviceArea || {});

        console.log(`\n🧽 ${partner.companyName} (${partner.partnerId}):`);
        console.log(`  📍 Keys: [${keys.join(', ')}]`);
        console.log(`  🏙️  ServiceArea: [${serviceAreaKeys.join(', ')}]`);

        // Check if countries field still exists
        if (cleaningPrefs.countries !== undefined) {
          console.log(`  ⚠️  WARNING: Countries field still exists`);
        } else {
          console.log(`  ✅ Countries field properly removed`);
        }
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
  removeOldCountriesArray();
}

module.exports = { removeOldCountriesArray };