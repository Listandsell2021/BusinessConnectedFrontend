const mongoose = require('mongoose');
const Partner = require('./models/Partner');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Check moving type partners
    const movingPartners = await Partner.find({ serviceType: 'moving' }).limit(2);
    console.log('\n=== MOVING PARTNERS ===');
    movingPartners.forEach(p => {
      console.log('Partner:', p.partnerId, '(' + p.serviceType + ')');
      console.log('Has moving preferences:', !!p.preferences?.moving);
      console.log('Has cleaning preferences:', !!p.preferences?.cleaning);
      console.log('Moving pickup:', !!p.preferences?.moving?.pickup?.serviceArea);
      console.log('Moving destination:', !!p.preferences?.moving?.destination?.serviceArea);
      console.log('---');
    });

    // Check cleaning type partners
    const cleaningPartners = await Partner.find({ serviceType: 'cleaning' }).limit(2);
    console.log('\n=== CLEANING PARTNERS ===');
    cleaningPartners.forEach(p => {
      console.log('Partner:', p.partnerId, '(' + p.serviceType + ')');
      console.log('Has moving preferences:', !!p.preferences?.moving);
      console.log('Has cleaning preferences:', !!p.preferences?.cleaning);
      if (p.preferences?.cleaning) {
        console.log('Cleaning cities count:', p.preferences.cleaning.cities?.length || 0);
        console.log('Cleaning countries count:', p.preferences.cleaning.countries?.length || 0);
        console.log('Cleaning radius:', p.preferences.cleaning.radius);
      }
      console.log('---');
    });

    console.log('\n✅ Structure verification completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });