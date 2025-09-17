const mongoose = require('mongoose');
require('dotenv').config();

const directCleanup = async () => {
  try {
    console.log('🧹 Direct MongoDB cleanup of cleaning service preferences...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Use direct MongoDB operations
    const db = mongoose.connection.db;
    const partnersCollection = db.collection('partners');

    // Find all cleaning partners
    const cleaningPartners = await partnersCollection.find({
      serviceType: 'cleaning'
    }).toArray();

    console.log(`📊 Found ${cleaningPartners.length} cleaning partners to cleanup`);

    for (const partner of cleaningPartners) {
      console.log(`\n🔄 Processing partner: ${partner.companyName} (${partner.partnerId})`);

      const cleaningPrefs = partner.preferences?.cleaning;
      if (!cleaningPrefs) continue;

      console.log(`  📋 Current cleaning preferences:`, Object.keys(cleaningPrefs));

      // Check what fields exist
      const hasLegacyFields =
        cleaningPrefs.hasOwnProperty('cities') ||
        cleaningPrefs.hasOwnProperty('citySettings') ||
        cleaningPrefs.hasOwnProperty('radius');

      if (hasLegacyFields) {
        console.log(`  🗑️  Removing legacy fields directly with $unset...`);

        // Use direct MongoDB update with $unset
        const result = await partnersCollection.updateOne(
          { _id: partner._id },
          {
            $unset: {
              'preferences.cleaning.cities': '',
              'preferences.cleaning.citySettings': '',
              'preferences.cleaning.radius': ''
            }
          }
        );

        console.log(`  ✅ Update result:`, result.modifiedCount > 0 ? 'SUCCESS' : 'NO_CHANGES');

        // Verify the update
        const updatedPartner = await partnersCollection.findOne(
          { _id: partner._id },
          { projection: { 'preferences.cleaning': 1 } }
        );

        console.log(`  📋 Final keys:`, Object.keys(updatedPartner.preferences.cleaning));
      } else {
        console.log(`  ✅ No legacy fields found`);
      }
    }

  } catch (error) {
    console.error('❌ Direct cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run direct cleanup
if (require.main === module) {
  directCleanup();
}

module.exports = { directCleanup };