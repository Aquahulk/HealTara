// Test script to verify doctor linking functionality
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:your_password@localhost:5432/healtara'
    }
  }
});

async function testDoctorLinking() {
  console.log('🔍 Testing Doctor Linking Functionality\n');

  try {
    // 1. Find an approved doctor with a doctor code
    console.log('1️⃣ Looking for approved doctors with doctor codes...');
    const approvedDoctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        doctorProfile: {
          verificationStatus: 'APPROVED'
        }
      },
      include: {
        doctorProfile: true
      },
      take: 3
    });

    if (approvedDoctors.length === 0) {
      console.log('❌ No approved doctors with doctor codes found');
      console.log('   Creating a test doctor...\n');
      
      // Create a test doctor
      const testDoctor = await prisma.user.create({
        data: {
          email: `test.doctor.${Date.now()}@example.com`,
          password: 'hashed_password',
          role: 'DOCTOR'
        }
      });
      
      const doctorCode = `HLT-DOC-${String(Date.now()).slice(-6)}`;
      const doctorProfile = await prisma.doctorProfile.create({
        data: {
          userId: testDoctor.id,
          clinicName: 'Test Doctor Clinic',
          specialization: 'General Medicine',
          slug: `test-doctor-${testDoctor.id}`,
          verificationStatus: 'APPROVED',
          doctorCode: doctorCode
        }
      });
      
      approvedDoctors.push({
        ...testDoctor,
        doctorProfile
      });
      
      console.log(`✅ Created test doctor with code: ${doctorCode}`);
    } else {
      console.log(`✅ Found ${approvedDoctors.length} approved doctors with codes:`);
      approvedDoctors.forEach(doc => {
        console.log(`   - ${doc.doctorCode}: ${doc.email} (${doc.doctorProfile?.specialization || 'N/A'})`);
      });
    }

    // 2. Find a hospital
    console.log('\n2️⃣ Looking for hospitals...');
    const hospitals = await prisma.hospital.findMany({
      include: {
        doctors: {
          include: {
            doctor: {
              include: {
                doctorProfile: true
              }
            },
            department: true
          }
        },
        departments: true
      },
      take: 2
    });

    if (hospitals.length === 0) {
      console.log('❌ No hospitals found');
      return;
    }

    console.log(`✅ Found ${hospitals.length} hospitals:`);
    hospitals.forEach(h => {
      console.log(`   - ${h.name} (ID: ${h.id})`);
      console.log(`     • ${h.doctors.length} linked doctors`);
      console.log(`     • ${h.departments.length} departments`);
    });

    // 3. Test the linking endpoint structure
    console.log('\n3️⃣ Testing linking endpoint requirements...');
    const testHospital = hospitals[0];
    const testDoctor = approvedDoctors[0];
    
    console.log(`   Hospital: ${testHospital.name} (ID: ${testHospital.id})`);
    console.log(`   Doctor Code: ${testDoctor.doctorCode}`);
    
    // Check if doctor is already linked
    const existingLink = await prisma.hospitalDoctor.findUnique({
      where: {
        hospitalId_doctorId: {
          hospitalId: testHospital.id,
          doctorId: testDoctor.id
        }
      }
    });
    
    if (existingLink) {
      console.log('   ⚠️  Doctor is already linked to this hospital');
    } else {
      console.log('   ✅ Doctor is not linked (ready to test linking)');
    }

    // 4. Display API endpoint structure
    console.log('\n4️⃣ API Endpoint Structure:');
    console.log('   POST /api/hospitals/:hospitalId/link-doctor');
    console.log('   Headers: { Authorization: Bearer <token>, Content-Type: application/json }');
    console.log('   Body: {');
    console.log('     doctorCode: "HLT-DOC-XXXXXX",');
    console.log('     departmentName: "Cardiology" (optional)');
    console.log('   }');

    // 5. Show current hospital-doctor links
    console.log('\n5️⃣ Current Hospital-Doctor Links:');
    const allLinks = await prisma.hospitalDoctor.findMany({
      where: {
        hospitalId: testHospital.id
      },
      include: {
        doctor: {
          include: {
            doctorProfile: true
          }
        },
        department: true
      }
    });

    if (allLinks.length === 0) {
      console.log('   No doctors currently linked to this hospital');
    } else {
      allLinks.forEach(link => {
        console.log(`   - Dr. ${link.doctor.doctorProfile?.clinicName || link.doctor.email}`);
        console.log(`     Code: ${link.doctor.doctorCode}`);
        console.log(`     Department: ${link.department?.name || 'None'}`);
        console.log(`     Status: ${link.doctor.verificationStatus}`);
      });
    }

    // 6. Test data for UI
    console.log('\n6️⃣ Test Data for UI Testing:');
    console.log('   Use these doctor codes to test linking in the UI:');
    approvedDoctors.forEach(doc => {
      console.log(`   • ${doc.doctorCode} - ${doc.doctorProfile?.clinicName || doc.email}`);
    });

    console.log('\n✅ Doctor Linking Test Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testDoctorLinking();
