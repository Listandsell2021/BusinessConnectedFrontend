// Migration script to convert old multi-service partner documents to new single-service structure
const mongoose = require('mongoose');
require('dotenv').config();

// Old Partner schema structure (for reference)
const OldPartnerSchema = new mongoose.Schema({
  companyName: String,
  contactPerson: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  partnerType: String,
  services: [{
    serviceType: String,
    status: String,
    approvedAt: Date,
    approvedBy: mongoose.Schema.Types.ObjectId,
    rejectedReason: String,
    preferences: Object
  }],
  overallStatus: String,
  metrics: Object,
  notifications: Object,
  password: String,
  lastLogin: Date,
  registeredAt: Date
}, { collection: 'partners' });

// New Partner schema (single service)
const NewPartnerSchema = new mongoose.Schema({
  companyName: String,
  contactPerson: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  partnerType: String,
  serviceType: String,
  status: String,
  approvedAt: Date,
  approvedBy: mongoose.Schema.Types.ObjectId,
  rejectedReason: String,
  preferences: Object,
  metrics: Object,
  notifications: Object,
  password: String,
  lastLogin: Date,
  registeredAt: Date
}, { collection: 'partners' });

const migratePartners = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    console.log('✅ Connected to MongoDB');

    // Get all partners with old structure (having services array)
    const oldPartners = await mongoose.connection.db.collection('partners')
      .find({ services: { $exists: true, $type: 'array' } }).toArray();

    console.log(`📋 Found ${oldPartners.length} partners with old structure`);

    if (oldPartners.length === 0) {
      console.log('✅ No migration needed - all partners already use new structure');
      return;
    }

    const newDocuments = [];
    const oldDocumentIds = [];

    for (const oldPartner of oldPartners) {
      console.log(`🔄 Processing partner: ${oldPartner.companyName} (${oldPartner.contactPerson.email})`);

      // Track old document for deletion
      oldDocumentIds.push(oldPartner._id);

      // Create new documents for each service
      for (const service of oldPartner.services) {
        const newPartner = {
          companyName: oldPartner.companyName,
          contactPerson: oldPartner.contactPerson,
          address: oldPartner.address,
          partnerType: oldPartner.partnerType,
          serviceType: service.serviceType,
          status: service.status,
          approvedAt: service.approvedAt,
          approvedBy: service.approvedBy,
          rejectedReason: service.rejectedReason,
          preferences: service.preferences || {
            serviceAreas: [],
            radius: 50,
            maxLeadsPerWeek: 10,
            workingHours: {
              monday: { start: '09:00', end: '17:00', available: true },
              tuesday: { start: '09:00', end: '17:00', available: true },
              wednesday: { start: '09:00', end: '17:00', available: true },
              thursday: { start: '09:00', end: '17:00', available: true },
              friday: { start: '09:00', end: '17:00', available: true },
              saturday: { start: '09:00', end: '17:00', available: false },
              sunday: { start: '09:00', end: '17:00', available: false }
            }
          },
          metrics: oldPartner.metrics || {
            totalLeadsReceived: 0,
            totalLeadsAccepted: 0,
            totalLeadsCancelled: 0,
            totalRevenue: 0,
            averageResponseTime: 0,
            rating: 0
          },
          notifications: oldPartner.notifications || {
            email: true,
            sms: false
          },
          password: oldPartner.password,
          lastLogin: oldPartner.lastLogin,
          registeredAt: oldPartner.registeredAt || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Generate new partnerId with service type
        const typePrefix = newPartner.partnerType === 'exclusive' ? 'EXC' : 'BAS';
        const servicePrefix = newPartner.serviceType === 'moving' ? 'MOV' : 'CLN';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 3).toUpperCase();
        newPartner.partnerId = `PTR${typePrefix}${servicePrefix}${random}`;

        newDocuments.push(newPartner);
        console.log(`  ➕ Created ${service.serviceType} service document (${service.status})`);
      }
    }

    if (newDocuments.length > 0) {
      // Insert new documents
      console.log(`\n💾 Inserting ${newDocuments.length} new partner service documents...`);
      const insertResult = await mongoose.connection.db.collection('partners').insertMany(newDocuments);
      console.log(`✅ Successfully inserted ${insertResult.insertedCount} new documents`);

      // Remove old documents
      console.log(`\n🗑️  Removing ${oldDocumentIds.length} old partner documents...`);
      const deleteResult = await mongoose.connection.db.collection('partners').deleteMany({
        _id: { $in: oldDocumentIds }
      });
      console.log(`✅ Successfully removed ${deleteResult.deletedCount} old documents`);

      console.log('\n📊 Migration Summary:');
      console.log(`   • Old partners processed: ${oldPartners.length}`);
      console.log(`   • New service documents created: ${insertResult.insertedCount}`);
      console.log(`   • Old documents removed: ${deleteResult.deletedCount}`);
      console.log('\n✅ Migration completed successfully!');
      console.log('\n⚠️  Users will need to login again as JWT tokens have changed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migratePartners()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migratePartners;