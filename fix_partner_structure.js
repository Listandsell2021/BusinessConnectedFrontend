const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Fix moving partners - remove cleaning prefs and legacy fields
    console.log('\n=== FIXING MOVING PARTNERS ===');
    const movingUpdateResult = await mongoose.connection.db.collection('partners').updateMany(
      { serviceType: 'moving' },
      {
        $unset: {
          'preferences.cleaning': 1,
          'preferences.serviceAreas': 1,
          'preferences.radius': 1,
          'preferences.maxLeadsPerWeek': 1,
          'preferences.workingHours': 1
        }
      }
    );
    console.log('Updated', movingUpdateResult.modifiedCount, 'moving partners');

    // Fix cleaning partners - remove moving prefs and legacy fields
    console.log('\n=== FIXING CLEANING PARTNERS ===');
    const cleaningUpdateResult = await mongoose.connection.db.collection('partners').updateMany(
      { serviceType: 'cleaning' },
      {
        $unset: {
          'preferences.moving': 1,
          'preferences.serviceAreas': 1,
          'preferences.radius': 1,
          'preferences.maxLeadsPerWeek': 1,
          'preferences.workingHours': 1
        }
      }
    );
    console.log('Updated', cleaningUpdateResult.modifiedCount, 'cleaning partners');

    console.log('\n✅ Partner structure fix completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });