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

    const lead = await Lead.findOne({
      'partnerAssignments.partner': partner._id
    }).lean();

    if (lead && lead.partnerAssignments && lead.partnerAssignments.length > 0) {
      const assignment = lead.partnerAssignments[0];
      console.log('Assignment Date:', assignment.assignedAt);
      console.log('Assignment Date formatted:', assignment.assignedAt.toISOString().split('T')[0]);

      // Test with assignment date filter
      const assignmentDateFilter = {
        'partnerAssignments.partner': partner._id,
        serviceType: 'moving',
        'partnerAssignments.assignedAt': {
          $gte: new Date('2025-09-13'),
          $lte: new Date('2025-09-20T23:59:59.999Z')
        }
      };

      const count = await Lead.countDocuments(assignmentDateFilter);
      console.log('Count with assignment date filter:', count);

      console.log('\nIs assignment date in range?',
        assignment.assignedAt >= new Date('2025-09-13') &&
        assignment.assignedAt <= new Date('2025-09-20T23:59:59.999Z')
      );
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err);
    process.exit(1);
  });