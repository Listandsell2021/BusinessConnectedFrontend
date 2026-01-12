// Region mapping from short codes to full German and English names
export const regionMapping = {
  bw: { de: 'Baden-Württemberg', en: 'Baden-Württemberg' },
  by: { de: 'Bayern', en: 'Bavaria' },
  be: { de: 'Berlin', en: 'Berlin' },
  bb: { de: 'Brandenburg', en: 'Brandenburg' },
  hb: { de: 'Bremen', en: 'Bremen' },
  hh: { de: 'Hamburg', en: 'Hamburg' },
  he: { de: 'Hessen', en: 'Hesse' },
  mv: { de: 'Mecklenburg-Vorpommern', en: 'Mecklenburg-Vorpommern' },
  ni: { de: 'Niedersachsen', en: 'Lower Saxony' },
  nrw: { de: 'Nordrhein-Westfalen', en: 'North Rhine-Westphalia' },
  rp: { de: 'Rheinland-Pfalz', en: 'Rhineland-Palatinate' },
  sl: { de: 'Saarland', en: 'Saarland' },
  sn: { de: 'Sachsen', en: 'Saxony' },
  st: { de: 'Sachsen-Anhalt', en: 'Saxony-Anhalt' },
  sh: { de: 'Schleswig-Holstein', en: 'Schleswig-Holstein' },
  th: { de: 'Thüringen', en: 'Thuringia' },
  nationwide: { de: 'Bundesweit', en: 'Nationwide' }
};

/**
 * Get the full name of a region in the specified language
 * @param {string} regionCode - The region code (e.g., 'bw', 'by', 'nationwide')
 * @param {string} language - The language ('de' or 'en')
 * @returns {string} - The full region name or the code if not found
 */
export function getRegionName(regionCode, language = 'en') {
  const region = regionMapping[regionCode];
  if (!region) {
    return regionCode; // Return code if mapping not found
  }
  return region[language] || region['en'];
}

/**
 * Get all available regions with their names in both languages
 * @returns {Object} - Object with region codes as keys and {de, en} names as values
 */
export function getAllRegions() {
  return regionMapping;
}

/**
 * Get region names for an array of region codes
 * @param {Array<string>} regionCodes - Array of region codes
 * @param {string} language - The language ('de' or 'en')
 * @returns {Array<string>} - Array of full region names
 */
export function getRegionNames(regionCodes = [], language = 'en') {
  return regionCodes.map(code => getRegionName(code, language));
}

/**
 * Get region codes for a given region name
 * @param {string} regionName - The full region name
 * @param {string} language - The language ('de' or 'en')
 * @returns {string|null} - The region code or null if not found
 */
export function getRegionCode(regionName, language = 'en') {
  for (const [code, names] of Object.entries(regionMapping)) {
    if (names[language] === regionName || names['de'] === regionName || names['en'] === regionName) {
      return code;
    }
  }
  return null;
}
