// ============================================================================
// 🔍 LIVE WEBSITE HOSPITAL DEBUGGER
// ============================================================================
// Run this script on your live server to check hospital data
// ============================================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugLiveHospitals() {
  console.log('🔍 Checking Live Hospital Data...\n');

  try {
    // 1. Check total hospital count
    const totalHospitals = await prisma.hospital.count();
    console.log(`📊 Total hospitals in database: ${totalHospitals}`);

    // 2. List all hospitals
    const allHospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        phone: true,
        createdAt: true,
        adminId: true
      },
      orderBy: { id: 'asc' }
    });

    if (allHospitals.length === 0) {
      console.log('❌ NO HOSPITALS FOUND - This is the issue!');
      console.log('\n🌱 SOLUTION: Run the hospital seeder script');
      return;
    }

    console.log(`\n📋 Found ${allHospitals.length} hospitals:`);
    allHospitals.forEach((hospital, index) => {
      console.log(`  ${index + 1}. ID: ${hospital.id}, Name: "${hospital.name}"`);
      console.log(`     Address: ${hospital.address || 'N/A'}`);
      console.log(`     City: ${hospital.city || 'N/A'}`);
      console.log(`     Admin ID: ${hospital.adminId || 'N/A'}`);
      console.log(`     Created: ${hospital.createdAt}`);
      console.log('');
    });

    // 3. Test API endpoint directly
    console.log('🌐 Testing API endpoint...');
    try {
      const testHospitals = await prisma.hospital.findMany({
        include: {
          doctors: true
        },
        take: 12
      });
      console.log(`✅ API query successful: ${testHospitals.length} hospitals returned`);
    } catch (apiError) {
      console.log('❌ API query failed:', apiError.message);
    }

    // 4. Check for any data issues
    console.log('\n🔍 Data Quality Check:');
    const hospitalsWithoutAdmin = allHospitals.filter(h => !h.adminId);
    const hospitalsWithoutName = allHospitals.filter(h => !h.name || h.name.trim() === '');
    
    if (hospitalsWithoutAdmin.length > 0) {
      console.log(`⚠️  ${hospitalsWithoutAdmin.length} hospitals without admin ID`);
    }
    
    if (hospitalsWithoutName.length > 0) {
      console.log(`⚠️  ${hospitalsWithoutName.length} hospitals without name`);
    }

    if (hospitalsWithoutAdmin.length === 0 && hospitalsWithoutName.length === 0) {
      console.log('✅ All hospitals have required data');
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔍 Debug complete');
  }
}

// Run the debug function
debugLiveHospitals();
