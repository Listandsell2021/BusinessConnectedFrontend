const mongoose = require('mongoose');
const Partner = require('../models/Partner');

async function updatePartnerPickupDestinationStructure() {
  try {
    console.log('Starting partner pickup/destination structure migration...');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    }

    // Find all partners with moving preferences that need migration
    const partners = await Partner.find({
      $or: [
        { 'preferences.moving.serviceArea': { $exists: true } },
        { 'preferences.moving.countries': { $exists: true } },
        { 'preferences.moving.citySettings': { $exists: true } }
      ]
    });

    console.log(`Found ${partners.length} partners to migrate`);

    let updatedCount = 0;

    for (const partner of partners) {
      let hasChanges = false;
      const movingPrefs = partner.preferences.moving || {};

      // Check if we need to migrate from old structure
      if (movingPrefs.serviceArea || movingPrefs.countries || movingPrefs.citySettings) {
        console.log(`\nMigrating partner: ${partner.partnerId || partner._id}`);

        let sourceServiceArea = null;
        let sourceCountries = [];
        let sourceCitySettings = {};

        // Get source data from various possible structures
        if (movingPrefs.serviceArea) {
          // From new single serviceArea structure
          sourceServiceArea = movingPrefs.serviceArea instanceof Map ?
            Object.fromEntries(movingPrefs.serviceArea) : movingPrefs.serviceArea;
        } else if (movingPrefs.countries || movingPrefs.citySettings) {
          // From old countries/citySettings structure
          sourceCountries = movingPrefs.countries || [];
          sourceCitySettings = movingPrefs.citySettings instanceof Map ?
            Object.fromEntries(movingPrefs.citySettings) : (movingPrefs.citySettings || {});

          // Convert to serviceArea format
          sourceServiceArea = {};
          for (const countryCode of sourceCountries) {
            const countryCities = {};
            let hasCountryCities = false;

            Object.entries(sourceCitySettings).forEach(([cityKey, setting]) => {
              if (cityKey.startsWith(`${countryCode}-`)) {
                const cityName = cityKey.split('-')[1];
                countryCities[cityName] = {
                  radius: setting.radius || 0
                };
                hasCountryCities = true;
              }
            });

            if (hasCountryCities) {
              sourceServiceArea[countryCode] = {
                type: 'cities',
                cities: countryCities
              };
            } else {
              sourceServiceArea[countryCode] = {
                type: 'country',
                cities: {}
              };
            }
          }
        }

        if (sourceServiceArea && Object.keys(sourceServiceArea).length > 0) {
          // For backward compatibility, use the same service area for both pickup and destination
          // Partners can later configure them separately through the UI
          const updateQuery = {
            $set: {
              'preferences.moving.pickup.serviceArea': sourceServiceArea,
              'preferences.moving.destination.serviceArea': sourceServiceArea
            },
            $unset: {}
          };

          // Remove old fields if they exist
          if (movingPrefs.serviceArea) {
            updateQuery.$unset['preferences.moving.serviceArea'] = 1;
          }
          if (movingPrefs.countries) {
            updateQuery.$unset['preferences.moving.countries'] = 1;
          }
          if (movingPrefs.citySettings) {
            updateQuery.$unset['preferences.moving.citySettings'] = 1;
          }

          await Partner.updateOne({ _id: partner._id }, updateQuery);

          updatedCount++;
          hasChanges = true;
          console.log(`  ✓ Updated partner ${partner.partnerId || partner._id}`);
          console.log(`  - Set same service area for both pickup and destination`);
          console.log(`  - Countries: ${Object.keys(sourceServiceArea).join(', ')}`);
        }
      }

      // Also ensure cleaning preferences structure is correct
      if (partner.preferences && !partner.preferences.cleaning) {
        await Partner.updateOne(
          { _id: partner._id },
          {
            $set: {
              'preferences.cleaning': {
                cities: [],
                countries: [],
                radius: 50
              }
            }
          }
        );
        console.log(`  ✓ Added default cleaning preferences for ${partner.partnerId || partner._id}`);
        hasChanges = true;
      }
    }

    console.log(`\nMigration completed. Updated ${updatedCount} partners.`);

    // Verify the migration
    const verifyPartners = await Partner.find({
      'preferences.moving.pickup.serviceArea': { $exists: true },
      'preferences.moving.destination.serviceArea': { $exists: true }
    }).limit(3);

    console.log('\nVerification: Checking updated structure...');
    for (const partner of verifyPartners) {
      const pickupArea = partner.preferences.moving.pickup.serviceArea;
      const destArea = partner.preferences.moving.destination.serviceArea;

      const pickupAreaObj = pickupArea instanceof Map ? Object.fromEntries(pickupArea) : pickupArea;
      const destAreaObj = destArea instanceof Map ? Object.fromEntries(destArea) : destArea;

      console.log(`\nPartner ${partner.partnerId}:`);
      console.log(`  Pickup countries: ${Object.keys(pickupAreaObj || {}).join(', ')}`);
      console.log(`  Destination countries: ${Object.keys(destAreaObj || {}).join(', ')}`);

      // Show sample country config
      const firstPickupCountry = Object.keys(pickupAreaObj || {})[0];
      if (firstPickupCountry) {
        const config = pickupAreaObj[firstPickupCountry];
        console.log(`    ${firstPickupCountry}: type=${config.type}, cities=${Object.keys(config.cities || {}).length}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  updatePartnerPickupDestinationStructure()
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

module.exports = updatePartnerPickupDestinationStructure;