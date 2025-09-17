// Comprehensive Email System Verification Script
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

async function verifyEmailSystem() {
  console.log(`${colors.blue}${colors.bright}📧 Comprehensive Email System Verification${colors.reset}\n`);

  const testResults = [];

  // Test 1: Basic Email Sending
  console.log(`${colors.yellow}📨 Test 1: Basic Email Send${colors.reset}`);
  try {
    const result = await emailService.sendEmail({
      to: 'info@reinigungsfirma-vergleich.de',
      subject: 'System Verification - Basic Email Test',
      html: '<h1>✅ Basic Email Test Successful</h1><p>Your email system is working correctly!</p>'
    });

    if (result.success) {
      console.log(`${colors.green}✅ PASSED - Basic email sending${colors.reset}`);
      testResults.push({ test: 'Basic Email', status: 'PASSED' });
    } else {
      console.log(`${colors.red}❌ FAILED - Basic email sending: ${result.error}${colors.reset}`);
      testResults.push({ test: 'Basic Email', status: 'FAILED', error: result.error });
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - Basic email sending: ${error.message}${colors.reset}`);
    testResults.push({ test: 'Basic Email', status: 'FAILED', error: error.message });
  }

  // Test 2: Lead Confirmation Email
  console.log(`\n${colors.yellow}📝 Test 2: Lead Confirmation Email${colors.reset}`);
  try {
    const mockLead = {
      leadId: 'VERIFY-001',
      serviceType: 'cleaning',
      createdAt: new Date(),
      user: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'info@reinigungsfirma-vergleich.de'
      }
    };

    const result = await emailService.sendLeadConfirmation(mockLead);
    if (result.success) {
      console.log(`${colors.green}✅ PASSED - Lead confirmation email${colors.reset}`);
      testResults.push({ test: 'Lead Confirmation', status: 'PASSED' });
    } else {
      console.log(`${colors.red}❌ FAILED - Lead confirmation: ${result.error}${colors.reset}`);
      testResults.push({ test: 'Lead Confirmation', status: 'FAILED', error: result.error });
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - Lead confirmation: ${error.message}${colors.reset}`);
    testResults.push({ test: 'Lead Confirmation', status: 'FAILED', error: error.message });
  }

  // Test 3: Partner Registration Email
  console.log(`\n${colors.yellow}🏢 Test 3: Partner Registration Email${colors.reset}`);
  try {
    const mockPartner = {
      companyName: 'Verification Reinigungsfirma',
      contactPerson: {
        firstName: 'Test',
        lastName: 'Partner',
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

    const result = await emailService.sendPartnerRegistrationConfirmation(mockPartner);
    if (result.success) {
      console.log(`${colors.green}✅ PASSED - Partner registration email${colors.reset}`);
      testResults.push({ test: 'Partner Registration', status: 'PASSED' });
    } else {
      console.log(`${colors.red}❌ FAILED - Partner registration: ${result.error}${colors.reset}`);
      testResults.push({ test: 'Partner Registration', status: 'FAILED', error: result.error });
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - Partner registration: ${error.message}${colors.reset}`);
    testResults.push({ test: 'Partner Registration', status: 'FAILED', error: error.message });
  }

  // Test 4: Password Reset OTP Email
  console.log(`\n${colors.yellow}🔐 Test 4: Password Reset OTP Email${colors.reset}`);
  try {
    const mockUser = {
      contactPerson: {
        firstName: 'Test',
        lastName: 'User',
        email: 'info@reinigungsfirma-vergleich.de'
      },
      companyName: 'Test Company'
    };

    const result = await emailService.sendPasswordResetOTP(mockUser, '987654', 'partner');
    if (result.success) {
      console.log(`${colors.green}✅ PASSED - Password reset OTP email${colors.reset}`);
      testResults.push({ test: 'Password Reset OTP', status: 'PASSED' });
    } else {
      console.log(`${colors.red}❌ FAILED - Password reset OTP: ${result.error}${colors.reset}`);
      testResults.push({ test: 'Password Reset OTP', status: 'FAILED', error: result.error });
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - Password reset OTP: ${error.message}${colors.reset}`);
    testResults.push({ test: 'Password Reset OTP', status: 'FAILED', error: error.message });
  }

  // Test 5: Lead Assignment Notification
  console.log(`\n${colors.yellow}🎯 Test 5: Lead Assignment Notification${colors.reset}`);
  try {
    const mockPartner = {
      companyName: 'Test Reinigungsfirma',
      contactPerson: {
        firstName: 'Test',
        lastName: 'Partner',
        email: 'info@reinigungsfirma-vergleich.de'
      }
    };

    const mockLead = {
      leadId: 'ASSIGN-001',
      serviceType: 'cleaning',
      user: {
        firstName: 'Test',
        lastName: 'Customer'
      },
      serviceLocation: {
        city: 'Berlin'
      }
    };

    const result = await emailService.sendLeadAssignmentNotification(mockPartner, mockLead);
    if (result.success) {
      console.log(`${colors.green}✅ PASSED - Lead assignment notification${colors.reset}`);
      testResults.push({ test: 'Lead Assignment', status: 'PASSED' });
    } else {
      console.log(`${colors.red}❌ FAILED - Lead assignment: ${result.error}${colors.reset}`);
      testResults.push({ test: 'Lead Assignment', status: 'FAILED', error: result.error });
    }
  } catch (error) {
    console.log(`${colors.red}❌ FAILED - Lead assignment: ${error.message}${colors.reset}`);
    testResults.push({ test: 'Lead Assignment', status: 'FAILED', error: error.message });
  }

  // Test Summary
  console.log(`\n${colors.blue}${colors.bright}📊 Email System Verification Summary${colors.reset}`);
  const passedTests = testResults.filter(test => test.status === 'PASSED').length;
  const totalTests = testResults.length;

  console.log(`\n${colors.bright}Results: ${passedTests}/${totalTests} tests passed${colors.reset}`);

  testResults.forEach(test => {
    const status = test.status === 'PASSED'
      ? `${colors.green}✅ PASSED${colors.reset}`
      : `${colors.red}❌ FAILED${colors.reset}`;
    console.log(`  ${test.test}: ${status}`);
    if (test.error) {
      console.log(`    Error: ${test.error}`);
    }
  });

  if (passedTests === totalTests) {
    console.log(`\n${colors.green}${colors.bright}🎉 ALL EMAIL TESTS PASSED!${colors.reset}`);
    console.log(`${colors.green}✅ Email system is fully operational and ready for production${colors.reset}`);
    console.log(`${colors.yellow}📧 All emails will be sent from: ${process.env.FROM_EMAIL}${colors.reset}`);
    console.log(`${colors.yellow}🏢 Company: ${process.env.COMPANY_NAME}${colors.reset}\n`);
    return true;
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ ${totalTests - passedTests} TEST(S) FAILED${colors.reset}`);
    console.log(`${colors.red}Please review and fix the failing tests before using in production${colors.reset}\n`);
    return false;
  }
}

// Run the verification
if (require.main === module) {
  verifyEmailSystem()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(`${colors.red}${colors.bright}💥 VERIFICATION FAILED:${colors.reset}`, error);
      process.exit(1);
    });
}

module.exports = verifyEmailSystem;