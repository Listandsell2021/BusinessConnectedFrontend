// Email Configuration Test
// Tests if email sending is properly configured

require('dotenv').config();
const EmailService = require('../services/emailService');

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables Check:');
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_NAME', 'FROM_EMAIL'];
  let missingVars = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: ${varName.includes('PASS') ? '***hidden***' : process.env[varName]}`);
    } else {
      console.log(`❌ ${varName}: NOT SET`);
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.log(`\n⚠️  Missing required environment variables: ${missingVars.join(', ')}`);
    console.log('Please update your .env file with proper email configuration.');
    console.log('\nExample configuration:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASS=your-app-password');
    console.log('FROM_NAME=Umzug Anbieter Vergleich Team');
    console.log('FROM_EMAIL=your-email@gmail.com');
    return false;
  }
  
  // Test email sending
  console.log('\n📧 Testing Email Sending...');
  
  try {
    const testEmailResult = await EmailService.sendEmail({
      to: process.env.SMTP_USER, // Send test email to yourself
      subject: 'Test Email - Umzug Anbieter Vergleich Configuration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3d68ff; color: white; padding: 20px; text-align: center;">
            <h1>Email Configuration Test</h1>
          </div>
          <div style="padding: 20px;">
            <p>✅ <strong>Success!</strong> Your email configuration is working correctly.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
              <li><strong>From:</strong> ${process.env.FROM_NAME} &lt;${process.env.FROM_EMAIL}&gt;</li>
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            </ul>
            <p>Your partner registration emails should now work properly.</p>
          </div>
        </div>
      `
    });
    
    if (testEmailResult.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${testEmailResult.messageId}`);
      console.log(`   Sent to: ${process.env.SMTP_USER}`);
      console.log('\n🎉 Email configuration is working correctly!');
      return true;
    } else {
      console.log('❌ Email sending failed:');
      console.log(`   Error: ${testEmailResult.error}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Email test failed with exception:');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testEmailConfiguration().then(success => {
    if (success) {
      console.log('\n✅ All tests passed! Email functionality is ready.');
      process.exit(0);
    } else {
      console.log('\n❌ Email configuration needs to be fixed.');
      console.log('\n📝 Next Steps:');
      console.log('1. Update your .env file with valid SMTP credentials');
      console.log('2. For Gmail: Use App Password instead of regular password');
      console.log('3. Enable 2-factor authentication on Gmail');
      console.log('4. Generate App Password: https://myaccount.google.com/apppasswords');
      console.log('5. Run this test again: node testApi/test-email-config.js');
      process.exit(1);
    }
  });
}

module.exports = { testEmailConfiguration };