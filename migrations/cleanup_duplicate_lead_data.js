const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function cleanupDuplicateLeadData() {
  try {
    console.log('Starting lead data cleanup migration...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    }
    
    // Find all leads that have duplicate location data
    const leads = await Lead.find({
      $or: [
        { pickupLocation: { $exists: true } },
        { destinationLocation: { $exists: true } },
        { overallStatus: { $exists: true } }
      ]
    });
    
    console.log(`Found ${leads.length} leads with duplicate data to cleanup`);
    
    let updatedCount = 0;
    
    for (const lead of leads) {
      let hasChanges = false;
      const updateFields = {};
      const unsetFields = {};
      
      // Check if pickup/destination locations exist but are duplicated in formData
      if (lead.pickupLocation && lead.formData?.pickupAddress) {
        console.log(`Lead ${lead.leadId}: Removing duplicate pickupLocation (exists in formData)`);
        unsetFields.pickupLocation = 1;
        hasChanges = true;
      }
      
      if (lead.destinationLocation && lead.formData?.destinationAddress) {
        console.log(`Lead ${lead.leadId}: Removing duplicate destinationLocation (exists in formData)`);
        unsetFields.destinationLocation = 1;
        hasChanges = true;
      }
      
      // Remove overallStatus field (now virtual)
      if (lead.overallStatus !== undefined) {
        console.log(`Lead ${lead.leadId}: Removing overallStatus field (now virtual)`);
        unsetFields.overallStatus = 1;
        hasChanges = true;
      }
      
      // If formData doesn't have pickupAddress/destinationAddress but pickupLocation exists, 
      // copy to formData to preserve data
      if (lead.pickupLocation && !lead.formData?.pickupAddress) {
        console.log(`Lead ${lead.leadId}: Moving pickupLocation to formData.pickupAddress`);
        if (!updateFields.formData) {
          updateFields.formData = { ...lead.formData };
        }
        updateFields.formData.pickupAddress = {
          address: lead.pickupLocation.address,
          city: lead.pickupLocation.city,
          country: lead.pickupLocation.country,
          postalCode: lead.pickupLocation.postalCode,
          coordinates: lead.pickupLocation.coordinates
        };
        unsetFields.pickupLocation = 1;
        hasChanges = true;
      }
      
      if (lead.destinationLocation && !lead.formData?.destinationAddress) {
        console.log(`Lead ${lead.leadId}: Moving destinationLocation to formData.destinationAddress`);
        if (!updateFields.formData) {
          updateFields.formData = { ...lead.formData };
        }
        updateFields.formData.destinationAddress = {
          address: lead.destinationLocation.address,
          city: lead.destinationLocation.city,
          country: lead.destinationLocation.country,
          postalCode: lead.destinationLocation.postalCode,
          coordinates: lead.destinationLocation.coordinates
        };
        unsetFields.destinationLocation = 1;
        hasChanges = true;
      }
      
      // Apply changes
      if (hasChanges) {
        const updateQuery = {};
        
        if (Object.keys(updateFields).length > 0) {
          updateQuery.$set = updateFields;
        }
        
        if (Object.keys(unsetFields).length > 0) {
          updateQuery.$unset = unsetFields;
        }
        
        await Lead.updateOne(
          { _id: lead._id },
          updateQuery
        );
        
        updatedCount++;
        console.log(`✓ Updated lead ${lead.leadId}`);
      }
    }
    
    console.log(`\nMigration completed. Updated ${updatedCount} leads.`);
    
    // Verify the migration
    const remainingDuplicates = await Lead.find({
      $or: [
        { pickupLocation: { $exists: true } },
        { destinationLocation: { $exists: true } },
        { overallStatus: { $exists: true } }
      ]
    });
    
    console.log(`\nVerification: ${remainingDuplicates.length} leads still have duplicate fields`);
    
    if (remainingDuplicates.length > 0) {
      console.log('Remaining duplicate fields in leads:');
      for (const lead of remainingDuplicates.slice(0, 5)) {
        console.log(`Lead ${lead.leadId}:`);
        if (lead.pickupLocation) console.log('  - Has pickupLocation');
        if (lead.destinationLocation) console.log('  - Has destinationLocation');
        if (lead.overallStatus) console.log('  - Has overallStatus');
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
  cleanupDuplicateLeadData()
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

module.exports = cleanupDuplicateLeadData;