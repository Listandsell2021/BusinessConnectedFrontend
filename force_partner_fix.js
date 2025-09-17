const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Force fix moving partners - completely replace preferences
    console.log('\n=== FORCE FIXING MOVING PARTNERS ===');
    const movingResult = await mongoose.connection.db.collection('partners').updateMany(
      { serviceType: 'moving' },
      {
        $set: {
          'preferences': {
            'moving': {
              'pickup': {
                'serviceArea': {}
              },
              'destination': {
                'serviceArea': {}
              }
            }
          }
        }
      }
    );
    console.log('Force updated', movingResult.modifiedCount, 'moving partners');

    // Force fix cleaning partners - completely replace preferences
    console.log('\n=== FORCE FIXING CLEANING PARTNERS ===');
    const cleaningResult = await mongoose.connection.db.collection('partners').updateMany(
      { serviceType: 'cleaning' },
      {
        $set: {
          'preferences': {
            'cleaning': {
              'cities': [],
              'countries': [],
              'radius': 50
            }
          }
        }
      }
    );
    console.log('Force updated', cleaningResult.modifiedCount, 'cleaning partners');

    console.log('\n✅ Force partner structure fix completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });