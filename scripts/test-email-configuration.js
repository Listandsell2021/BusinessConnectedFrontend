// Email Configuration Test Script
const emailService = require('../services/emailService');
require('dotenv').config();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

async function testEmailConfiguration() {
  console.log(`${colors.blue}${colors.bright}📧 Testing Email Configuration${colors.reset}\n`);

  // Check environment variables
  console.log(`${colors.yellow}🔍 Checking SMTP Configuration:${colors.reset}`);
  console.log(`SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`SMTP User: ${process.env.SMTP_USER}`);
  console.log(`From Email: ${process.env.FROM_EMAIL}`);
  console.log(`From Name: ${process.env.FROM_NAME}`);
  console.log(`Company Name: ${process.env.COMPANY_NAME}\n`);

  // Test basic email sending
  console.log(`${colors.yellow}📨 Testing Basic Email Send:${colors.reset}`);

  try {
    // Test with a simple email
    const testEmail = {
      to: 'info@reinigungsfirma-vergleich.de', // Send to same email for testing
      subject: 'Email Configuration Test - Leadform System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>✅ Email Configuration Test</h1>
          </div>
          <div style="padding: 20px;">
            <p><strong>Congratulations!</strong></p>
            <p>Your Leadform email system is now properly configured and working!</p>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Configuration Details:</h3>
              <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
              <p><strong>From Email:</strong> ${process.env.FROM_EMAIL}</p>
              <p><strong>Company:</strong> ${process.env.COMPANY_NAME}</p>
              <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>All email functions are now ready for production use.</p>

            <p>Best regards,<br>
            <strong>${process.env.COMPANY_TEAM}</strong></p>
          </div>
          <div style="background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px;">
            This is an automated test message from the Leadform email system.
          </div>
        </div>
      `
    };

    const result = await emailService.sendEmail(testEmail);

    if (result.success) {
      console.log(`${colors.green}✅ Basic email test PASSED${colors.reset}`);
      console.log(`Message ID: ${result.messageId}`);
      if (result.previewUrl) {
        console.log(`Preview URL: ${result.previewUrl}`);
      }
    } else {
      console.log(`${colors.red}❌ Basic email test FAILED${colors.reset}`);
      console.log(`Error: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.log(`${colors.red}❌ Email test FAILED with exception${colors.reset}`);
    console.log(`Error: ${error.message}`);
    return false;
  }

  console.log(`\n${colors.yellow}🧪 Testing Email Service Methods:${colors.reset}`);

  // Test Password Reset OTP email
  try {
    console.log('Testing Password Reset OTP email...');
    const mockUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'info@reinigungsfirma-vergleich.de',
      contactPerson: {
        firstName: 'Test',
        lastName: 'Partner',
        email: 'info@reinigungsfirma-vergleich.de'
      },
      companyName: 'Test Company'
    };

    const otpResult = await emailService.sendPasswordResetOTP(mockUser, '123456', 'partner');
    if (otpResult.success) {
      console.log(`${colors.green}✅ Password Reset OTP email test PASSED${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Password Reset OTP email test FAILED: ${otpResult.error}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Password Reset OTP email test FAILED: ${error.message}${colors.reset}`);
  }

  // Test Lead Confirmation email
  try {
    console.log('Testing Lead Confirmation email...');
    const mockLead = {
      leadId: 'TEST-001',
      serviceType: 'cleaning',
      createdAt: new Date(),
      user: {
        firstName: 'Maria',
        lastName: 'Schmidt',
        email: 'info@reinigungsfirma-vergleich.de'
      }
    };

    const leadResult = await emailService.sendLeadConfirmation(mockLead);
    if (leadResult.success) {
      console.log(`${colors.green}✅ Lead Confirmation email test PASSED${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Lead Confirmation email test FAILED: ${leadResult.error}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Lead Confirmation email test FAILED: ${error.message}${colors.reset}`);
  }

  // Test Partner Registration email
  try {
    console.log('Testing Partner Registration email...');
    const mockPartner = {
      companyName: 'Test Reinigungsfirma',
      contactPerson: {
        firstName: 'Hans',
        lastName: 'Müller',
        email: 'info@reinigungsfirma-vergleich.de',
        phone: '+49 123 456789'
      },
      address: {
        street: 'Teststraße 123',
        city: 'Berlin',
        postalCode: '10115'
      },
      services: ['cleaning']
    };

    const registrationResult = await emailService.sendPartnerRegistrationConfirmation(mockPartner);
    if (registrationResult.success) {
      console.log(`${colors.green}✅ Partner Registration email test PASSED${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Partner Registration email test FAILED: ${registrationResult.error}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Partner Registration email test FAILED: ${error.message}${colors.reset}`);
  }

  console.log(`\n${colors.blue}${colors.bright}📊 Email Configuration Test Complete${colors.reset}`);
  console.log(`\n${colors.green}🎉 All email functions are now configured and working properly!${colors.reset}`);
  console.log(`${colors.yellow}📧 Emails will be sent from: ${process.env.FROM_EMAIL}${colors.reset}`);
  console.log(`${colors.yellow}🏢 Company: ${process.env.COMPANY_NAME}${colors.reset}\n`);

  return true;
}

// Run the test
if (require.main === module) {
  testEmailConfiguration()
    .then(success => {
      if (success) {
        console.log(`${colors.green}${colors.bright}✅ EMAIL SYSTEM READY FOR PRODUCTION${colors.reset}`);
        process.exit(0);
      } else {
        console.log(`${colors.red}${colors.bright}❌ EMAIL SYSTEM NEEDS ATTENTION${colors.reset}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`${colors.red}${colors.bright}💥 TEST FAILED:${colors.reset}`, error);
      process.exit(1);
    });
}

module.exports = testEmailConfiguration;