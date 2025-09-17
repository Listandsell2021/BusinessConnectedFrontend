const mongoose = require('mongoose');
const Partner = require('../models/Partner');
require('dotenv').config();

const migrateCountryCodesToNames = async () => {
  try {
    console.log('🔄 Starting migration from country codes to country names...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Country code to name mapping
    const codeToName = {
      'DE': 'Germany',
      'AT': 'Austria',
      'CH': 'Switzerland',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'PT': 'Portugal',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'SK': 'Slovakia',
      'HU': 'Hungary',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'HR': 'Croatia',
      'SI': 'Slovenia',
      'GR': 'Greece',
      'DK': 'Denmark',
      'SE': 'Sweden',
      'NO': 'Norway',
      'FI': 'Finland',
      'EE': 'Estonia',
      'LV': 'Latvia',
      'LT': 'Lithuania',
      'IE': 'Ireland',
      'GB': 'United Kingdom',
      'LU': 'Luxembourg'
    };

    // Find all cleaning partners
    const cleaningPartners = await Partner.find({
      serviceType: 'cleaning',
      'preferences.cleaning.serviceArea': { $exists: true, $ne: {} }
    });

    console.log(`📊 Found ${cleaningPartners.length} cleaning partners to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const partner of cleaningPartners) {
      try {
        const cleaningPrefs = partner.preferences.cleaning;
        const currentServiceArea = cleaningPrefs.serviceArea || {};
        const currentCountries = cleaningPrefs.countries || [];

        console.log(`\n🔄 Migrating partner: ${partner.companyName} (${partner.partnerId})`);
        console.log(`  📋 Current serviceArea keys:`, Object.keys(currentServiceArea));
        console.log(`  🌍 Current countries:`, currentCountries);

        let hasChanges = false;
        const newServiceArea = {};
        const newCountries = [];

        // Convert serviceArea keys from codes to names
        Object.keys(currentServiceArea).forEach(key => {
          const countryName = codeToName[key] || key; // Use name if found, otherwise keep original
          newServiceArea[countryName] = currentServiceArea[key];

          if (codeToName[key]) {
            console.log(`    ✅ Converted ${key} → ${countryName}`);
            hasChanges = true;
          } else {
            console.log(`    ⚠️  Kept ${key} (no mapping found)`);
          }
        });

        // Convert countries array from codes to names
        currentCountries.forEach(countryCode => {
          const countryName = codeToName[countryCode] || countryCode;
          newCountries.push(countryName);

          if (codeToName[countryCode]) {
            console.log(`    ✅ Converted country ${countryCode} → ${countryName}`);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          // Update the partner
          partner.preferences.cleaning.serviceArea = newServiceArea;
          partner.preferences.cleaning.countries = newCountries;

          await partner.save();
          migratedCount++;

          console.log(`  💾 Successfully migrated partner`);
          console.log(`  📋 New serviceArea keys:`, Object.keys(newServiceArea));
          console.log(`  🌍 New countries:`, newCountries);
        } else {
          console.log(`  ✅ No migration needed`);
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
        serviceType: 'cleaning'
      }).select('companyName partnerId preferences.cleaning');

      console.log(`\n📋 Final structure for all cleaning partners:`);
      verificationPartners.forEach(partner => {
        const serviceAreaCountries = Object.keys(partner.preferences.cleaning.serviceArea || {});
        console.log(`  📍 ${partner.companyName}: [${serviceAreaCountries.join(', ')}]`);
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
  migrateCountryCodesToNames();
}

module.exports = { migrateCountryCodesToNames };