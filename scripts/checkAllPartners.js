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

// Check all partners with the email
const checkAllPartners = async (email) => {
  try {
    const partners = await Partner.find({ 'contactPerson.email': email });

    console.log(`🔍 Found ${partners.length} partner(s) with email: ${email}`);
    console.log('='.repeat(60));

    partners.forEach((partner, index) => {
      console.log(`\n${index + 1}. Partner Details:`);
      console.log(`   ID: ${partner._id}`);
      console.log(`   Partner ID: ${partner.partnerId}`);
      console.log(`   Company: ${partner.companyName}`);
      console.log(`   Service Type: ${partner.serviceType}`);
      console.log(`   Partner Type: ${partner.partnerType}`);
      console.log(`   Status: ${partner.status}`);
      console.log(`   Created: ${partner.createdAt}`);
      console.log(`   Password Hash: ${partner.password.substring(0, 20)}...`);
    });

    console.log('\n🎯 Recommendations:');
    console.log('===================');

    if (partners.length > 1) {
      console.log('Multiple partners found with same email. Options:');
      console.log('1. Use the "moving" service partner for moving services login');
      console.log('2. Use the "cleaning" service partner for cleaning services login');
      console.log('3. Update password on the correct service type partner');
    }

    // Test login for each partner
    console.log('\n🔐 Password Testing:');
    console.log('====================');
    const testPassword = 'mus22398';

    for (let i = 0; i < partners.length; i++) {
      const partner = partners[i];
      const isValid = await bcrypt.compare(testPassword, partner.password);
      console.log(`${i + 1}. ${partner.serviceType} service: ${isValid ? '✅ Valid' : '❌ Invalid'} password`);
    }

    return partners;

  } catch (error) {
    console.error('Error checking partners:', error);
    return [];
  }
};

// Update password for specific partner
const updatePartnerPassword = async (partnerId, newPassword) => {
  try {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      console.log('Partner not found');
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    partner.password = hashedPassword;
    await partner.save();

    console.log(`✅ Password updated for ${partner.serviceType} service partner`);
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  }
};

// Main execution
const main = async () => {
  await connectDB();

  const email = 'muskan.setia08@gmail.com';
  const partners = await checkAllPartners(email);

  // Find the moving service partner and update its password
  const movingPartner = partners.find(p => p.serviceType === 'moving');
  if (movingPartner) {
    console.log('\n🔧 Updating password for moving service partner...');
    await updatePartnerPassword(movingPartner._id, 'mus22398');
  }

  await mongoose.disconnect();
  console.log('\nDatabase connection closed');
};

// Run the script
if (require.main === module) {
  require('dotenv').config();
  main().catch(console.error);
}