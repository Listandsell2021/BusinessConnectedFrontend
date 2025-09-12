const mongoose = require('mongoose');
const Partner = require('../models/Partner');

async function migrateServicePreferences() {
  try {
    console.log('Starting service preferences migration...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');

    // Find all partners
    const partners = await Partner.find({});
    console.log(`Found ${partners.length} partners to migrate`);

    for (const partner of partners) {
      let needsUpdate = false;
      
      // Ensure all services have preferences structure
      if (partner.services && partner.services.length > 0) {
        partner.services.forEach(service => {
          if (!service.preferences) {
            needsUpdate = true;
            service.preferences = {
              serviceAreas: [],
              radius: 50,
              maxLeadsPerWeek: 10,
              workingHours: {
                monday: { start: '08:00', end: '18:00', available: true },
                tuesday: { start: '08:00', end: '18:00', available: true },
                wednesday: { start: '08:00', end: '18:00', available: true },
                thursday: { start: '08:00', end: '18:00', available: true },
                friday: { start: '08:00', end: '18:00', available: true },
                saturday: { start: '08:00', end: '16:00', available: false },
                sunday: { start: '08:00', end: '16:00', available: false }
              }
            };

            // If partner has existing cities data, move it to service-specific areas
            if (partner.address?.city) {
              service.preferences.serviceAreas.push({
                city: partner.address.city,
                postalCodes: partner.address.postalCode ? [partner.address.postalCode] : []
              });
            }
          }
        });

        if (needsUpdate) {
          await Partner.findByIdAndUpdate(partner._id, {
            services: partner.services
          });
          console.log(`Updated partner ${partner.companyName} (ID: ${partner._id})`);
        }
      }
    }

    console.log('Service preferences migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateServicePreferences()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateServicePreferences;