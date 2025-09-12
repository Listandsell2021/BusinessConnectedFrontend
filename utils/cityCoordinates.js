// City coordinates for distance calculations
// Major cities in Europe with their latitude and longitude

const cityCoordinates = {
  // Germany
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Munich': { lat: 48.1351, lng: 11.5820 },
  'Hamburg': { lat: 53.5511, lng: 9.9937 },
  'Cologne': { lat: 50.9375, lng: 6.9603 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Stuttgart': { lat: 48.7758, lng: 9.1829 },
  'Düsseldorf': { lat: 51.2277, lng: 6.7735 },
  'Dortmund': { lat: 51.5136, lng: 7.4653 },
  'Essen': { lat: 51.4556, lng: 7.0116 },
  'Leipzig': { lat: 51.3397, lng: 12.3731 },
  'Bremen': { lat: 53.0793, lng: 8.8017 },
  'Dresden': { lat: 51.0504, lng: 13.7373 },
  'Hanover': { lat: 52.3759, lng: 9.7320 },
  'Nuremberg': { lat: 49.4521, lng: 11.0767 },
  'Duisburg': { lat: 51.4344, lng: 6.7623 },
  'Bochum': { lat: 51.4818, lng: 7.2162 },
  'Wuppertal': { lat: 51.2562, lng: 7.1508 },
  'Bielefeld': { lat: 52.0302, lng: 8.5325 },
  'Bonn': { lat: 50.7374, lng: 7.0982 },
  'Münster': { lat: 51.9607, lng: 7.6261 },

  // Austria
  'Vienna': { lat: 48.2082, lng: 16.3738 },
  'Salzburg': { lat: 47.8095, lng: 13.0550 },
  'Innsbruck': { lat: 47.2692, lng: 11.4041 },
  'Graz': { lat: 47.0707, lng: 15.4395 },
  'Linz': { lat: 48.3069, lng: 14.2858 },

  // Switzerland
  'Zurich': { lat: 47.3769, lng: 8.5417 },
  'Geneva': { lat: 46.2044, lng: 6.1432 },
  'Basel': { lat: 47.5596, lng: 7.5886 },
  'Bern': { lat: 46.9481, lng: 7.4474 },
  'Lausanne': { lat: 46.5197, lng: 6.6323 },

  // Netherlands
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Rotterdam': { lat: 51.9244, lng: 4.4777 },
  'The Hague': { lat: 52.0705, lng: 4.3007 },
  'Utrecht': { lat: 52.0907, lng: 5.1214 },
  'Eindhoven': { lat: 51.4416, lng: 5.4697 },

  // Belgium
  'Brussels': { lat: 50.8503, lng: 4.3517 },
  'Antwerp': { lat: 51.2194, lng: 4.4025 },
  'Ghent': { lat: 51.0543, lng: 3.7174 },
  'Charleroi': { lat: 50.4108, lng: 4.4446 },
  'Liège': { lat: 50.6326, lng: 5.5797 },

  // France
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Toulouse': { lat: 43.6047, lng: 1.4442 },
  'Nice': { lat: 43.7102, lng: 7.2620 },
  'Nantes': { lat: 47.2184, lng: -1.5536 },
  'Strasbourg': { lat: 48.5734, lng: 7.7521 },
  'Montpellier': { lat: 43.6110, lng: 3.8767 },

  // Italy
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'Milan': { lat: 45.4642, lng: 9.1900 },
  'Naples': { lat: 40.8518, lng: 14.2681 },
  'Turin': { lat: 45.0703, lng: 7.6869 },
  'Palermo': { lat: 38.1157, lng: 13.3615 },
  'Genoa': { lat: 44.4056, lng: 8.9463 },
  'Bologna': { lat: 44.4949, lng: 11.3426 },
  'Florence': { lat: 43.7696, lng: 11.2558 },

  // Spain
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Valencia': { lat: 39.4699, lng: -0.3763 },
  'Seville': { lat: 37.3886, lng: -5.9823 },
  'Zaragoza': { lat: 41.6488, lng: -0.8891 },
  'Málaga': { lat: 36.7213, lng: -4.4214 },

  // United Kingdom
  'London': { lat: 51.5074, lng: -0.1278 },
  'Birmingham': { lat: 52.4862, lng: -1.8904 },
  'Manchester': { lat: 53.4808, lng: -2.2426 },
  'Glasgow': { lat: 55.8642, lng: -4.2518 },
  'Liverpool': { lat: 53.4084, lng: -2.9916 },
  'Leeds': { lat: 53.8008, lng: -1.5491 },

  // Poland
  'Warsaw': { lat: 52.2297, lng: 21.0122 },
  'Krakow': { lat: 50.0647, lng: 19.9450 },
  'Gdansk': { lat: 54.3520, lng: 18.6466 },
  'Wroclaw': { lat: 51.1079, lng: 17.0385 },
  'Poznan': { lat: 52.4064, lng: 16.9252 }
};

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point  
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance);
}

/**
 * Get distance between two cities
 * @param {string} city1 - First city name
 * @param {string} city2 - Second city name
 * @returns {number|null} - Distance in kilometers or null if coordinates not found
 */
function getDistanceBetweenCities(city1, city2) {
  const coords1 = getCityCoordinates(city1);
  const coords2 = getCityCoordinates(city2);
  
  if (!coords1 || !coords2) {
    return null;
  }
  
  return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
}

/**
 * Get coordinates for a city (case-insensitive)
 * @param {string} cityName - City name
 * @returns {object|null} - Coordinates object with lat/lng or null if not found
 */
function getCityCoordinates(cityName) {
  if (!cityName) return null;
  
  // Try exact match first
  if (cityCoordinates[cityName]) {
    return cityCoordinates[cityName];
  }
  
  // Try case-insensitive match
  const normalizedCityName = cityName.trim();
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (city.toLowerCase() === normalizedCityName.toLowerCase()) {
      return coords;
    }
  }
  
  return null;
}

/**
 * Check if a city is within radius of another city
 * @param {string} partnerCity - Partner's configured city
 * @param {string} leadCity - Lead's city
 * @param {number} radiusKm - Radius in kilometers (0 = exact match only)
 * @returns {boolean} - Whether leadCity is within radius of partnerCity
 */
function isCityWithinRadius(partnerCity, leadCity, radiusKm) {
  // If radius is 0, require exact match
  if (radiusKm === 0) {
    return partnerCity.toLowerCase() === leadCity.toLowerCase();
  }
  
  // Calculate actual distance
  const distance = getDistanceBetweenCities(partnerCity, leadCity);
  
  // If we can't calculate distance (missing coordinates), fall back to name matching
  if (distance === null) {
    console.warn(`Distance calculation failed between ${partnerCity} and ${leadCity} - falling back to name matching`);
    return partnerCity.toLowerCase().includes(leadCity.toLowerCase()) || 
           leadCity.toLowerCase().includes(partnerCity.toLowerCase());
  }
  
  return distance <= radiusKm;
}

module.exports = {
  cityCoordinates,
  calculateDistance,
  getDistanceBetweenCities,
  getCityCoordinates,
  isCityWithinRadius
};