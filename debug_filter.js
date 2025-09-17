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

    // Test basic filter (same as baseFilter for stats)
    const basicFilter = { 'partnerAssignments.partner': partner._id };
    const basicCount = await Lead.countDocuments(basicFilter);
    console.log('Basic count (stats):', basicCount);

    // Test the main query filter with default parameters (no additional filters)
    const mainFilter = { 'partnerAssignments.partner': partner._id };

    console.log('Main filter:', JSON.stringify(mainFilter, null, 2));

    const mainLeads = await Lead.find(mainFilter).lean();
    console.log('Main query results:', mainLeads.length);

    if (mainLeads.length > 0) {
      console.log('First lead structure:', Object.keys(mainLeads[0]));
    }

    // Test with populate
    const populatedLeads = await Lead.find(mainFilter)
      .populate('partnerAssignments.partner', 'companyName contactPerson')
      .lean();
    console.log('Populated query results:', populatedLeads.length);

    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err);
    process.exit(1);
  });