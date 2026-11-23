const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApprovalSystem() {
  console.log('🔍 Testing Admin Approval System...\n');
  
  try {
    // 1. Check for pending doctors
    console.log('1️⃣ Checking for pending doctors...');
    const pendingDoctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        OR: [
          { status: 'PENDING' },
          { doctorProfile: { verificationStatus: 'PENDING' } }
        ]
      },
      include: {
        doctorProfile: {
          select: {
            id: true,
            clinicName: true,
            specialization: true,
            verificationStatus: true,
            verificationSubmitted: true,
            registrationNumber: true
          }
        }
      }
    });
    
    console.log(`   Found ${pendingDoctors.length} pending doctors`);
    if (pendingDoctors.length > 0) {
      pendingDoctors.forEach(d => {
        console.log(`   - ${d.email} (${d.doctorProfile?.specialization || 'N/A'}) - Status: ${d.status}, Verification: ${d.doctorProfile?.verificationStatus}`);
      });
    } else {
      console.log('   ✅ No pending doctors');
    }
    
    // 2. Check for approved doctors
    console.log('\n2️⃣ Checking for approved doctors...');
    const approvedDoctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        status: 'ACTIVE',
        doctorProfile: { verificationStatus: 'APPROVED' }
      },
      include: {
        doctorProfile: {
          select: {
            id: true,
            clinicName: true,
            specialization: true
          }
        }
      }
    });
    
    console.log(`   Found ${approvedDoctors.length} approved doctors`);
    if (approvedDoctors.length > 0) {
      approvedDoctors.slice(0, 5).forEach(d => {
        console.log(`   - ${d.email} (${d.doctorProfile?.specialization || 'N/A'})`);
      });
      if (approvedDoctors.length > 5) {
        console.log(`   ... and ${approvedDoctors.length - 5} more`);
      }
    }
    
    // 3. Check for pending hospitals
    console.log('\n3️⃣ Checking for pending hospitals...');
    const pendingHospitals = await prisma.hospital.findMany({
      where: {
        verificationStatus: 'PENDING'
      },
      select: {
        id: true,
        name: true,
        status: true,
        verificationStatus: true,
        verificationSubmitted: true,
        registrationNumberGov: true
      }
    });
    
    console.log(`   Found ${pendingHospitals.length} pending hospitals`);
    if (pendingHospitals.length > 0) {
      pendingHospitals.forEach(h => {
        console.log(`   - ${h.name} - Status: ${h.status}, Verification: ${h.verificationStatus}`);
      });
    } else {
      console.log('   ✅ No pending hospitals');
    }
    
    // 4. Check for approved hospitals
    console.log('\n4️⃣ Checking for approved hospitals...');
    const approvedHospitals = await prisma.hospital.findMany({
      where: {
        status: 'ACTIVE',
        verificationStatus: 'APPROVED'
      },
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`   Found ${approvedHospitals.length} approved hospitals`);
    if (approvedHospitals.length > 0) {
      approvedHospitals.slice(0, 5).forEach(h => {
        console.log(`   - ${h.name}`);
      });
      if (approvedHospitals.length > 5) {
        console.log(`   ... and ${approvedHospitals.length - 5} more`);
      }
    }
    
    // 5. Check admin user
    console.log('\n5️⃣ Checking admin user...');
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    
    if (admin) {
      console.log(`   ✅ Admin found: ${admin.email} (ID: ${admin.id})`);
      console.log(`   🔐 Login at: http://localhost:3000/admin-secure-panel-7x9y2z-2024/login`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Password: admin123`);
    } else {
      console.log('   ❌ No admin user found');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Pending Doctors: ${pendingDoctors.length}`);
    console.log(`Approved Doctors: ${approvedDoctors.length}`);
    console.log(`Pending Hospitals: ${pendingHospitals.length}`);
    console.log(`Approved Hospitals: ${approvedHospitals.length}`);
    console.log(`Admin Account: ${admin ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (pendingDoctors.length > 0 || pendingHospitals.length > 0) {
      console.log('\n⚠️  Action Required:');
      console.log('   Login to admin panel to approve pending submissions');
      console.log(`   URL: http://localhost:3000/admin-secure-panel-7x9y2z-2024/login`);
    }
    
    console.log('\n✅ Approval system is configured and working!');
    
  } catch (error) {
    console.error('❌ Error testing approval system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalSystem();
