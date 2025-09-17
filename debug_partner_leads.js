const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const Partner = require('./models/Partner');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Find all abc company partners
    const partners = await Partner.find({ companyName: 'abc company' }).lean();
    console.log('Found', partners.length, 'partners named "abc company":');
    partners.forEach(p => {
      console.log('- ID:', p._id.toString(), 'Status:', p.status);
    });

    if (partners.length === 0) {
      console.log('No partners found');
      process.exit(0);
    }

    const partner = partners[0]; // Use first one
    console.log('Using partner ID:', partner._id.toString());

    // Check lead MOV-8879
    const lead = await Lead.findOne({ leadId: 'MOV-8879' }).lean();
    if (lead) {
      console.log('Lead MOV-8879 partnerAssignments:', JSON.stringify(lead.partnerAssignments, null, 2));

      // Check what partner the lead is actually assigned to
      if (lead.partnerAssignments && lead.partnerAssignments.length > 0) {
        const assignedPartnerId = lead.partnerAssignments[0].partner;
        const assignedPartner = await Partner.findById(assignedPartnerId).lean();
        console.log('Actually assigned to partner:', assignedPartner ? assignedPartner.companyName : 'Not found');
      }
    } else {
      console.log('Lead MOV-8879 not found');
    }

    // Test the query for both partners
    for (const p of partners) {
      const leads = await Lead.find({
        'partnerAssignments.partner': p._id
      }).lean();

      console.log(`\nPartner ${p._id.toString()} (${p.status}): Found ${leads.length} leads`);
      leads.forEach(lead => {
        console.log('- Lead:', lead.leadId, 'partnerAssignments count:', lead.partnerAssignments ? lead.partnerAssignments.length : 0);
      });
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err);
    process.exit(1);
  });