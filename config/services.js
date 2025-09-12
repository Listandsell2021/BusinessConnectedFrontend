// Dynamic Service Configuration - Simple and Easy
const SERVICES = {
  MOVING: 'moving',
  CLEANING: 'cleaning'
};

const serviceConfig = {
  [SERVICES.MOVING]: {
    name: 'Moving Services',
    domain: 'umzug-anbieter-vergleich.de',
    providerCount: 110,
    fields: [
      { name: 'movingType', label: 'Moving Type', type: 'select', required: true },
      { name: 'pickupAddress', label: 'Pickup Address', type: 'text', required: true },
      { name: 'destinationAddress', label: 'Destination Address', type: 'text', required: true },
      { name: 'buildingType', label: 'Building Type', type: 'select', required: true },
      { name: 'roomCount', label: 'Number of Rooms', type: 'number', required: true },
      { name: 'elevatorAvailable', label: 'Elevator Available', type: 'boolean', required: false },
      { name: 'additionalServices', label: 'Additional Services', type: 'array', required: false },
      { name: 'moveDate', label: 'Move Date', type: 'date', required: false },
      { name: 'timeframe', label: 'Timeframe', type: 'select', required: false },
      { name: 'salutation', label: 'Salutation', type: 'select', required: true },
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone Number', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'preferredContactTime', label: 'Preferred Contact Time', type: 'select', required: false }
    ]
  },

  [SERVICES.CLEANING]: {
    name: 'Cleaning Services',
    domain: 'reinigungsfirma-vergleich.de',
    providerCount: 244,
    fields: [
      { name: 'locationType', label: 'Location Type', type: 'select', required: true },
      { name: 'frequency', label: 'Cleaning Frequency', type: 'select', required: true },
      { name: 'venueType', label: 'Venue Type', type: 'select', required: true },
      { name: 'serviceTypes', label: 'Service Types', type: 'array', required: true },
      { name: 'startDate', label: 'Start Date', type: 'select', required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'areaSize', label: 'Area Size', type: 'select', required: true },
      { name: 'salutation', label: 'Salutation', type: 'select', required: true },
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone Number', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true }
    ]
  }
};

// Helper functions
function getService(serviceType) {
  return serviceConfig[serviceType] || null;
}

function getAllServices() {
  return serviceConfig;
}

function getServiceByDomain(domain) {
  for (const [key, service] of Object.entries(serviceConfig)) {
    if (service.domain === domain) {
      return { type: key, ...service };
    }
  }
  return null;
}

module.exports = {
  SERVICES,
  serviceConfig,
  getService,
  getAllServices,
  getServiceByDomain
};