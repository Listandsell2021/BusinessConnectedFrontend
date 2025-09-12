const mongoose = require('mongoose');
const Partner = require('../models/Partner');

async function updatePartnerServiceAreaStructure() {
  try {
    console.log('Starting partner service area structure migration...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    }
    
    // Find all partners with moving preferences
    const partners = await Partner.find({
      'preferences.moving': { $exists: true }
    });
    
    console.log(`Found ${partners.length} partners to migrate`);
    
    let updatedCount = 0;
    
    for (const partner of partners) {
      let hasChanges = false;
      const movingPrefs = partner.preferences.moving;
      
      // Check if we need to migrate from old structure
      if (movingPrefs.countries || movingPrefs.citySettings) {
        console.log(`\nMigrating partner: ${partner.partnerId || partner._id}`);
        
        const newServiceArea = {};
        const countries = movingPrefs.countries || [];
        const citySettings = movingPrefs.citySettings || {};
        
        // Convert Map to Object if needed
        const citySettingsObj = citySettings instanceof Map ? Object.fromEntries(citySettings) : citySettings;
        
        // Process each country
        for (const countryCode of countries) {
          // Check if this country has any cities configured
          const countryCities = {};
          let hasCountryCities = false;
          
          Object.entries(citySettingsObj).forEach(([cityKey, setting]) => {
            if (cityKey.startsWith(`${countryCode}-`)) {
              const cityName = cityKey.split('-')[1];
              countryCities[cityName] = {
                radius: setting.radius || 0
              };
              hasCountryCities = true;
            }
          });
          
          // Set up new structure for this country
          if (hasCountryCities) {
            // Country has cities configured - use city-based service
            newServiceArea[countryCode] = {
              type: 'cities',
              cities: countryCities
            };
            console.log(`  ${countryCode}: city-based service with ${Object.keys(countryCities).length} cities`);
          } else {
            // Country has no cities configured - use whole country service
            newServiceArea[countryCode] = {
              type: 'country',
              cities: {}
            };
            console.log(`  ${countryCode}: whole country service`);
          }
        }
        
        // Update the partner with new structure
        if (Object.keys(newServiceArea).length > 0) {
          await Partner.updateOne(
            { _id: partner._id },
            {
              $set: {
                'preferences.moving.serviceArea': newServiceArea
              },
              $unset: {
                'preferences.moving.countries': 1,
                'preferences.moving.citySettings': 1
              }
            }
          );
          
          updatedCount++;
          hasChanges = true;
          console.log(`  ✓ Updated partner ${partner.partnerId || partner._id}`);
        }
      }
    }
    
    console.log(`\nMigration completed. Updated ${updatedCount} partners.`);
    
    // Verify the migration
    const verifyPartners = await Partner.find({
      'preferences.moving.serviceArea': { $exists: true }
    }).limit(3);
    
    console.log('\nVerification: Checking updated structure...');
    for (const partner of verifyPartners) {
      const serviceArea = partner.preferences.moving.serviceArea;
      const serviceAreaObj = serviceArea instanceof Map ? Object.fromEntries(serviceArea) : serviceArea;
      
      console.log(`\nPartner ${partner.partnerId}:`);
      Object.entries(serviceAreaObj).forEach(([country, config]) => {
        console.log(`  ${country}: type=${config.type}, cities=${Object.keys(config.cities || {}).length}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  updatePartnerServiceAreaStructure()
    .then((success) => {
      if (success) {
        console.log('Migration completed successfully');
        process.exit(0);
      } else {
        console.log('Migration failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = updatePartnerServiceAreaStructure;