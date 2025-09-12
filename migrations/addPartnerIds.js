// Migration script to add partnerId to existing partners
const mongoose = require('mongoose');
const Partner = require('../models/Partner');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected for migration');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Generate partner ID (same logic as in the model)
const generatePartnerId = (partnerType) => {
  const typePrefix = partnerType === 'exclusive' ? 'EXC' : 'BAS';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PTR-${typePrefix}-${timestamp}-${random}`;
};

// Migration function
const addPartnerIds = async () => {
  try {
    console.log('🔄 Starting partner ID migration...');
    
    // Find all partners without partnerId
    const partnersWithoutId = await Partner.find({ 
      $or: [
        { partnerId: { $exists: false } },
        { partnerId: null },
        { partnerId: '' }
      ]
    });

    console.log(`📊 Found ${partnersWithoutId.length} partners without partner IDs`);

    if (partnersWithoutId.length === 0) {
      console.log('✅ All partners already have partner IDs');
      return;
    }

    // Update each partner with a unique partner ID
    let updatedCount = 0;
    const usedIds = new Set();

    for (const partner of partnersWithoutId) {
      let newPartnerId;
      let attempts = 0;
      const maxAttempts = 10;

      // Generate unique partner ID with collision detection
      do {
        newPartnerId = generatePartnerId(partner.partnerType);
        attempts++;
        
        if (attempts > maxAttempts) {
          throw new Error(`Failed to generate unique partner ID after ${maxAttempts} attempts`);
        }
      } while (usedIds.has(newPartnerId) || await Partner.findOne({ partnerId: newPartnerId }));

      usedIds.add(newPartnerId);

      // Update the partner
      await Partner.updateOne(
        { _id: partner._id },
        { $set: { partnerId: newPartnerId } }
      );

      updatedCount++;
      console.log(`✓ Updated partner "${partner.companyName}" with ID: ${newPartnerId}`);
      
      // Small delay to ensure timestamp uniqueness
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log(`✅ Migration completed! Updated ${updatedCount} partners`);

    // Verify the migration
    const verifyCount = await Partner.countDocuments({ 
      $or: [
        { partnerId: { $exists: false } },
        { partnerId: null },
        { partnerId: '' }
      ]
    });

    if (verifyCount === 0) {
      console.log('✅ Migration verified: All partners now have partner IDs');
    } else {
      console.log(`⚠️  Warning: ${verifyCount} partners still missing partner IDs`);
    }

    // Show sample of updated partners
    const samplePartners = await Partner.find({}, 'partnerId companyName partnerType').limit(5);
    console.log('\n📋 Sample of partners with IDs:');
    samplePartners.forEach(partner => {
      console.log(`  - ${partner.partnerId}: ${partner.companyName} (${partner.partnerType})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await addPartnerIds();
    console.log('\n🎉 Partner ID migration completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📁 Database connection closed');
    process.exit(0);
  }
};

// Execute if run directly
if (require.main === module) {
  runMigration();
}

module.exports = { addPartnerIds };