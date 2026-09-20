const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDoctor() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    const doctorId = 105;
    console.log(`\n🔍 Checking for doctor ID: ${doctorId}`);
    
    const user = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
        hospitalMemberships: {
          include: {
            hospital: true,
            department: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Doctor not found');
      
      // List all doctors
      const allDoctors = await prisma.user.findMany({
        where: { role: 'DOCTOR' },
        select: {
          id: true,
          email: true,
          role: true
        },
        take: 10
      });
      
      console.log('\n📋 Available doctors (first 10):');
      allDoctors.forEach(d => {
        console.log(`  - ID: ${d.id}, Email: ${d.email}`);
      });
    } else {
      console.log('✅ Doctor found!');
      console.log(`  - ID: ${user.id}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Role: ${user.role}`);
      console.log(`  - Has Profile: ${!!user.doctorProfile}`);
      if (user.doctorProfile) {
        console.log(`  - Specialization: ${user.doctorProfile.specialization}`);
        console.log(`  - Slug: ${user.doctorProfile.slug}`);
      }
      console.log(`  - Hospital Memberships: ${user.hospitalMemberships.length}`);
      user.hospitalMemberships.forEach(m => {
        console.log(`    * Hospital: ${m.hospital.name}, Department: ${m.department?.name || 'None'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDoctor();
