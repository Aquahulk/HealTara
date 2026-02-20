// ============================================================================
// 🏥 SAMPLE HOSPITAL DATA SEEDER
// ============================================================================
// This script creates sample hospital data for testing
// Run this on your live server if you need sample data
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedHospitalData() {
  console.log('🌱 Starting Hospital Data Seeding...\n');

  try {
    // 1. Create a hospital admin user first
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
        address: '123 Healthcare Ave, Medical District',
        city: 'Mumbai',
        state: 'Maharashtra',
        phone: '+91-22-1234-5678',
        profile: {
          general: {
            legalName: 'Healtara General Hospital Pvt Ltd',
            brandName: 'Healtara General',
            tagline: 'Your Health, Our Priority',
            address: '123 Healthcare Ave, Medical District, Mumbai - 400001',
            pincode: '400001',
            contacts: {
              emergency: '108',
              reception: '+91-22-1234-5678',
              ambulance: '+91-22-1234-9999',
              appointment: '+91-22-1234-5555'
            },
            emails: {
              info: 'info@healtara.com',
              appointments: 'appointments@healtara.com'
            },
            social: {
              facebook: 'https://facebook.com/healtara',
              twitter: 'https://twitter.com/healtara'
            }
          },
          about: {
            mission: 'To provide exceptional healthcare services with compassion and excellence.',
            vision: 'To be the leading healthcare provider known for innovation and patient care.',
            values: 'Compassion, Excellence, Integrity, Innovation, Teamwork',
            history: 'Founded in 2020, Healtara General Hospital has been serving the community with state-of-the-art medical facilities and experienced healthcare professionals.'
          },
          departments: [
            {
              name: 'Cardiology',
              description: 'Comprehensive heart care services',
              services: ['ECG', 'Echocardiogram', 'Stress Test', 'Angioplasty'],
              conditions: ['Heart Attack', 'Arrhythmia', 'Heart Failure'],
              equipment: ['ECG Machine', 'Echocardiogram', 'Cath Lab']
            },
            {
              name: 'Orthopedics',
              description: 'Bone and joint care specialists',
              services: ['X-Ray', 'MRI', 'Joint Replacement', 'Fracture Treatment'],
              conditions: ['Fractures', 'Arthritis', 'Back Pain'],
              equipment: ['X-Ray Machine', 'MRI Scanner', 'Surgical Tools']
            },
            {
              name: 'Pediatrics',
              description: 'Child healthcare specialists',
              services: ['Vaccination', 'Growth Monitoring', 'Pediatric Surgery'],
              conditions: ['Common Cold', 'Fever', 'Childhood Diseases'],
              equipment: ['Pediatric ICU', 'Vaccination Equipment']
            }
          ]
        }
      },
      {
        name: 'City Medical Center',
        address: '456 Wellness Boulevard, Downtown',
        city: 'Delhi',
        state: 'Delhi NCR',
        phone: '+91-11-9876-5432',
        profile: {
          general: {
            legalName: 'City Medical Center Ltd',
            brandName: 'City Medical',
            tagline: 'Healthcare at its Best',
            address: '456 Wellness Boulevard, Downtown, Delhi - 110001',
            pincode: '110001',
            contacts: {
              emergency: '108',
              reception: '+91-11-9876-5432',
              ambulance: '+91-11-9876-1111'
            }
          },
          about: {
            mission: 'Delivering quality healthcare with advanced medical technology.',
            vision: 'To be the most trusted healthcare center in the region.'
          },
          departments: [
            {
              name: 'General Medicine',
              description: 'Primary healthcare services',
              services: ['General Consultation', 'Health Checkup', 'Vaccination']
            }
          ]
        }
      }
    ];

    // 3. Create hospitals
    for (let i = 0; i < sampleHospitals.length; i++) {
      const hospitalData = sampleHospitals[i];
      
      // Check if hospital already exists
      const existing = await prisma.hospital.findFirst({
        where: { name: hospitalData.name }
      });

      if (!existing) {
        const hospital = await prisma.hospital.create({
          data: {
            name: hospitalData.name,
            address: hospitalData.address,
            city: hospitalData.city,
            state: hospitalData.state,
            phone: hospitalData.phone,
            adminId: hospitalAdmin.id,
            profile: hospitalData.profile
          }
        });
        console.log(`✅ Created hospital: ${hospital.name} (ID: ${hospital.id})`);
      } else {
        console.log(`✅ Hospital already exists: ${existing.name} (ID: ${existing.id})`);
      }
    }

    // 4. List all hospitals after seeding
    const allHospitals = await prisma.hospital.findMany({
      select: { id: true, name: true, city: true }
    });

    console.log('\n📋 Available Hospitals after seeding:');
    allHospitals.forEach(h => {
      console.log(`  - ID: ${h.id}, Name: "${h.name}", City: ${h.city}`);
    });

    console.log('\n🌱 Seeding complete! You can now test:');
    console.log('  - http://your-domain.com/hospital-site/1');
    console.log('  - http://your-domain.com/hospital-site/2');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedHospitalData();
