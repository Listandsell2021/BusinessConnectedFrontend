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

// Force update password for moving service partner
const forcePasswordUpdate = async () => {
  try {
    console.log('🔧 Force Password Update');
    console.log('========================');

    // Find the moving service partner
    const partner = await Partner.findOne({
      'contactPerson.email': 'muskan.setia08@gmail.com',
      serviceType: 'moving'
    });

    if (!partner) {
      console.log('❌ Moving service partner not found');
      return;
    }

    console.log(`Found partner: ${partner.partnerId} - ${partner.companyName}`);
    console.log(`Current password hash: ${partner.password}`);
    console.log('');

    // Generate new password hash
    const newPassword = 'mus22398';
    const saltRounds = 10;

    console.log('Generating new password hash...');
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    console.log(`New hash: ${newHash}`);

    // Test the new hash immediately
    const testResult = await bcrypt.compare(newPassword, newHash);
    console.log(`Hash test: ${testResult ? '✅ Valid' : '❌ Invalid'}`);

    if (!testResult) {
      console.log('❌ Hash generation failed');
      return;
    }

    // Update using direct MongoDB update to bypass any middleware
    const updateResult = await Partner.updateOne(
      {
        'contactPerson.email': 'muskan.setia08@gmail.com',
        serviceType: 'moving'
      },
      {
        $set: { password: newHash }
      }
    );

    console.log(`Update result:`, updateResult);

    // Verify the update
    const updatedPartner = await Partner.findOne({
      'contactPerson.email': 'muskan.setia08@gmail.com',
      serviceType: 'moving'
    });

    console.log('');
    console.log('🔍 Verification:');
    console.log('================');
    console.log(`Updated hash: ${updatedPartner.password}`);

    const finalTest = await bcrypt.compare(newPassword, updatedPartner.password);
    console.log(`Final password test: ${finalTest ? '✅ Valid' : '❌ Invalid'}`);

    if (finalTest) {
      console.log('');
      console.log('🎉 SUCCESS!');
      console.log('===========');
      console.log('Login credentials:');
      console.log(`Email: muskan.setia08@gmail.com`);
      console.log(`Password: ${newPassword}`);
      console.log(`Service: Moving Services`);
    }

  } catch (error) {
    console.error('❌ Error updating password:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await forcePasswordUpdate();
  await mongoose.disconnect();
  console.log('\nDatabase connection closed');
};

// Run the script
if (require.main === module) {
  require('dotenv').config();
  main().catch(console.error);
}