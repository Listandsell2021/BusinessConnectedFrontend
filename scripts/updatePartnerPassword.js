const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Partner = require('../models/Partner');
const logger = require('../utils/logger');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for password update');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Update partner password
const updatePartnerPassword = async (companyName, newPassword) => {
  try {
    // Find partner by company name
    const partner = await Partner.findOne({ companyName });

    if (!partner) {
      console.error(`Partner with company name "${companyName}" not found`);
      return false;
    }

    console.log(`Found partner: ${partner.partnerId} - ${partner.companyName}`);
    console.log(`Email: ${partner.contactPerson.email}`);

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password
    partner.password = hashedPassword;
    await partner.save();

    console.log('✅ Password updated successfully!');
    console.log(`New hashed password: ${hashedPassword}`);

    // Verify the password works
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log(`Password verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

    return true;

  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🔐 Partner Password Update Script');
  console.log('================================');

  await connectDB();

  const companyName = 'Muskan Partner Company';
  const newPassword = 'mus22398';

  console.log(`Updating password for: ${companyName}`);
  console.log(`New password: ${newPassword}`);
  console.log('');

  const success = await updatePartnerPassword(companyName, newPassword);

  if (success) {
    console.log('');
    console.log('🎉 Password update completed successfully!');
    console.log(`Partner can now login with:`);
    console.log(`Email: Check the partner record for email`);
    console.log(`Password: ${newPassword}`);
  } else {
    console.log('❌ Password update failed');
  }

  await mongoose.disconnect();
  console.log('Database connection closed');
};

// Run the script
if (require.main === module) {
  require('dotenv').config();
  main().catch(console.error);
}

module.exports = { updatePartnerPassword };