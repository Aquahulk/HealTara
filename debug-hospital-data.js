// ============================================================================
// 🔍 LIVE WEBSITE DEBUGGING HELPER
// ============================================================================
// This script helps debug hospital data issues on live website
// Run this on your live server to check hospital data
// ============================================================================

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client (adjust connection string as needed)
const prisma = new PrismaClient();

async function debugHospitalData() {
  console.log('🔍 Starting Hospital Data Debug...\n');

  try {
    // 1. Check if hospital ID 8 exists
    console.log('📋 Checking Hospital ID 8...');
    const hospital = await prisma.hospital.findUnique({
      where: { id: 8 },
      include: {
        profile: true,
        _count: {
          select: {
            doctors: true
          }
        }
      }
    });

    if (hospital) {
      console.log('✅ Hospital 8 found:', {
        id: hospital.id,
        name: hospital.name,
        hasProfile: !!hospital.profile,
        doctorCount: hospital._count.doctors,
        profileKeys: hospital.profile ? Object.keys(hospital.profile) : []
      });
    } else {
      console.log('❌ Hospital 8 NOT FOUND');
    }

    // 2. List all available hospitals
    console.log('\n📋 All Available Hospitals:');
    const allHospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        name: true,
        adminId: true,
        createdAt: true
      },
      orderBy: { id: 'asc' }
    });

    if (allHospitals.length === 0) {
      console.log('❌ No hospitals found in database');
    } else {
      console.log(`✅ Found ${allHospitals.length} hospitals:`);
      allHospitals.forEach(h => {
        console.log(`  - ID: ${h.id}, Name: "${h.name}", Admin: ${h.adminId}, Created: ${h.createdAt}`);
      });
    }

    // 3. Check hospital-site route configuration
    console.log('\n📋 Checking Hospital Site Routes...');
    console.log('Expected URL pattern: /hospital-site/[id]');
    console.log('Test URLs:');
    allHospitals.forEach(h => {
      console.log(`  - http://your-domain.com/hospital-site/${h.id}`);
    });

    // 4. Check for any data inconsistencies
    console.log('\n📋 Data Consistency Check:');
    const hospitalsWithProfile = await prisma.hospital.findMany({
      where: {
        profile: {
          not: null
        }
      },
      select: { id: true, name: true }
    });

    console.log(`✅ ${hospitalsWithProfile.length} hospitals have profiles`);
    hospitalsWithProfile.forEach(h => {
      console.log(`  - ID: ${h.id}, Name: "${h.name}"`);
    });

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔍 Debug complete');
  }
}

// Run the debug function
debugHospitalData();
