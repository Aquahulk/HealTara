// ============================================================================
// 🏥 LIVE HOSPITAL SEEDER
// ============================================================================
// Run this script on your live server to create sample hospitals
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedLiveHospitals() {
  console.log('🌱 Seeding Live Hospitals...\n');

  try {
    // 1. Create hospital admin user if needed
    let hospitalAdmin;
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@healtara.com' }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      hospitalAdmin = await prisma.user.create({
        data: {
          email: 'admin@healtara.com',
          password: hashedPassword,
          role: 'HOSPITAL_ADMIN'
        }
      });
      console.log('✅ Created hospital admin:', hospitalAdmin.email);
    } else {
      hospitalAdmin = existingAdmin;
      console.log('✅ Using existing hospital admin:', hospitalAdmin.email);
    }

    // 2. Create sample hospitals
    const sampleHospitals = [
      {
        name: 'Healtara General Hospital',
        address: '123 Healthcare Avenue, Medical District',
        city: 'Mumbai',
        state: 'Maharashtra',
        phone: '+91-22-1234-5678'
      },
      {
        name: 'City Medical Center',
        address: '456 Wellness Boulevard, Downtown',
        city: 'Delhi',
        state: 'Delhi NCR',
        phone: '+91-11-9876-5432'
      },
      {
        name: 'Apollo Hospitals',
        address: '789 Apollo Road, Jubilee Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        phone: '+91-40-2345-6789'
      },
      {
        name: 'Fortis Healthcare',
        address: '321 Fortis Street, Sector 32',
        city: 'Gurgaon',
        state: 'Haryana',
        phone: '+91-124-4567-8901'
      },
      {
        name: 'Max Super Specialty Hospital',
        address: '654 Max Avenue, Saket',
        city: 'New Delhi',
        state: 'Delhi',
        phone: '+91-11-3456-7890'
      }
    ];

    console.log(`📋 Creating ${sampleHospitals.length} hospitals...`);
    
    for (let i = 0; i < sampleHospitals.length; i++) {
      const hospitalData = sampleHospitals[i];
      
      // Check if hospital already exists
      const existing = await prisma.hospital.findFirst({
        where: { name: hospitalData.name }
      });

      if (!existing) {
        const hospital = await prisma.hospital.create({
          data: {
            ...hospitalData,
            adminId: hospitalAdmin.id
          }
        });
        console.log(`✅ Created: ${hospital.name} (ID: ${hospital.id})`);
      } else {
        console.log(`ℹ️  Already exists: ${existing.name} (ID: ${existing.id})`);
      }
    }

    // 3. Verify creation
    const totalHospitals = await prisma.hospital.count();
    console.log(`\n📊 Total hospitals after seeding: ${totalHospitals}`);

    // 4. List all hospitals
    const allHospitals = await prisma.hospital.findMany({
      select: { id: true, name: true, city: true }
    });

    console.log('\n📋 Available Hospitals:');
    allHospitals.forEach(h => {
      console.log(`  - ID: ${h.id}, Name: "${h.name}", City: ${h.city}`);
    });

    console.log('\n🌱 Seeding complete!');
    console.log('🌐 Test URLs:');
    allHospitals.forEach(h => {
      console.log(`  - https://yourdomain.com/hospital-site/${h.id}`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedLiveHospitals();
