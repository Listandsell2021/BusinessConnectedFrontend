const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Partner = require('../models/Partner');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Check partner details
const checkPartnerDetails = async (email) => {
  try {
    const partner = await Partner.findOne({ 'contactPerson.email': email });

    if (!partner) {
      console.error(`Partner with email "${email}" not found`);
      return false;
    }

    console.log('📋 Partner Details:');
    console.log('==================');
    console.log(`Partner ID: ${partner.partnerId}`);
    console.log(`Company: ${partner.companyName}`);
    console.log(`Email: ${partner.contactPerson.email}`);
    console.log(`Phone: ${partner.contactPerson.phone}`);
    console.log(`Service Type: ${partner.serviceType}`);
    console.log(`Partner Type: ${partner.partnerType}`);
    console.log(`Status: ${partner.status}`);
    console.log(`Approved: ${partner.approvedAt ? 'Yes' : 'No'}`);
    console.log('');

    // Test password
    const testPassword = 'mus22398';
    const isPasswordValid = await bcrypt.compare(testPassword, partner.password);
    console.log(`🔐 Password Test (${testPassword}): ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`Password Hash: ${partner.password}`);
    console.log('');

    // Check login requirements
    console.log('🔍 Login Requirements Check:');
    console.log('============================');
    console.log(`✅ Partner exists: ${partner ? 'Yes' : 'No'}`);
    console.log(`✅ Email correct: ${partner.contactPerson.email === email ? 'Yes' : 'No'}`);
    console.log(`✅ Password valid: ${isPasswordValid ? 'Yes' : 'No'}`);
    console.log(`✅ Status active: ${partner.status === 'active' ? 'Yes' : 'No'}`);
    console.log(`✅ Service type: ${partner.serviceType} (should match dropdown selection)`);

    return true;

  } catch (error) {
    console.error('Error checking partner:', error);
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🔍 Partner Login Debug');
  console.log('======================');

  await connectDB();

  const email = 'muskan.setia08@gmail.com';
  await checkPartnerDetails(email);

  await mongoose.disconnect();
  console.log('\nDatabase connection closed');
};

// Run the script
if (require.main === module) {
  require('dotenv').config();
  main().catch(console.error);
}

module.exports = { checkPartnerDetails };