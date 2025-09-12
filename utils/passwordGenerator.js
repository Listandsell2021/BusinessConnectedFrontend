// Password Generator Utility for Partners
// Generates default password: First 3 chars of company name + Last 5 digits of phone

/**
 * Generate default password for partner
 * @param {string} companyName - Company name
 * @param {string} phone - Phone number
 * @returns {string} Generated password
 */
const generatePartnerDefaultPassword = (companyName, phone) => {
  try {
    // Get first 3 characters of company name, remove spaces and special chars
    const companyPrefix = companyName
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters and spaces
      .substring(0, 3)
      .toLowerCase();
    
    // Get last 5 digits from phone number
    const phoneDigits = phone.replace(/[^\d]/g, ''); // Keep only digits
    const phoneSuffix = phoneDigits.slice(-5); // Last 5 digits
    
    // Generate password - ensure all lowercase
    const defaultPassword = (companyPrefix + phoneSuffix).toLowerCase();
    
    // Ensure minimum length of 6 characters
    if (defaultPassword.length < 6) {
      // Pad with random digits if too short
      const padding = '123'.substring(0, 6 - defaultPassword.length);
      return defaultPassword + padding;
    }
    
    return defaultPassword;
    
  } catch (error) {
    console.error('Error generating default password:', error);
    // Fallback password
    return 'partner123';
  }
};

/**
 * Generate multiple passwords for testing
 */
const testPasswordGeneration = () => {
  const testCases = [
    { company: 'ABC Company', phone: '+49 30 12345678' },
    { company: 'Berlin Moving Express', phone: '030-98765432' },
    { company: 'Clean & Fresh GmbH', phone: '0151 23456789' },
    { company: 'München Transport', phone: '+49 89 11111' }
  ];
  
  console.log('🔐 Password Generation Test Cases:');
  console.log('=' .repeat(60));
  
  testCases.forEach((test, index) => {
    const password = generatePartnerDefaultPassword(test.company, test.phone);
    console.log(`${index + 1}. Company: ${test.company}`);
    console.log(`   Phone: ${test.phone}`);
    console.log(`   Generated Password: ${password}`);
    console.log('   ' + '-'.repeat(40));
  });
};

module.exports = {
  generatePartnerDefaultPassword,
  testPasswordGeneration
};

// Run test if this file is executed directly
if (require.main === module) {
  testPasswordGeneration();
}