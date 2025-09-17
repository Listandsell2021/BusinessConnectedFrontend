const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Partner = require('../models/Partner');
const User = require('../models/User');

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

// Simulate the exact login flow
const debugLogin = async (email, password, selectedService) => {
  try {
    console.log('🔍 Debugging Login Flow');
    console.log('=======================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Selected Service: ${selectedService}`);
    console.log('');

    let user = null;
    let role = 'partner';

    console.log('Step 1: Looking for partner with specific service...');
    if (selectedService) {
      user = await Partner.findOne({
        'contactPerson.email': email,
        serviceType: selectedService
      });
      console.log(`   Found partner with ${selectedService} service: ${user ? 'YES' : 'NO'}`);
      if (user) {
        console.log(`   Partner ID: ${user.partnerId}`);
        console.log(`   Company: ${user.companyName}`);
        console.log(`   Service Type: ${user.serviceType}`);
        console.log(`   Status: ${user.status}`);
      }
    } else {
      console.log('   No service selected, looking for any partner...');
      user = await Partner.findOne({ 'contactPerson.email': email });
      console.log(`   Found any partner: ${user ? 'YES' : 'NO'}`);
    }

    if (!user) {
      console.log('Step 2: No partner found, checking for User...');
      user = await User.findOne({ email });
      role = user?.role || 'user';
      console.log(`   Found user: ${user ? 'YES' : 'NO'}`);
      if (user) {
        console.log(`   User role: ${role}`);
      }
    }

    if (!user) {
      console.log('❌ RESULT: No user found - Invalid credentials');
      return;
    }

    console.log('\nStep 3: Checking user status...');
    if (role === 'partner') {
      console.log(`   Partner status: ${user.status}`);
      if (user.status !== 'active') {
        console.log('❌ RESULT: Partner account is not active');
        return;
      }
      console.log('   ✅ Partner status is active');
    } else {
      console.log(`   User status: ${user.status}`);
      console.log(`   User isActive: ${user.isActive}`);
      if (!user.isActive && user.status !== 'active') {
        console.log('❌ RESULT: User account is not active');
        return;
      }
      console.log('   ✅ User status is active');
    }

    console.log('\nStep 4: Verifying password...');
    console.log(`   Stored hash: ${user.password}`);
    console.log(`   Testing password: ${password}`);

    const isPasswordValid = await user.comparePassword(password);
    console.log(`   Password comparison result: ${isPasswordValid ? '✅ VALID' : '❌ INVALID'}`);

    // Also test with direct bcrypt
    const directBcryptTest = await bcrypt.compare(password, user.password);
    console.log(`   Direct bcrypt test: ${directBcryptTest ? '✅ VALID' : '❌ INVALID'}`);

    if (!isPasswordValid) {
      console.log('❌ RESULT: Invalid password');
      return;
    }

    console.log('\nStep 5: Service validation...');
    if (role === 'partner' && selectedService && user.serviceType !== selectedService) {
      console.log(`   Expected service: ${selectedService}`);
      console.log(`   Partner service: ${user.serviceType}`);
      console.log('❌ RESULT: Service mismatch');
      return;
    }
    console.log('   ✅ Service validation passed');

    console.log('\n🎉 LOGIN SHOULD SUCCEED!');
    console.log('========================');
    console.log(`Role: ${role}`);
    console.log(`User/Partner ID: ${user._id}`);
    console.log(`Service Type: ${user.serviceType || 'N/A'}`);

  } catch (error) {
    console.error('❌ Error during login debug:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();

  // Test the exact login request
  await debugLogin('muskan.setia08@gmail.com', 'mus22398', 'moving');

  await mongoose.disconnect();
  console.log('\nDatabase connection closed');
};

// Run the script
if (require.main === module) {
  require('dotenv').config();
  main().catch(console.error);
}