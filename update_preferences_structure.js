const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Update moving partners - move pickup/destination out of moving object
    console.log('\n=== UPDATING MOVING PARTNERS STRUCTURE ===');
    const movingPartners = await mongoose.connection.db.collection('partners').find({ serviceType: 'moving' }).toArray();

    for (const partner of movingPartners) {
      const movingPrefs = partner.preferences?.moving;
      if (movingPrefs) {
        const newPreferences = {
          pickup: movingPrefs.pickup || { serviceArea: {} },
          destination: movingPrefs.destination || { serviceArea: {} }
        };

        await mongoose.connection.db.collection('partners').updateOne(
          { _id: partner._id },
          { $set: { preferences: newPreferences } }
        );
        console.log('Updated moving partner:', partner.partnerId);
      }
    }

    // Cleaning partners are already correct, just ensure they don't have pickup/destination
    console.log('\n=== ENSURING CLEANING PARTNERS STRUCTURE ===');
    const cleaningPartners = await mongoose.connection.db.collection('partners').find({ serviceType: 'cleaning' }).toArray();

    for (const partner of cleaningPartners) {
      const cleaningPrefs = partner.preferences?.cleaning;
      if (cleaningPrefs) {
        const newPreferences = {
          cleaning: cleaningPrefs
        };

        await mongoose.connection.db.collection('partners').updateOne(
          { _id: partner._id },
          { $set: { preferences: newPreferences } }
        );
        console.log('Ensured cleaning partner structure:', partner.partnerId);
      }
    }

    console.log('\n✅ Preferences structure update completed!');

    // Verify the new structure
    console.log('\n=== VERIFICATION ===');
    const verifyMoving = await mongoose.connection.db.collection('partners').findOne({ serviceType: 'moving' });
    const verifyCleaning = await mongoose.connection.db.collection('partners').findOne({ serviceType: 'cleaning' });

    console.log('\nMoving partner preferences:', JSON.stringify(verifyMoving.preferences, null, 2));
    console.log('\nCleaning partner preferences:', JSON.stringify(verifyCleaning.preferences, null, 2));

    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });