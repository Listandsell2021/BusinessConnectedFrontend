const mongoose = require('mongoose');
const Partner = require('./models/Partner');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Get one moving partner and show complete preferences structure
    const movingPartner = await Partner.findOne({ serviceType: 'moving' });
    console.log('\n=== MOVING PARTNER FULL STRUCTURE ===');
    console.log('Partner:', movingPartner.partnerId);
    console.log('ServiceType:', movingPartner.serviceType);
    console.log('Preferences:', JSON.stringify(movingPartner.preferences, null, 2));

    // Get one cleaning partner and show complete preferences structure
    const cleaningPartner = await Partner.findOne({ serviceType: 'cleaning' });
    console.log('\n=== CLEANING PARTNER FULL STRUCTURE ===');
    console.log('Partner:', cleaningPartner.partnerId);
    console.log('ServiceType:', cleaningPartner.serviceType);
    console.log('Preferences:', JSON.stringify(cleaningPartner.preferences, null, 2));

    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });