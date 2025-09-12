// Script to verify the migration was successful
const mongoose = require('mongoose');
require('dotenv').config();

const verifyMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const partnersCollection = db.collection('partners');

    // Get all partner documents
    const partners = await partnersCollection.find({}).toArray();
    
    console.log('\n📊 Current Partner Documents in Database:');
    console.log('==========================================');

    if (partners.length === 0) {
      console.log('❌ No partner documents found!');
      return;
    }

    // Group partners by email to show the structure
    const partnersByEmail = {};
    
    partners.forEach(partner => {
      const email = partner.contactPerson.email;
      if (!partnersByEmail[email]) {
        partnersByEmail[email] = {
          companyName: partner.companyName,
          services: []
        };
      }
      
      partnersByEmail[email].services.push({
        serviceType: partner.serviceType,
        status: partner.status,
        partnerId: partner.partnerId,
        _id: partner._id.toString()
      });
    });

    // Display the results
    let totalPartners = 0;
    let totalServices = 0;

    for (const [email, data] of Object.entries(partnersByEmail)) {
      totalPartners++;
      console.log(`\n🏢 Company: ${data.companyName}`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔧 Services:`);
      
      data.services.forEach(service => {
        totalServices++;
        const statusIcon = service.status === 'active' ? '✅' : 
                          service.status === 'pending' ? '⏳' : 
                          service.status === 'rejected' ? '❌' : '⚠️';
        
        console.log(`   ${statusIcon} ${service.serviceType.toUpperCase()}: ${service.status}`);
        console.log(`      Partner ID: ${service.partnerId}`);
        console.log(`      Document ID: ${service._id}`);
      });
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   • Unique companies: ${totalPartners}`);
    console.log(`   • Total service documents: ${totalServices}`);
    console.log(`   • Service documents per company: ${(totalServices / totalPartners).toFixed(1)}`);

    // Check for any old structure documents (should be none)
    const oldStructureDocs = await partnersCollection.find({ 
      services: { $exists: true, $type: 'array' } 
    }).toArray();

    if (oldStructureDocs.length > 0) {
      console.log(`\n⚠️  Found ${oldStructureDocs.length} documents with old structure!`);
    } else {
      console.log('\n✅ All documents use the new single-service structure');
    }

    // Check indexes
    const indexes = await partnersCollection.listIndexes().toArray();
    const hasEmailServiceIndex = indexes.some(index => 
      index.name === 'email_service_unique' || 
      index.name === 'contactPerson.email_1_serviceType_1'
    );

    if (hasEmailServiceIndex) {
      console.log('✅ Email + Service unique index is present');
    } else {
      console.log('⚠️  Email + Service unique index is missing');
    }

    console.log('\n🎉 Migration verification complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Clear browser localStorage');
    console.log('   2. Login again with service selection');
    console.log('   3. Test service-specific authentication');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run verification if this file is executed directly
if (require.main === module) {
  verifyMigration()
    .then(() => {
      console.log('🎯 Verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = verifyMigration;