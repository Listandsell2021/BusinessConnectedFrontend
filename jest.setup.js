const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';

// Override process.exit in test environment to prevent database connection from killing tests
const originalExit = process.exit;
process.exit = jest.fn();

let mongoServer;

// Global test data factory
global.createTestData = {
  lead: (overrides = {}) => ({
    user: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+49 30 12345678'
    },
    serviceType: 'cleaning',
    sourceDomain: 'reinigungsfirma-vergleich.de',
    formData: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+49 30 12345678',
      address: 'Test Street 123, Berlin',
      serviceType: 'cleaning',
      propertySize: '100',
      cleaningType: 'regular',
      frequency: 'weekly'
    },
    location: {
      street: 'Test Street 123',
      city: 'Berlin',
      zipCode: '10115',
      country: 'Germany'
    },
    status: 'pending',
    partner: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  partner: (overrides = {}) => ({
    companyName: 'Test Partner GmbH',
    email: 'partner@example.com',
    phone: '+49 30 87654321',
    password: 'TestPassword123!',
    contactPerson: {
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max@testpartner.de',
      phone: '+49 30 87654321'
    },
    address: {
      street: 'Partner Street 456',
      city: 'Berlin',
      zipCode: '10117',
      country: 'Germany'
    },
    services: ['cleaning'],
    status: 'active',
    businessHours: {
      monday: { start: '09:00', end: '17:00', isOpen: true },
      tuesday: { start: '09:00', end: '17:00', isOpen: true },
      wednesday: { start: '09:00', end: '17:00', isOpen: true },
      thursday: { start: '09:00', end: '17:00', isOpen: true },
      friday: { start: '09:00', end: '17:00', isOpen: true },
      saturday: { start: '09:00', end: '13:00', isOpen: true },
      sunday: { start: '09:00', end: '13:00', isOpen: false }
    },
    preferences: {
      maxRadius: 25,
      maxLeadsPerDay: 10,
      preferredServices: ['cleaning']
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  user: (overrides = {}) => ({
    firstName: 'Test',
    lastName: 'User',
    email: 'test.user@example.com',
    phone: '+49 30 11111111',
    password: 'TestPassword123!',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })
};

// Setup MongoDB Memory Server before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up database before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Close database connection and stop server after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});