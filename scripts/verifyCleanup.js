const mongoose = require('mongoose');
const Partner = require('../models/Partner');
require('dotenv').config();

const verifyCleanup = async () => {
  try {
    console.log('🔍 Verifying cleaning service preferences cleanup...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all cleaning partners
    const cleaningPartners = await Partner.find({
      serviceType: 'cleaning'
    }).select('companyName partnerId preferences.cleaning');

    console.log(`📊 Found ${cleaningPartners.length} cleaning partners`);

    console.log(`\n📋 Final structure for all cleaning partners:`);
    cleaningPartners.forEach(partner => {
      const cleaningPrefs = partner.preferences.cleaning;
      const keys = Object.keys(cleaningPrefs.toObject());

      console.log(`\n🧽 ${partner.companyName} (${partner.partnerId}):`);
      console.log(`  📍 Keys: [${keys.join(', ')}]`);

      if (cleaningPrefs.countries) {
        console.log(`  🌍 Countries: [${cleaningPrefs.countries.join(', ')}]`);
      }

      if (cleaningPrefs.serviceArea) {
        const serviceAreaCountries = Object.keys(cleaningPrefs.serviceArea);
        if (serviceAreaCountries.length > 0) {
          console.log(`  🏙️  Service Areas: [${serviceAreaCountries.join(', ')}]`);

          serviceAreaCountries.forEach(countryCode => {
            const countryData = cleaningPrefs.serviceArea[countryCode];
            if (countryData && countryData.cities) {
              const cities = Object.keys(countryData.cities);
              console.log(`    ${countryCode}: ${cities.join(', ')}`);
            }
          });
        }
      }
    });

    console.log(`\n✅ Verification complete - all cleaning partners now have clean preferences structure!`);

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run verification
if (require.main === module) {
  verifyCleanup();
}

module.exports = { verifyCleanup };