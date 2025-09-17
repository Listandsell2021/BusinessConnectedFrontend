const mongoose = require('mongoose');
const Partner = require('./models/Partner');
const Lead = require('./models/Lead');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Get a sample lead to test with
    const testLead = await Lead.findOne({ serviceType: 'moving' });
    if (!testLead) {
      console.log('No moving leads found to test with');
      process.exit(0);
    }

    console.log('Testing with lead:', testLead.leadId);

    // Get partners using the updated query
    const partners = await Partner.find({
      status: 'active',
      serviceType: testLead.serviceType
    }).lean();

    console.log('Found partners:');
    partners.forEach(p => {
      const hasPickupArea = !!(p.preferences?.pickup?.serviceArea && Object.keys(p.preferences.pickup.serviceArea).length > 0);
      const hasDestinationArea = !!(p.preferences?.destination?.serviceArea && Object.keys(p.preferences.destination.serviceArea).length > 0);
      console.log(' -', p.partnerId, '|', p.companyName, '| Has Pickup Areas:', hasPickupArea, '| Has Destination Areas:', hasDestinationArea);
    });

    // Test the specific partner we're interested in
    const targetPartner = await Partner.findOne({ partnerId: 'PTRBASMOV74J' });
    if (targetPartner) {
      console.log('\nTarget Partner Details:');
      console.log('Partner ID:', targetPartner.partnerId);
      console.log('Status:', targetPartner.status);
      console.log('Service Type:', targetPartner.serviceType);
      console.log('Partner Type:', targetPartner.partnerType);
      console.log('Pickup Service Area:', JSON.stringify(targetPartner.preferences?.pickup?.serviceArea || {}, null, 2));
      console.log('Destination Service Area:', JSON.stringify(targetPartner.preferences?.destination?.serviceArea || {}, null, 2));

      // Test location matching logic
      const hasAnyServiceArea = !!(
        (targetPartner.preferences?.pickup?.serviceArea && Object.keys(targetPartner.preferences.pickup.serviceArea).length > 0) ||
        (targetPartner.preferences?.destination?.serviceArea && Object.keys(targetPartner.preferences.destination.serviceArea).length > 0)
      );

      console.log('Has any service area configured:', hasAnyServiceArea);
      console.log('Should match any location (no service areas):', !hasAnyServiceArea);
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });