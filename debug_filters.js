const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const Partner = require('./models/Partner');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Find the active abc company partner
    const partner = await Partner.findOne({
      companyName: 'abc company',
      status: 'active'
    }).lean();

    if (!partner) {
      console.log('Active abc company partner not found');
      process.exit(0);
    }

    console.log('Active Partner ID:', partner._id.toString());

    // Get the lead details
    const lead = await Lead.findOne({
      'partnerAssignments.partner': partner._id
    }).lean();

    if (lead) {
      console.log('\nLead Details:');
      console.log('- Lead ID:', lead.leadId);
      console.log('- Service Type:', lead.serviceType);
      console.log('- Created At:', lead.createdAt);
      console.log('- Date formatted:', lead.createdAt.toISOString().split('T')[0]);

      // Test filters one by one
      console.log('\nTesting filters:');

      // 1. Base filter
      const baseFilter = { 'partnerAssignments.partner': partner._id };
      const baseCount = await Lead.countDocuments(baseFilter);
      console.log('1. Base filter count:', baseCount);

      // 2. Add service filter
      const serviceFilter = { ...baseFilter, serviceType: 'moving' };
      const serviceCount = await Lead.countDocuments(serviceFilter);
      console.log('2. With service filter count:', serviceCount);

      // 3. Add date filter
      const dateFilter = {
        ...serviceFilter,
        createdAt: {
          $gte: new Date('2025-09-13'),
          $lte: new Date('2025-09-20T23:59:59.999Z')
        }
      };
      const dateCount = await Lead.countDocuments(dateFilter);
      console.log('3. With date filter count:', dateCount);

      console.log('\nDate comparison:');
      console.log('Lead date:', lead.createdAt);
      console.log('Filter start:', new Date('2025-09-13'));
      console.log('Filter end:', new Date('2025-09-20T23:59:59.999Z'));
      console.log('Is in range?', lead.createdAt >= new Date('2025-09-13') && lead.createdAt <= new Date('2025-09-20T23:59:59.999Z'));
    } else {
      console.log('No lead found for this partner');
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err);
    process.exit(1);
  });