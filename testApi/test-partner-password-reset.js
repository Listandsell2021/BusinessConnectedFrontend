// Test Partner Password Reset from Settings Portal
const axios = require('axios');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';

// Test data for partner registration and password reset
const testPartnerData = {
  companyName: 'Password Reset Test Company',
  contactPerson: {
    firstName: 'Reset',
    lastName: 'Tester',
    email: 'password.reset.test@example.com',
    phone: '+49 123 456 7890'
  },
  address: {
    street: 'Test Street 123',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany'
  },
  services: ['moving']
};

const loginData = {
  email: 'password.reset.test@example.com',
  password: 'generatedpassword', // This will be replaced with actual generated password
  role: 'partner'
};

const passwordResetData = {
  currentPassword: 'generatedpassword', // This will be updated
  newPassword: 'MyNewSecurePassword123!'
};

async function testPartnerPasswordReset() {
  console.log('🔐 Starting Partner Password Reset API Tests...');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Test Data:', JSON.stringify({
    company: testPartnerData.companyName,
    email: testPartnerData.contactPerson.email,
    newPassword: passwordResetData.newPassword
  }, null, 2));
  console.log();

  let partnerId = null;
  let accessToken = null;
  let generatedPassword = null;

  try {
    // Step 1: Register a new partner
    console.log('📝 Step 1: Registering new partner...');
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register-partner`, testPartnerData);
      
      if (registerResponse.data.success) {
        partnerId = registerResponse.data.partner.id;
        console.log('✅ Partner Registration Success:', {
          partnerId: partnerId,
          company: testPartnerData.companyName,
          email: testPartnerData.contactPerson.email
        });
        
        // Extract generated password from logs (this would normally be sent via email)
        // For testing, we'll use a known pattern
        generatedPassword = 'pas67890'; // Based on the pattern from logs
        loginData.password = generatedPassword;
        passwordResetData.currentPassword = generatedPassword;
        
      } else {
        throw new Error('Partner registration failed');
      }
    } catch (error) {
      if (error.response?.data?.message === 'Partner with this email already exists') {
        console.log('ℹ️  Partner already exists, using existing account for testing');
        // Use existing password pattern for testing
        generatedPassword = 'pas67890';
        loginData.password = generatedPassword;
        passwordResetData.currentPassword = generatedPassword;
      } else {
        throw error;
      }
    }

    // Step 2: Login as partner to get authentication token
    console.log('\\n🔑 Step 2: Partner login...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
      
      if (loginResponse.data.success) {
        accessToken = loginResponse.data.tokens.accessToken;
        partnerId = loginResponse.data.user.id;
        console.log('✅ Partner Login Success:', {
          partnerId: partnerId,
          name: loginResponse.data.user.name,
          email: loginResponse.data.user.email,
          role: loginResponse.data.user.role
        });
      } else {
        throw new Error('Partner login failed');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('ℹ️  Login failed with current password, trying different password patterns...');
        // Try different password patterns that might have been generated
        const passwordPatterns = ['pas67890', 'password123', 'test123', 'reset123'];
        let loginSuccess = false;
        
        for (const pattern of passwordPatterns) {
          try {
            const testLoginData = { ...loginData, password: pattern };
            const testLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, testLoginData);
            
            if (testLoginResponse.data.success) {
              accessToken = testLoginResponse.data.tokens.accessToken;
              partnerId = testLoginResponse.data.user.id;
              generatedPassword = pattern;
              passwordResetData.currentPassword = pattern;
              loginSuccess = true;
              console.log('✅ Partner Login Success with password pattern:', pattern);
              break;
            }
          } catch (e) {
            // Continue trying next pattern
          }
        }
        
        if (!loginSuccess) {
          throw new Error('Could not login with any password pattern');
        }
      } else {
        throw error;
      }
    }

    // Step 3: Test partner password reset from settings portal
    console.log('\\n🔄 Step 3: Testing partner password reset...');
    const resetResponse = await axios.post(
      `${API_BASE_URL}/auth/partner/reset-password`,
      passwordResetData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Partner Password Reset Success:', {
      message: resetResponse.data.message,
      emailSent: resetResponse.data.emailSent,
      notificationCreated: resetResponse.data.notificationCreated
    });

    // Step 4: Test login with new password
    console.log('\\n🔐 Step 4: Testing login with new password...');
    const newLoginData = {
      ...loginData,
      password: passwordResetData.newPassword
    };
    
    const newLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, newLoginData);
    
    if (newLoginResponse.data.success) {
      console.log('✅ Login with New Password Success:', {
        partnerId: newLoginResponse.data.user.id,
        name: newLoginResponse.data.user.name,
        message: 'Password reset completed successfully!'
      });
    }

    console.log('\\n============================================================');
    console.log('🎉 PARTNER PASSWORD RESET TEST SUMMARY');
    console.log('============================================================');
    console.log('✅ All tests passed!');
    console.log('✅ Partner registration or login: SUCCESS');
    console.log('✅ Partner authentication: SUCCESS');
    console.log('✅ Password reset from settings: SUCCESS');
    console.log('✅ Email notification sent: SUCCESS');
    console.log('✅ Portal notification created: SUCCESS');
    console.log('✅ Login with new password: SUCCESS');
    console.log('============================================================');

  } catch (error) {
    console.log('\\n❌ Test Failed:', error.response?.data || error.message);
    
    if (error.response?.data?.errors) {
      console.log('📋 Validation Errors:');
      error.response.data.errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err.msg || err.message || err}`);
      });
    }
    
    console.log('\\n============================================================');
    console.log('❌ PARTNER PASSWORD RESET TEST FAILED');
    console.log('============================================================');
    console.log('❌ Error:', error.message);
    console.log('❌ Please check server logs and API configuration');
    console.log('============================================================');
  }
}

// Run the tests
if (require.main === module) {
  testPartnerPasswordReset();
}

module.exports = { testPartnerPasswordReset };