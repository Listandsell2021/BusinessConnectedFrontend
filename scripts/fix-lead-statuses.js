// Script to fix existing lead statuses based on partner assignments
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Partner = require('../models/Partner');
const Settings = require('../models/Settings');

// Import the calculateAdminStatus function
const calculateAdminStatus = async (lead, settings = null) => {
  if (!settings) {
    settings = await Settings.getSettings();
  }

  if (!lead.partnerAssignments || lead.partnerAssignments.length === 0) {
    return 'pending';
  }

  const activeAssignments = lead.partnerAssignments.filter(a => !['rejected', 'cancelled'].includes(a.status || 'pending'));
  const acceptedCount = activeAssignments.filter(a => a.status === 'accepted').length;
  const pendingCount = activeAssignments.filter(a => a.status === 'pending').length;
  const cancelRequestedCount = activeAssignments.filter(a => a.cancellationRequested).length;

  // Check if lead date has passed
  const isDatePassed = lead.formData?.fixedDate ? new Date(lead.formData.fixedDate) < new Date() : false;

  // If date passed and no one accepted
  if (isDatePassed && acceptedCount === 0 && cancelRequestedCount === 0) {
    return 'pending';
  }

  // If at least one partner accepted (even with cancel requests)
  if (acceptedCount > 0 || cancelRequestedCount > 0) {
    return 'assigned';
  }

  // Check assignment completion based on partner types
  const hasExclusivePartner = activeAssignments.some(a =>
    (a.partner && a.partner.partnerType === 'exclusive')
  );

  if (hasExclusivePartner) {
    return 'assigned';
  } else {
    const maxBasicPartners = settings.system?.basicPartnerLeadLimit || 3;
    const basicAssignmentCount = activeAssignments.length;

    if (basicAssignmentCount < maxBasicPartners) {
      return 'partial_assigned';
    } else if (pendingCount > 0) {
      return 'assigned';
    } else {
      return 'assigned';
    }
  }
};

async function fixLeadStatuses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    console.log('Fetching all leads...');
    const leads = await Lead.find({}).populate('partnerAssignments.partner');
    console.log(`Found ${leads.length} leads to process`);

    const settings = await Settings.getSettings();
    let updatedCount = 0;

    for (const lead of leads) {
      const newStatus = await calculateAdminStatus(lead, settings);

      if (lead.status !== newStatus) {
        console.log(`Updating lead ${lead.leadId}: ${lead.status} -> ${newStatus}`);
        lead.status = newStatus;
        await lead.save();
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} leads`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing lead statuses:', error);
    process.exit(1);
  }
}

// Run the script
fixLeadStatuses();