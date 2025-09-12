const mongoose = require('mongoose');
const Partner = require('../models/Partner');

async function updatePartnerRadiusStructure() {
  try {
    console.log('Starting partner radius structure migration...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    }
    
    // Find all partners with moving preferences
    const partners = await Partner.find({
      'preferences.moving.citySettings': { $exists: true, $ne: {} }
    });
    
    console.log(`Found ${partners.length} partners with city settings to migrate`);
    
    let updatedCount = 0;
    
    for (const partner of partners) {
      let hasChanges = false;
      const citySettings = partner.preferences.moving.citySettings;
      
      // Convert Map to Object for easier manipulation
      const citySettingsObj = citySettings instanceof Map ? Object.fromEntries(citySettings) : citySettings;
      const newCitySettings = {};
      
      for (const [cityKey, setting] of Object.entries(citySettingsObj)) {
        if (setting && (setting.radiusFrom !== undefined || setting.radiusTo !== undefined)) {
          // Convert old structure to new structure
          // Use radiusFrom as the primary radius, or radiusTo if radiusFrom doesn't exist
          const radius = setting.radiusFrom !== undefined ? setting.radiusFrom : setting.radiusTo;
          
          newCitySettings[cityKey] = {
            radius: radius || 0,
            country: setting.country
          };
          
          hasChanges = true;
          console.log(`  Migrating ${cityKey}: radiusFrom=${setting.radiusFrom}, radiusTo=${setting.radiusTo} -> radius=${radius}`);
        } else if (setting && setting.radius !== undefined) {
          // Already in new format, keep as is
          newCitySettings[cityKey] = setting;
        } else {
          // Unknown format, set default
          newCitySettings[cityKey] = {
            radius: 0,
            country: setting?.country || 'DE'
          };
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        // Update the partner with new structure
        await Partner.updateOne(
          { _id: partner._id },
          {
            $set: {
              'preferences.moving.citySettings': newCitySettings
            }
          }
        );
        
        updatedCount++;
        console.log(`  Updated partner ${partner.partnerId || partner._id}`);
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} partners.`);
    
    // Verify the migration
    const verifyPartners = await Partner.find({
      'preferences.moving.citySettings': { $exists: true, $ne: {} }
    });
    
    console.log('Verification: Checking updated structure...');
    for (const partner of verifyPartners.slice(0, 3)) { // Check first 3 partners
      const citySettings = partner.preferences.moving.citySettings;
      const citySettingsObj = citySettings instanceof Map ? Object.fromEntries(citySettings) : citySettings;
      
      for (const [cityKey, setting] of Object.entries(citySettingsObj)) {
        if (setting.radiusFrom !== undefined || setting.radiusTo !== undefined) {
          console.log(`WARNING: Partner ${partner.partnerId} still has old structure for ${cityKey}`);
        } else {
          console.log(`✓ Partner ${partner.partnerId} - ${cityKey}: radius=${setting.radius}`);
        }
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
  updatePartnerRadiusStructure()
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

module.exports = updatePartnerRadiusStructure;