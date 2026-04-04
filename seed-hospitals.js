// ============================================================================
// 🏥 HOSPITAL DATABASE SEED - Add sample hospitals to your database
// ============================================================================

console.log('🏥 Seeding Hospitals Database...');

async function seedHospitals() {
  try {
    // Import Prisma client
    const { prisma } = require('./apps/api/src/db');
    
    console.log('📊 Connected to database');

    // Sample hospitals to add
    const sampleHospitals = [
      {
        name: "City General Hospital",
        address: "123 Main Street, Downtown",
        city: "New York",
        state: "NY",
        phone: "+1-555-0123",
        subdomain: "citygeneral",
        profile: {
          general: {
            tagline: "Your Health, Our Priority",
            description: "Comprehensive healthcare services for the community"
          }
        }
      },
      {
        name: "Memorial Medical Center",
        address: "456 Oak Avenue",
        city: "Los Angeles", 
        state: "CA",
        phone: "+1-555-0456",
        subdomain: "memorial",
        profile: {
          general: {
            tagline: "Excellence in Healthcare",
            description: "Advanced medical care with cutting-edge technology"
          }
        }
      },
      {
        name: "St. Mary's Hospital",
        address: "789 Pine Street",
        city: "Chicago",
        state: "IL", 
        phone: "+1-555-0789",
        subdomain: "stmarys",
        profile: {
          general: {
            tagline: "Compassionate Care",
            description: "Patient-centered healthcare with a personal touch"
          }
        }
      },
      {
        name: "Regional Health Center",
        address: "321 Elm Road",
        city: "Houston",
        state: "TX",
        phone: "+1-555-0321", 
        subdomain: "regional",
        profile: {
          general: {
            tagline: "Community Healthcare",
            description: "Serving our community with quality medical care"
          }
        }
      }
    ];

    console.log(`📝 Adding ${sampleHospitals.length} hospitals to database...`);

    // Add hospitals to database
    for (const hospitalData of sampleHospitals) {
      try {
        // Check if hospital already exists
        const existing = await prisma.hospital.findFirst({
          where: { name: hospitalData.name }
        });

        if (existing) {
          console.log(`⚠️  Hospital "${hospitalData.name}" already exists, skipping...`);
          continue;
        }

        const hospital = await prisma.hospital.create({
          data: hospitalData
        });

        console.log(`✅ Created hospital: ${hospital.name} (ID: ${hospital.id})`);
      } catch (error) {
        console.error(`❌ Failed to create hospital "${hospitalData.name}":`, error);
      }
    }

    // Check final count
    const totalHospitals = await prisma.hospital.count();
    console.log(`\n🎉 Database now contains ${totalHospitals} hospitals!`);

    // List all hospitals
    const allHospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        createdAt: true
      }
    });

    console.log('\n📋 Hospitals in database:');
    allHospitals.forEach((hospital, index) => {
      console.log(`  ${index + 1}. ${hospital.name} - ${hospital.city}, ${hospital.state}`);
    });

  } catch (error) {
    console.error('❌ Database seeding error:', error);
    
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n🔧 Database Connection Issue:');
      console.log('1. Make sure your DATABASE_URL environment variable is set');
      console.log('2. Check that your PostgreSQL database is running');
      console.log('3. Verify the database connection string is correct');
    }
  } finally {
    try {
      const { prisma } = require('./apps/api/src/db');
      await prisma.$disconnect();
      console.log('\n🔌 Disconnected from database');
    } catch (error) {
      console.log('⚠️  Could not disconnect from database:', error);
    }
  }
}

// Run the seed
seedHospitals();

console.log('\n🎯 Instructions:');
console.log('1. Make sure your DATABASE_URL is set in .env file');
console.log('2. Run: node seed-hospitals.js');
console.log('3. Start your dev server: npm run dev');
console.log('4. Visit http://localhost:3000 to see real hospitals!');

console.log('\n🚀 HOSPITALS SEEDED!');
console.log('Your database now has real hospital data! 🏥✨');
