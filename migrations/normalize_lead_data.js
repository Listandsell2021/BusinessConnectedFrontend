const mongoose = require('mongoose');
const Lead = require('../models/Lead');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/leadform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Migration script to normalize lead data values
async function normalizeLeadData() {
  console.log('Starting lead data normalization...');
  
  try {
    // Get all leads
    const leads = await Lead.find({});
    console.log(`Found ${leads.length} leads to process`);
    
    let updated = 0;
    
    for (const lead of leads) {
      let hasChanges = false;
      const formData = lead.formData || {};
      
      // Normalize property types
      ['propertyType', 'currentPropertyType', 'futurePropertyType'].forEach(field => {
        if (formData[field]) {
          const originalValue = formData[field];
          let normalizedValue = originalValue;
          
          // Map common variations to standard values
          const propertyTypeMap = {
            'own_home': 'own_home',
            'ownhome': 'own_home',
            'own home': 'own_home',
            'rental_apartment': 'rental_apartment',
            'rentalapartment': 'rental_apartment',
            'rental apartment': 'rental_apartment',
            'own_house': 'own_house',
            'ownhouse': 'own_house',
            'own house': 'own_house',
            'own_apartment': 'own_apartment',
            'ownapartment': 'own_apartment',
            'own apartment': 'own_apartment'
          };
          
          if (propertyTypeMap[originalValue.toLowerCase()]) {
            normalizedValue = propertyTypeMap[originalValue.toLowerCase()];
          }
          
          if (originalValue !== normalizedValue) {
            formData[field] = normalizedValue;
            hasChanges = true;
            console.log(`Lead ${lead.leadId}: Normalized ${field} from "${originalValue}" to "${normalizedValue}"`);
          }
        }
      });
      
      // Normalize time preferences
      ['preferredContactTime', 'timeFlexibility'].forEach(field => {
        if (formData[field]) {
          const originalValue = formData[field];
          let normalizedValue = originalValue;
          
          // Map common variations to standard values
          const timePreferenceMap = {
            'morning_preferred': 'morning_preferred',
            'morningpreferred': 'morning_preferred',
            'morning preferred': 'morning_preferred',
            'afternoon_preferred': 'afternoon_preferred',
            'afternoonpreferred': 'afternoon_preferred',
            'afternoon preferred': 'afternoon_preferred',
            'evening_preferred': 'evening_preferred',
            'eveningpreferred': 'evening_preferred',
            'evening preferred': 'evening_preferred'
          };
          
          if (timePreferenceMap[originalValue.toLowerCase()]) {
            normalizedValue = timePreferenceMap[originalValue.toLowerCase()];
          }
          
          if (originalValue !== normalizedValue) {
            formData[field] = normalizedValue;
            hasChanges = true;
            console.log(`Lead ${lead.leadId}: Normalized ${field} from "${originalValue}" to "${normalizedValue}"`);
          }
        }
      });
      
      // Normalize boolean values
      ['elevatorAvailable', 'elevator'].forEach(field => {
        if (formData[field] !== undefined) {
          const originalValue = formData[field];
          let normalizedValue = originalValue;
          
          // Normalize to proper boolean or string values
          if (typeof originalValue === 'string') {
            if (originalValue.toLowerCase() === 'yes' || originalValue.toLowerCase() === 'ja' || originalValue === '1' || originalValue === 'true') {
              normalizedValue = true;
            } else if (originalValue.toLowerCase() === 'no' || originalValue.toLowerCase() === 'nein' || originalValue === '0' || originalValue === 'false') {
              normalizedValue = false;
            }
          }
          
          if (originalValue !== normalizedValue) {
            formData[field] = normalizedValue;
            hasChanges = true;
            console.log(`Lead ${lead.leadId}: Normalized ${field} from "${originalValue}" to "${normalizedValue}"`);
          }
        }
      });
      
      // Save changes if any
      if (hasChanges) {
        lead.formData = formData;
        await lead.save();
        updated++;
      }
    }
    
    console.log(`Migration completed. Updated ${updated} leads.`);
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Update lead IDs for existing leads to new format
async function updateLeadIds() {
  console.log('Starting lead ID update...');
  
  try {
    // Find leads with old ID format (short IDs like MOV7334)
    const leadsWithOldIds = await Lead.find({
      leadId: /^(MOV|CLN|CAN)[A-Z0-9]{4,6}$/
    });
    
    console.log(`Found ${leadsWithOldIds.length} leads with old ID format`);
    
    for (const lead of leadsWithOldIds) {
      const oldId = lead.leadId;
      
      // Generate new ID format based on creation date
      const createdAt = lead.createdAt || new Date();
      const year = createdAt.getFullYear().toString().slice(-2);
      const month = String(createdAt.getMonth() + 1).padStart(2, '0');
      const day = String(createdAt.getDate()).padStart(2, '0');
      const timestamp = year + month + day;
      
      const servicePrefix = lead.serviceType === 'moving' ? 'MOV' : 
                          lead.serviceType === 'cleaning' ? 'CLN' : 'CAN';
      
      // Keep a unique part from old ID or generate new one
      const uniquePart = oldId.replace(/^(MOV|CLN|CAN)/, '').slice(0, 4) || 
                        Math.random().toString(36).substr(2, 4).toUpperCase();
      
      const newId = `${servicePrefix}-${timestamp}-${uniquePart}`;
      
      // Make sure the new ID is unique
      const existingLead = await Lead.findOne({ leadId: newId });
      if (!existingLead) {
        lead.leadId = newId;
        await lead.save();
        console.log(`Updated lead ID from "${oldId}" to "${newId}"`);
      } else {
        console.log(`Skipped lead "${oldId}" - new ID "${newId}" already exists`);
      }
    }
    
    console.log('Lead ID update completed.');
    
  } catch (error) {
    console.error('Lead ID update error:', error);
  }
}

// Main migration function
async function runMigration() {
  await connectDB();
  
  console.log('=== Starting Lead Data Migration ===');
  
  // Run data normalization
  await normalizeLeadData();
  
  // Update lead IDs
  await updateLeadIds();
  
  console.log('=== Migration Completed ===');
  
  // Close connection
  await mongoose.connection.close();
  process.exit(0);
}

// Run migration if script is called directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { normalizeLeadData, updateLeadIds };