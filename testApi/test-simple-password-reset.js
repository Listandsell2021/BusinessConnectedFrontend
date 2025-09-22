// Simple Partner Password Reset Test
const axios = require('axios');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';

async function testPasswordResetWithExistingPartner() {
  console.log('🔐 Testing Partner Password Reset with Known Partner...');
  
  // Use a partner from earlier tests that should be active
  const loginData = {
    email: 'test.with.dots@example.com',
    password: 'dot67890', // Known generated password from earlier tests
    role: 'partner'
  };
  
  try {
    // Step 1: Login to get access token
    console.log('🔑 Step 1: Partner login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const accessToken = loginResponse.data.tokens.accessToken;
    const partnerId = loginResponse.data.user.id;
    
    console.log('✅ Login Success:', {
      partnerId,
      name: loginResponse.data.user.name,
      email: loginResponse.data.user.email
    });
    
    // Step 2: Test password reset from settings
    console.log('\\n🔄 Step 2: Testing password reset...');
    const passwordResetData = {
      currentPassword: 'dot67890',
      newPassword: 'MyNewTestPassword123!'
    };
    
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
    
    console.log('✅ Password Reset Success:', {
      message: resetResponse.data.message,
      emailSent: resetResponse.data.emailSent,
      notificationCreated: resetResponse.data.notificationCreated
    });
    
    // Step 3: Test login with new password
    console.log('\\n🔐 Step 3: Testing login with new password...');
    const newLoginData = {
      email: 'test.with.dots@example.com',
      password: 'MyNewTestPassword123!',
      role: 'partner'
    };
    
    const newLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, newLoginData);
    
    if (newLoginResponse.data.success) {
      console.log('✅ New Password Login Success:', {
        partnerId: newLoginResponse.data.user.id,
        name: newLoginResponse.data.user.name,
        message: 'Password reset flow completed successfully!'
      });
    }
    
    console.log('\\n🎉 All password reset tests passed!');
    
  } catch (error) {
    console.log('❌ Test Failed:', error.response?.data || error.message);
    
    if (error.response?.data?.errors) {
      console.log('📋 Validation Errors:', error.response.data.errors);
    }
  }
}

testPasswordResetWithExistingPartner();