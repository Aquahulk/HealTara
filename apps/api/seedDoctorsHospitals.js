// Quick seed script to add sample hospitals and doctors (CommonJS)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample hospitals and doctors...');

  // Create hospitals
  const h1 = await prisma.hospital.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Green Valley Hospital',
      address: '123 Wellness Ave',
      city: 'Bangalore',
      state: 'KA',
      phone: '080-123456',
    },
  });

  const h2 = await prisma.hospital.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Sunrise Care Clinic',
      address: '45 Health Street',
      city: 'Mumbai',
      state: 'MH',
      phone: '022-987654',
    },
  });

  // Create doctors
  const passwordHash = await bcrypt.hash('doctorpass123', 10);

  const d1 = await prisma.user.upsert({
    where: { email: 'dr.mehta@example.com' },
    update: {},
    create: {
      email: 'dr.mehta@example.com',
      role: 'DOCTOR',
      password: passwordHash,
    },
  });

  const d2 = await prisma.user.upsert({
    where: { email: 'dr.kapoor@example.com' },
    update: {},
    create: {
      email: 'dr.kapoor@example.com',
      role: 'DOCTOR',
      password: passwordHash,
    },
  });

  // Create doctor profiles
  await prisma.doctorProfile.upsert({
    where: { userId: d1.id },
    update: {},
    create: {
      userId: d1.id,
      specialization: 'Cardiology',
      clinicName: 'Heart Care Center',
      clinicAddress: 'Sector 21, Near Central Park',
      city: 'Bangalore',
      state: 'KA',
      phone: '080-111111',
      consultationFee: 600,
      experience: 8,
      slotPeriodMinutes: 15,
      slug: 'dr-mehta',
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: d2.id },
    update: {},
    create: {
      userId: d2.id,
      specialization: 'Orthopedics',
      clinicName: 'Bone & Joint Clinic',
      clinicAddress: '7th Floor, Wellness Tower',
      city: 'Mumbai',
      state: 'MH',
      phone: '022-222222',
      consultationFee: 500,
      experience: 6,
      slotPeriodMinutes: 20,
      slug: 'dr-kapoor',
    },
  });

  // Link doctors to hospitals
  await prisma.hospitalDoctor.upsert({
    where: { hospitalId_doctorId: { hospitalId: h1.id, doctorId: d1.id } },
    update: {},
    create: { doctorId: d1.id, hospitalId: h1.id },
  });

  await prisma.hospitalDoctor.upsert({
    where: { hospitalId_doctorId: { hospitalId: h2.id, doctorId: d2.id } },
    update: {},
    create: { doctorId: d2.id, hospitalId: h2.id },
  });

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });