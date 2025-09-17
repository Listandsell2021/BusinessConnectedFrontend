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

// Fix partner login issues
const fixPartnerLogin = async (email) => {
  try {
    const partner = await Partner.findOne({ 'contactPerson.email': email });

    if (!partner) {
      console.error(`Partner with email "${email}" not found`);
      return false;
    }

    console.log('🔧 Fixing Partner Login Issues');
    console.log('==============================');
    console.log(`Partner: ${partner.companyName}`);
    console.log(`Current Service Type: ${partner.serviceType}`);
    console.log('');

    // Fix 1: Update service type to moving (since user selected Moving Services)
    console.log('1. Updating service type from "cleaning" to "moving"...');
    partner.serviceType = 'moving';

    // Fix 2: Update password with proper hash
    console.log('2. Updating password to "mus22398"...');
    const newPassword = 'mus22398';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    partner.password = hashedPassword;

    // Save changes
    await partner.save();

    console.log('✅ Partner updated successfully!');
    console.log('');

    // Verify the fixes
    console.log('🔍 Verification:');
    console.log('================');

    const updatedPartner = await Partner.findOne({ 'contactPerson.email': email });
    console.log(`Service Type: ${updatedPartner.serviceType}`);

    const isPasswordValid = await bcrypt.compare(newPassword, updatedPartner.password);
    console.log(`Password Test: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log('');

    console.log('🎉 Login Credentials:');
    console.log('====================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`Service: Moving Services (matches serviceType: ${updatedPartner.serviceType})`);
    console.log(`Status: ${updatedPartner.status}`);

    return true;

  } catch (error) {
    console.error('Error fixing partner login:', error);
    return false;
  }
};

// Main execution
const main = async () => {
  await connectDB();

  const email = 'muskan.setia08@gmail.com';
  await fixPartnerLogin(email);

  await mongoose.disconnect();
  console.log('\nDatabase connection closed');
};

// Run the script
if (require.main === module) {
  require('dotenv').config();
  main().catch(console.error);
}

module.exports = { fixPartnerLogin };