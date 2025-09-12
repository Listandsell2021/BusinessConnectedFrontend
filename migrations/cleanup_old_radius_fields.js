const mongoose = require('mongoose');
const Partner = require('../models/Partner');

async function cleanupOldRadiusFields() {
  try {
    console.log('Starting cleanup of old radius fields...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    }
    
    // Find all partners with city settings
    const partners = await Partner.find({
      'preferences.moving.citySettings': { $exists: true, $ne: {} }
    });
    
    console.log(`Found ${partners.length} partners with city settings to clean up`);
    
    let updatedCount = 0;
    
    for (const partner of partners) {
      let hasChanges = false;
      const citySettings = partner.preferences.moving.citySettings;
      
      // Convert Map to Object for easier manipulation
      const citySettingsObj = citySettings instanceof Map ? Object.fromEntries(citySettings) : citySettings;
      const cleanCitySettings = {};
      
      for (const [cityKey, setting] of Object.entries(citySettingsObj)) {
        if (setting && (setting.radiusFrom !== undefined || setting.radiusTo !== undefined)) {
          // Clean up: keep only radius and country, remove old fields
          cleanCitySettings[cityKey] = {
            radius: setting.radius !== undefined ? setting.radius : 0,
            country: setting.country
          };
          
          hasChanges = true;
          console.log(`  Cleaning ${cityKey}: removed radiusFrom=${setting.radiusFrom}, radiusTo=${setting.radiusTo}, kept radius=${cleanCitySettings[cityKey].radius}`);
        } else {
          // Already clean, keep as is
          cleanCitySettings[cityKey] = setting;
        }
      }
      
      if (hasChanges) {
        // Update the partner with clean structure
        await Partner.updateOne(
          { _id: partner._id },
          {
            $set: {
              'preferences.moving.citySettings': cleanCitySettings
            }
          }
        );
        
        updatedCount++;
        console.log(`  Updated partner ${partner.partnerId || partner._id}`);
      }
    }
    
    console.log(`Cleanup completed. Updated ${updatedCount} partners.`);
    
    // Verify the cleanup
    const verifyPartners = await Partner.find({
      'preferences.moving.citySettings': { $exists: true, $ne: {} }
    });
    
    console.log('Verification: Checking cleaned structure...');
    for (const partner of verifyPartners) {
      const citySettings = partner.preferences.moving.citySettings;
      const citySettingsObj = citySettings instanceof Map ? Object.fromEntries(citySettings) : citySettings;
      
      console.log(`\\nPartner ${partner.partnerId}:`);
      for (const [cityKey, setting] of Object.entries(citySettingsObj)) {
        if (setting.radiusFrom !== undefined || setting.radiusTo !== undefined) {
          console.log(`❌ ERROR: ${cityKey} still has old fields:`, setting);
        } else {
          console.log(`✅ ${cityKey}: radius=${setting.radius}, country=${setting.country || 'undefined'}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Cleanup failed:', error);
    return false;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupOldRadiusFields()
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

module.exports = cleanupOldRadiusFields;