// Script to fix database indexes for the new partner structure
const mongoose = require('mongoose');
require('dotenv').config();

const fixIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('partners');

    // Get current indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('📋 Current indexes:');
    indexes.forEach(index => console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`));

    // Drop the old unique email index if it exists
    try {
      await collection.dropIndex('contactPerson.email_1');
      console.log('🗑️  Dropped old contactPerson.email_1 index');
    } catch (error) {
      console.log('ℹ️  contactPerson.email_1 index does not exist (already dropped)');
    }

    // Create new compound unique index for email + serviceType
    try {
      await collection.createIndex(
        { 'contactPerson.email': 1, serviceType: 1 },
        { unique: true, name: 'email_service_unique' }
      );
      console.log('✅ Created new compound unique index: email + serviceType');
    } catch (error) {
      console.log('ℹ️  Compound index already exists:', error.message);
    }

    // Create other useful indexes
    const indexesToCreate = [
      { key: { status: 1 }, name: 'status_1' },
      { key: { serviceType: 1 }, name: 'serviceType_1' },
      { key: { partnerType: 1 }, name: 'partnerType_1' },
      { key: { companyName: 1, serviceType: 1 }, name: 'company_service_1' }
    ];

    for (const indexSpec of indexesToCreate) {
      try {
        await collection.createIndex(indexSpec.key, { name: indexSpec.name });
        console.log(`✅ Created index: ${indexSpec.name}`);
      } catch (error) {
        console.log(`ℹ️  Index ${indexSpec.name} already exists`);
      }
    }

    // List final indexes
    const finalIndexes = await collection.listIndexes().toArray();
    console.log('\n📋 Final indexes:');
    finalIndexes.forEach(index => console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`));

    console.log('\n✅ Database indexes fixed successfully!');

  } catch (error) {
    console.error('❌ Failed to fix indexes:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  fixIndexes()
    .then(() => {
      console.log('🎉 Index fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Index fix failed:', error);
      process.exit(1);
    });
}

module.exports = fixIndexes;