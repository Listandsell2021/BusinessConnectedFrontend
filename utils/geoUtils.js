// Geographic Utilities for Distance Calculations
const axios = require('axios');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  // Validate inputs
  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
    throw new Error('Invalid coordinates provided');
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number}
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate coordinate values
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lng - Longitude (-180 to 180)
 * @returns {boolean}
 */
function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Check if a lead location is within partner's service radius
 * @param {Object} leadCoords - Lead coordinates {lat, lng}
 * @param {Object} partnerCity - Partner city with coordinates {name, coordinates: {lat, lng}, radius}
 * @returns {Object} {isWithinRadius: boolean, distance: number}
 */
function isWithinServiceRadius(leadCoords, partnerCity) {
  try {
    if (!leadCoords || !partnerCity.coordinates) {
      return { isWithinRadius: false, distance: null, reason: 'Missing coordinates' };
    }

    const distance = calculateDistance(
      leadCoords.lat,
      leadCoords.lng,
      partnerCity.coordinates.lat,
      partnerCity.coordinates.lng
    );

    const radius = partnerCity.radius || 0;
    const isWithinRadius = distance <= radius;

    return {
      isWithinRadius,
      distance,
      radius,
      cityName: partnerCity.name,
      reason: isWithinRadius ? 'Within service area' : `Distance ${distance}km exceeds radius ${radius}km`
    };
  } catch (error) {
    return { 
      isWithinRadius: false, 
      distance: null, 
      reason: `Calculation error: ${error.message}` 
    };
  }
}

/**
 * Geocode address to coordinates using OpenStreetMap Nominatim API
 * @param {string} address - Full address string
 * @param {string} city - City name
 * @param {string} country - Country name
 * @returns {Promise<Object>} {lat, lng, address}
 */
async function geocodeAddress(address, city = '', country = 'Germany') {
  try {
    // Build query string - prefer full address, fallback to city
    const query = address || `${city}, ${country}`;
    
    if (!query.trim()) {
      throw new Error('No address or city provided for geocoding');
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        countrycodes: country === 'Germany' ? 'de' : '', // Optimize for Germany
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'Leadform-CRM/1.0' // Required by Nominatim
      },
      timeout: 5000
    });

    if (!response.data || response.data.length === 0) {
      throw new Error(`No coordinates found for address: ${query}`);
    }

    const result = response.data[0];
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || city,
      country: result.address?.country || country
    };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    throw new Error(`Geocoding failed: ${error.message}`);
  }
}

/**
 * Batch geocode multiple addresses
 * @param {Array} addresses - Array of address strings
 * @returns {Promise<Array>} Array of geocoding results
 */
async function batchGeocode(addresses) {
  const results = [];
  
  for (const address of addresses) {
    try {
      // Add delay to respect rate limits (1 request per second for Nominatim)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await geocodeAddress(address);
      results.push({ address, success: true, ...result });
    } catch (error) {
      results.push({ address, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Get city coordinates (cached common cities for better performance)
 * @param {string} cityName 
 * @param {string} country 
 * @returns {Promise<Object>}
 */
async function getCityCoordinates(cityName, country = 'Germany') {
  // Cache common German cities to reduce API calls
  const commonCities = {
    'Berlin': { lat: 52.5200, lng: 13.4050 },
    'Munich': { lat: 48.1351, lng: 11.5820 },
    'Frankfurt': { lat: 50.1109, lng: 8.6821 },
    'Hamburg': { lat: 53.5511, lng: 9.9937 },
    'Cologne': { lat: 50.9375, lng: 6.9603 },
    'Stuttgart': { lat: 48.7758, lng: 9.1829 },
    'Düsseldorf': { lat: 51.2277, lng: 6.7735 },
    'Dortmund': { lat: 51.5136, lng: 7.4653 },
    'Essen': { lat: 51.4556, lng: 7.0116 },
    'Leipzig': { lat: 51.3397, lng: 12.3731 },
    'Bremen': { lat: 53.0793, lng: 8.8017 },
    'Dresden': { lat: 51.0504, lng: 13.7373 },
    'Hannover': { lat: 52.3759, lng: 9.7320 },
    'Nuremberg': { lat: 49.4521, lng: 11.0767 },
    'Duisburg': { lat: 51.4344, lng: 6.7623 }
  };

  const cityKey = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
  
  if (country === 'Germany' && commonCities[cityKey]) {
    return commonCities[cityKey];
  }

  // Fallback to geocoding API
  return await geocodeAddress(`${cityName}, ${country}`);
}

module.exports = {
  calculateDistance,
  isWithinServiceRadius,
  geocodeAddress,
  batchGeocode,
  getCityCoordinates,
  isValidCoordinate
};