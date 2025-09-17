const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Direct MongoDB query without using the model
    const movingPartners = await mongoose.connection.db.collection('partners').find({ serviceType: 'moving' }).limit(1).toArray();
    console.log('\n=== DIRECT MOVING PARTNER CHECK ===');
    console.log('Partner:', movingPartners[0].partnerId);
    console.log('ServiceType:', movingPartners[0].serviceType);
    console.log('Preferences:', JSON.stringify(movingPartners[0].preferences, null, 2));

    const cleaningPartners = await mongoose.connection.db.collection('partners').find({ serviceType: 'cleaning' }).limit(1).toArray();
    console.log('\n=== DIRECT CLEANING PARTNER CHECK ===');
    console.log('Partner:', cleaningPartners[0].partnerId);
    console.log('ServiceType:', cleaningPartners[0].serviceType);
    console.log('Preferences:', JSON.stringify(cleaningPartners[0].preferences, null, 2));

    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });