// Country code to name mapping utility
// This helps with backward compatibility when dealing with both codes and names

const countryCodeToName = {
  'DE': 'Germany',
  'AT': 'Austria', 
  'CH': 'Switzerland',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'PT': 'Portugal',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'SK': 'Slovakia',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'SI': 'Slovenia',
  'GR': 'Greece',
  'DK': 'Denmark',
  'SE': 'Sweden',
  'NO': 'Norway',
  'FI': 'Finland',
  'EE': 'Estonia',
  'LV': 'Latvia',
  'LT': 'Lithuania',
  'IE': 'Ireland',
  'GB': 'United Kingdom',
  'LU': 'Luxembourg'
};

const countryNameToCode = {};
Object.entries(countryCodeToName).forEach(([code, name]) => {
  countryNameToCode[name] = code;
});

/**
 * Convert country code to full name
 * @param {string} code - Country code (e.g., 'DE')
 * @return {string} - Country name (e.g., 'Germany') or original if not found
 */
function getCountryNameFromCode(code) {
  return countryCodeToName[code] || code;
}

/**
 * Convert country name to code
 * @param {string} name - Country name (e.g., 'Germany')
 * @return {string} - Country code (e.g., 'DE') or original if not found
 */
function getCountryCodeFromName(name) {
  return countryNameToCode[name] || name;
}

/**
 * Normalize country identifier to full name
 * Handles both codes (DE) and names (Germany)
 * @param {string} country - Country code or name
 * @return {string} - Full country name
 */
function normalizeCountryToName(country) {
  if (!country) return '';
  
  // If it's a 2-letter string, treat it as a country code (case-insensitive)
  if (country.length === 2) {
    return getCountryNameFromCode(country.toUpperCase());
  }
  
  // Otherwise assume it's already a name
  return country;
}

/**
 * Check if two country identifiers match (handles codes vs names)
 * @param {string} country1 - First country (code or name)
 * @param {string} country2 - Second country (code or name) 
 * @return {boolean} - Whether they represent the same country
 */
function countriesMatch(country1, country2) {
  if (!country1 || !country2) return false;
  
  const name1 = normalizeCountryToName(country1);
  const name2 = normalizeCountryToName(country2);
  
  return name1.toLowerCase() === name2.toLowerCase();
}

module.exports = {
  countryCodeToName,
  countryNameToCode,
  getCountryNameFromCode,
  getCountryCodeFromName,
  normalizeCountryToName,
  countriesMatch
};