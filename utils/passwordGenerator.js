// Password Generator Utility for Partners
// Generates strong passwords: 12+ characters with uppercase, lowercase, numbers, and symbols

/**
 * Generate strong password for partner (auto-generation)
 * @param {string} companyName - Company name
 * @param {string} phone - Phone number
 * @returns {string} Generated strong password (12+ characters)
 */
const generatePartnerDefaultPassword = (companyName, phone) => {
  try {
    // Get first 3 characters of company name, remove spaces
    let companyPrefix = companyName
      .replace(/[^a-zA-Z]/g, '') // Keep only letters
      .substring(0, 3)
      .toUpperCase(); // Use uppercase for variety

    // Ensure company prefix is at least 3 characters
    if (companyPrefix.length < 3) {
      companyPrefix = (companyPrefix + 'ABC').substring(0, 3);
    }

    // Get last 4 digits from phone number
    let phoneDigits = phone.replace(/[^\d]/g, ''); // Keep only digits
    let phoneSuffix = phoneDigits.slice(-4); // Last 4 digits

    // Ensure phone suffix is at least 4 digits, pad with zeros if needed
    if (phoneSuffix.length < 4) {
      phoneSuffix = (phoneSuffix + '0000').substring(0, 4);
    }

    // Add symbols for strong password
    const symbols = ['!', '@', '#', '$', '%', '&', '*'];
    const randomSymbol1 = symbols[Math.floor(Math.random() * symbols.length)];
    const randomSymbol2 = symbols[Math.floor(Math.random() * symbols.length)];

    // Add lowercase letters for variety
    const lowerLetters = 'abcdefghijklmnopqrstuvwxyz';
    const randomLower1 = lowerLetters[Math.floor(Math.random() * lowerLetters.length)];
    const randomLower2 = lowerLetters[Math.floor(Math.random() * lowerLetters.length)];

    // Generate password: Company(3) + Symbol(1) + Phone(4) + Symbol(1) + RandomLower(2) = 11+ chars, ensure 12+
    let defaultPassword = `${companyPrefix}${randomSymbol1}${phoneSuffix}${randomSymbol2}${randomLower1}${randomLower2}`;

    // Ensure minimum length of 12 characters
    if (defaultPassword.length < 12) {
      // Pad with additional random characters including symbols
      const remainingLength = 12 - defaultPassword.length;
      const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';

      let padding = '';
      // Add symbols to padding to ensure password has enough symbols
      for (let i = 0; i < remainingLength; i++) {
        if (i % 2 === 0) {
          // Add symbol on even positions
          padding += symbols[Math.floor(Math.random() * symbols.length)];
        } else {
          // Add random character on odd positions
          padding += allChars[Math.floor(Math.random() * allChars.length)];
        }
      }

      // Shuffle the padding to randomize positions
      padding = padding.split('').sort(() => Math.random() - 0.5).join('');
      defaultPassword = defaultPassword + padding;
    }

    // Final shuffle of entire password for better randomization
    const passwordArray = defaultPassword.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    return passwordArray.join('');

  } catch (error) {
    console.error('Error generating default password:', error);
    // Fallback strong password
    return generateRandomPassword(12);
  }
};

/**
 * Generate random strong password
 * @param {number} length - Password length (minimum 12)
 * @returns {string} Generated random strong password
 */
const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';

  // Ensure at least one of each character type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly from all characters
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and messages
 */
const validatePasswordStrength = (password) => {
  const result = {
    isValid: true,
    messages: [],
    strength: 'weak' // weak, medium, strong
  };

  // Check minimum length (12 characters)
  if (!password || password.length < 12) {
    result.isValid = false;
    result.messages.push('Password must be at least 12 characters long');
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    result.isValid = false;
    result.messages.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    result.isValid = false;
    result.messages.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    result.isValid = false;
    result.messages.push('Password must contain at least one number');
  }

  // Check for symbols
  if (!/[!@#$%&*]/.test(password)) {
    result.isValid = false;
    result.messages.push('Password must contain at least one symbol (!@#$%&*)');
  }

  // Determine strength
  if (result.isValid) {
    if (password.length >= 16) {
      result.strength = 'strong';
    } else if (password.length >= 12) {
      result.strength = 'medium';
    }
  }

  return result;
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
  generateRandomPassword,
  validatePasswordStrength,
  testPasswordGeneration
};

// Run test if this file is executed directly
if (require.main === module) {
  testPasswordGeneration();
}