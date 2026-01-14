/**
 * German Phone Number Validation Utility
 * Validates German mobile and landline numbers
 */

/**
 * Cleans phone number by removing spaces, dashes, parentheses
 * @param {string} phoneNumber - Raw phone number input
 * @returns {string} - Cleaned phone number
 */
export const cleanPhoneNumber = (phoneNumber) => {
  return phoneNumber.replace(/[\s\-\(\)]/g, '');
};

/**
 * Validates German phone number format
 * Supports:
 * 1. Mobile WITH leading 0: 01[5-7] followed by 6-9 digits (total 10-12 digits)
 * 2. Mobile WITHOUT leading 0: 1[5-7] followed by 6-9 digits (total 9-11 digits)
 * 3. Landline: 0[2-9] followed by 8-10 digits (total 10-12 digits)
 *
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid German phone number
 */
export const isValidGermanPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;

  const cleaned = cleanPhoneNumber(phoneNumber);

  // Mobile numbers with leading 0: 01[5-7] + 6-9 more digits = 10-12 total
  const mobileWithZero = /^01[5-7]\d{6,9}$/;

  // Mobile numbers without leading 0: 1[5-7] + 6-9 more digits = 9-11 total
  const mobileWithoutZero = /^1[5-7]\d{6,9}$/;

  // Landline numbers: 0[2-9] + 8-10 more digits = 10-12 total
  const landline = /^0[2-9]\d{8,10}$/;

  return mobileWithZero.test(cleaned) || mobileWithoutZero.test(cleaned) || landline.test(cleaned);
};

/**
 * Converts phone number to international format (+49...)
 * @param {string} phoneNumber - Phone number to convert
 * @returns {string} - Phone number in +49 format
 */
export const formatPhoneToInternational = (phoneNumber) => {
  if (!phoneNumber) return '';

  const cleaned = cleanPhoneNumber(phoneNumber);

  // Remove leading 0 if present and add +49
  if (cleaned.startsWith('0')) {
    return '+49' + cleaned.substring(1);
  }

  // If no leading 0, just add +49
  return '+49' + cleaned;
};

/**
 * Gets validation error message in German
 * @param {string} phoneNumber - Phone number to validate
 * @returns {string|null} - Error message or null if valid
 */
export const getPhoneValidationError = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return 'Telefonnummer ist erforderlich';
  }

  if (!isValidGermanPhoneNumber(phoneNumber)) {
    return 'Bitte geben Sie eine gültige deutsche Telefonnummer ein (z.B. 0151 23456789 oder 030 12345678)';
  }

  return null;
};
