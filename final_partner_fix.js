const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Fix moving partners - ONLY moving preferences
    console.log('\n=== FIXING MOVING PARTNERS ===');
    const movingPartners = await mongoose.connection.db.collection('partners').find({ serviceType: 'moving' }).toArray();
    for (const partner of movingPartners) {
      const movingPrefs = partner.preferences?.moving;
      await mongoose.connection.db.collection('partners').updateOne(
        { _id: partner._id },
        {
          $set: {
            preferences: {
              moving: movingPrefs || {
                pickup: { serviceArea: {} },
                destination: { serviceArea: {} }
              }
            }
          }
        }
      );
      console.log('Fixed moving partner:', partner.partnerId);
    }

    // Fix cleaning partners - ONLY cleaning preferences
    console.log('\n=== FIXING CLEANING PARTNERS ===');
    const cleaningPartners = await mongoose.connection.db.collection('partners').find({ serviceType: 'cleaning' }).toArray();
    for (const partner of cleaningPartners) {
      const cleaningPrefs = partner.preferences?.cleaning;
      await mongoose.connection.db.collection('partners').updateOne(
        { _id: partner._id },
        {
          $set: {
            preferences: {
              cleaning: cleaningPrefs || {
                cities: [],
                countries: [],
                radius: 50
              }
            }
          }
        }
      );
      console.log('Fixed cleaning partner:', partner.partnerId);
    }

    console.log('\n✅ Final partner structure fix completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });