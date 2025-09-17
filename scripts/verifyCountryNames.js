const mongoose = require('mongoose');
const Partner = require('../models/Partner');
require('dotenv').config();

const verifyCountryNames = async () => {
  try {
    console.log('🔍 Verifying cleaning service uses country names...');

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

    console.log(`\n📋 Verifying serviceArea structure uses country names:`);
    cleaningPartners.forEach(partner => {
      const cleaningPrefs = partner.preferences.cleaning;
      const countries = cleaningPrefs.countries || [];
      const serviceAreaKeys = Object.keys(cleaningPrefs.serviceArea || {});

      console.log(`\n🧽 ${partner.companyName} (${partner.partnerId}):`);
      console.log(`  🌍 Countries array: [${countries.join(', ')}]`);
      console.log(`  📍 ServiceArea keys: [${serviceAreaKeys.join(', ')}]`);

      // Check if using country names (contains spaces) vs codes (no spaces)
      const hasCountryNames = serviceAreaKeys.some(key => key.includes(' ') || key.length > 3);
      const hasCountryCodes = serviceAreaKeys.some(key => !key.includes(' ') && key.length <= 3);

      if (hasCountryNames && !hasCountryCodes) {
        console.log(`  ✅ CORRECT: Using country names in serviceArea`);
      } else if (hasCountryCodes && !hasCountryNames) {
        console.log(`  ❌ ERROR: Still using country codes in serviceArea`);
      } else if (serviceAreaKeys.length === 0) {
        console.log(`  ⚠️  WARNING: No serviceArea data`);
      } else {
        console.log(`  ⚠️  WARNING: Mixed format detected`);
      }

      // Show detailed structure
      serviceAreaKeys.forEach(countryKey => {
        const countryData = cleaningPrefs.serviceArea[countryKey];
        if (countryData && countryData.cities) {
          const cities = Object.keys(countryData.cities);
          console.log(`    ${countryKey}: ${cities.join(', ')}`);

          // Show city radius data
          cities.forEach(city => {
            const cityData = countryData.cities[city];
            console.log(`      ${city}: radius=${cityData.radius}km`);
          });
        }
      });
    });

    console.log(`\n🎯 Expected structure example:`);
    console.log(`{`);
    console.log(`  "countries": ["Germany", "Switzerland"],`);
    console.log(`  "serviceArea": {`);
    console.log(`    "Germany": {`);
    console.log(`      "type": "cities",`);
    console.log(`      "cities": {`);
    console.log(`        "Berlin": { "radius": 0 },`);
    console.log(`        "Munich": { "radius": 50 }`);
    console.log(`      }`);
    console.log(`    }`);
    console.log(`  }`);
    console.log(`}`);

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
  verifyCountryNames();
}

module.exports = { verifyCountryNames };