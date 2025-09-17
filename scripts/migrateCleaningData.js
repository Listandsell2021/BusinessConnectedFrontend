const mongoose = require('mongoose');
const Partner = require('../models/Partner');
require('dotenv').config();

const migrateCleaningData = async () => {
  try {
    console.log('🚀 Starting cleaning service data migration...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all partners with cleaning service
    const cleaningPartners = await Partner.find({
      serviceType: 'cleaning',
      $or: [
        { 'preferences.cleaning.serviceArea': { $exists: false } },
        { 'preferences.cleaning.serviceArea': {} },
        { 'preferences.cleaning.serviceArea': null }
      ]
    });

    console.log(`📊 Found ${cleaningPartners.length} cleaning partners to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const partner of cleaningPartners) {
      try {
        const cleaningPrefs = partner.preferences?.cleaning || {};
        let serviceArea = {};
        let hasDataToMigrate = false;

        console.log(`\n🔄 Migrating partner: ${partner.companyName} (${partner.partnerId})`);

        // Migrate from citySettings format
        if (cleaningPrefs.citySettings) {
          console.log('  📋 Found citySettings data:', Object.keys(cleaningPrefs.citySettings));

          // Handle new format: { "DE-Berlin": { radius: 50, country: "DE" } }
          const countryGrouped = {};
          Object.keys(cleaningPrefs.citySettings).forEach(key => {
            if (!key.includes('_radius')) {
              if (key.includes('-')) {
                // New format: "DE-Berlin"
                const [countryCode, city] = key.split('-');
                const cityData = cleaningPrefs.citySettings[key];

                if (!countryGrouped[countryCode]) {
                  countryGrouped[countryCode] = {};
                }

                countryGrouped[countryCode][city] = {
                  radius: cityData?.radius || 0
                };

                hasDataToMigrate = true;
              } else {
                // Old format: { "DE": ["Berlin", "Munich"] }
                const cities = cleaningPrefs.citySettings[key];
                const countryCode = key;

                if (Array.isArray(cities) && cities.length > 0) {
                  if (!countryGrouped[countryCode]) {
                    countryGrouped[countryCode] = {};
                  }

                  cities.forEach(city => {
                    countryGrouped[countryCode][city] = { radius: 0 };
                  });

                  hasDataToMigrate = true;
                }
              }
            }
          });

          // Convert grouped data to serviceArea format
          Object.keys(countryGrouped).forEach(countryCode => {
            serviceArea[countryCode] = {
              type: 'cities',
              cities: countryGrouped[countryCode]
            };

            const cityCount = Object.keys(countryGrouped[countryCode]).length;
            console.log(`    ✅ Migrated ${cityCount} cities for ${countryCode}`);
          });
        }

        // Migrate from old cities array format
        if (cleaningPrefs.cities?.length > 0 && Object.keys(serviceArea).length === 0) {
          console.log('  📋 Found legacy cities array:', cleaningPrefs.cities);

          const partnerCountry = partner.address?.country || 'DE';
          const citiesObj = {};

          cleaningPrefs.cities.forEach(city => {
            citiesObj[city] = { radius: cleaningPrefs.radius || 0 };
          });

          serviceArea[partnerCountry] = {
            type: 'cities',
            cities: citiesObj
          };

          // Add country to countries array if not present
          if (!cleaningPrefs.countries?.includes(partnerCountry)) {
            cleaningPrefs.countries = [...(cleaningPrefs.countries || []), partnerCountry];
          }

          console.log(`    ✅ Migrated ${cleaningPrefs.cities.length} cities for ${partnerCountry}`);
          hasDataToMigrate = true;
        }

        // Update partner if we have data to migrate
        if (hasDataToMigrate) {
          partner.preferences.cleaning.serviceArea = serviceArea;

          await partner.save();
          migratedCount++;
          console.log(`    💾 Successfully migrated and saved partner data`);
          console.log(`    📍 New serviceArea:`, JSON.stringify(serviceArea, null, 2));
        } else {
          console.log(`    ⚠️  No data to migrate for this partner`);
        }

      } catch (error) {
        console.error(`❌ Error migrating partner ${partner.companyName}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎯 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount} partners`);
    console.log(`❌ Errors encountered: ${errorCount} partners`);
    console.log(`📊 Total partners processed: ${cleaningPartners.length}`);

    if (migratedCount > 0) {
      console.log(`\n🔍 Verification - Checking migrated data...`);
      const verificationPartners = await Partner.find({
        serviceType: 'cleaning',
        'preferences.cleaning.serviceArea': { $exists: true, $ne: {} }
      }).select('companyName partnerId preferences.cleaning.serviceArea');

      console.log(`✅ Verified: ${verificationPartners.length} partners now have serviceArea data`);

      verificationPartners.forEach(partner => {
        const serviceAreaCountries = Object.keys(partner.preferences.cleaning.serviceArea || {});
        console.log(`  📍 ${partner.companyName}: ${serviceAreaCountries.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration
if (require.main === module) {
  migrateCleaningData();
}

module.exports = { migrateCleaningData };