// Create Demo Email Account for Testing
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function createDemoAccount() {
  try {
    console.log('🔧 Creating demo email account...');
    
    // Create test account
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('✅ Demo email account created successfully!\n');
    console.log('📧 Account Details:');
    console.log(`   Email: ${testAccount.user}`);
    console.log(`   Password: ${testAccount.pass}`);
    console.log(`   SMTP Host: smtp.ethereal.email`);
    console.log(`   SMTP Port: 587`);
    console.log('\n🌐 View emails at: https://ethereal.email/login');
    console.log(`   Login with: ${testAccount.user} / ${testAccount.pass}`);
    
    // Update .env file
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace email configuration
    const newEmailConfig = `# Email Configuration (SMTP Settings) - Demo Account
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=${testAccount.user}
SMTP_PASS=${testAccount.pass}
FROM_NAME=ProvenHub Team (Demo)
FROM_EMAIL=${testAccount.user}`;
    
    // Replace existing email config
    envContent = envContent.replace(
      /# Email Configuration.*?FROM_EMAIL=.*$/ms,
      newEmailConfig
    );
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ .env file updated with demo account credentials');
    
    // Test the email sending
    console.log('\n🧪 Testing email sending...');
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    const testMessage = {
      from: `"ProvenHub Team (Demo)" <${testAccount.user}>`,
      to: testAccount.user,
      subject: 'Demo Account Test - ProvenHub Email Configuration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3d68ff; color: white; padding: 20px; text-align: center;">
            <h1>🎉 Demo Email Account Working!</h1>
          </div>
          <div style="padding: 20px;">
            <p>✅ <strong>Success!</strong> Your demo email configuration is working perfectly.</p>
            <p><strong>Account Details:</strong></p>
            <ul>
              <li><strong>Email:</strong> ${testAccount.user}</li>
              <li><strong>Password:</strong> ${testAccount.pass}</li>
              <li><strong>SMTP Host:</strong> smtp.ethereal.email</li>
              <li><strong>SMTP Port:</strong> 587</li>
            </ul>
            <p>🌐 <strong>View this email at:</strong> <a href="https://ethereal.email" target="_blank">https://ethereal.email</a></p>
            <p>Now your partner registration emails will work!</p>
            <p><strong>Created:</strong> ${new Date().toISOString()}</p>
          </div>
        </div>
      `
    };
    
    const result = await transporter.sendMail(testMessage);
    const previewUrl = nodemailer.getTestMessageUrl(result);
    
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Preview URL: ${previewUrl}`);
    
    console.log('\n🎉 Demo email account is ready to use!');
    console.log('\n📋 Next Steps:');
    console.log('1. Your server will now send emails using this demo account');
    console.log('2. All emails can be viewed at: https://ethereal.email');
    console.log(`3. Login with: ${testAccount.user} / ${testAccount.pass}`);
    console.log('4. Test partner registration: the emails will appear there');
    console.log('5. No real emails are sent - everything is captured for testing');
    
    return {
      user: testAccount.user,
      pass: testAccount.pass,
      previewUrl
    };
    
  } catch (error) {
    console.error('❌ Failed to create demo account:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createDemoAccount()
    .then(() => {
      console.log('\n✅ Demo email account setup complete!');
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createDemoAccount };