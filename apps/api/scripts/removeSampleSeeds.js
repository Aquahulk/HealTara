const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const hospitalNames = ['Green Valley Hospital', 'Sunrise Care Clinic'];
  const doctorEmails = ['dr.mehta@example.com', 'dr.kapoor@example.com'];

  console.log('Looking for sample hospitals:', hospitalNames.join(', '));
  console.log('Looking for sample doctors:', doctorEmails.join(', '));

  const hospitals = await prisma.hospital.findMany({
    where: { name: { in: hospitalNames } },
    select: { id: true, name: true }
  });
  const hospitalIds = hospitals.map(h => h.id);

  const doctors = await prisma.user.findMany({
    where: { email: { in: doctorEmails } },
    select: { id: true, email: true }
  });
  const doctorIds = doctors.map(d => d.id);

  console.log('Found hospital IDs:', hospitalIds);
  console.log('Found doctor IDs:', doctorIds);

  if (hospitalIds.length || doctorIds.length) {
    console.log('Deleting hospital-doctor links...');
    await prisma.hospitalDoctor.deleteMany({
      where: {
        OR: [
          { hospitalId: { in: hospitalIds } },
          { doctorId: { in: doctorIds } },
        ]
      }
    });

    console.log('Deleting departments for sample hospitals...');
    await prisma.department.deleteMany({ where: { hospitalId: { in: hospitalIds } } });

    console.log('Deleting sample doctor profiles...');
    await prisma.doctorProfile.deleteMany({ where: { userId: { in: doctorIds } } });

    console.log('Deleting sample doctors (users)...');
    await prisma.user.deleteMany({ where: { email: { in: doctorEmails } } });

    console.log('Deleting sample hospitals...');
    await prisma.hospital.deleteMany({ where: { id: { in: hospitalIds } } });

    console.log('✅ Sample seed data removed.');
  } else {
    console.log('No sample seed data found.');
  }
}

run()
  .catch(async (e) => { console.error('Cleanup error:', e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

