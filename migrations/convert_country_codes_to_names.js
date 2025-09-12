const mongoose = require('mongoose');
const Partner = require('../models/Partner');

// Country code to name mapping
const countryMapping = {
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

async function convertCountryCodesToNames() {
  try {
    console.log('Starting conversion from country codes to names...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    }
    
    // Find all partners with serviceArea data
    const partners = await Partner.find({
      'preferences.moving.serviceArea': { $exists: true }
    });
    
    console.log(`Found ${partners.length} partners with serviceArea data`);
    
    let updatedCount = 0;
    
    for (const partner of partners) {
      let hasChanges = false;
      const serviceArea = partner.preferences.moving.serviceArea;
      const serviceAreaObj = serviceArea instanceof Map ? Object.fromEntries(serviceArea) : serviceArea;
      
      console.log(`\nProcessing partner: ${partner.partnerId || partner._id}`);
      
      const newServiceArea = {};
      
      // Convert each country key from code to name
      Object.entries(serviceAreaObj).forEach(([countryKey, config]) => {
        let newCountryKey = countryKey;
        
        // Check if this looks like a country code (2 letters, uppercase)
        if (countryKey.length === 2 && countryKey === countryKey.toUpperCase()) {
          if (countryMapping[countryKey]) {
            newCountryKey = countryMapping[countryKey];
            hasChanges = true;
            console.log(`  Converting ${countryKey} -> ${newCountryKey}`);
          } else {
            console.log(`  Warning: Unknown country code ${countryKey}`);
          }
        } else {
          console.log(`  Keeping ${countryKey} (already appears to be a name)`);
        }
        
        newServiceArea[newCountryKey] = config;
      });
      
      // Update the partner if changes were made
      if (hasChanges) {
        await Partner.updateOne(
          { _id: partner._id },
          {
            $set: {
              'preferences.moving.serviceArea': newServiceArea
            }
          }
        );
        
        updatedCount++;
        console.log(`  ✓ Updated partner ${partner.partnerId || partner._id}`);
      } else {
        console.log(`  → No changes needed for partner ${partner.partnerId || partner._id}`);
      }
    }
    
    console.log(`\nConversion completed. Updated ${updatedCount} partners.`);
    
    // Verify the conversion
    const verifyPartners = await Partner.find({
      'preferences.moving.serviceArea': { $exists: true }
    }).limit(3);
    
    console.log('\nVerification: Checking converted structure...');
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
    console.error('Conversion failed:', error);
    return false;
  }
}

// Run conversion if called directly
if (require.main === module) {
  convertCountryCodesToNames()
    .then((success) => {
      if (success) {
        console.log('Conversion completed successfully');
        process.exit(0);
      } else {
        console.log('Conversion failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Conversion error:', error);
      process.exit(1);
    });
}

module.exports = convertCountryCodesToNames;