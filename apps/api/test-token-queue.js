const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTokenQueue() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');
    
    // Get today's date in IST
    const todayStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Kolkata', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(new Date());
    
    console.log(`📅 Today's date (IST): ${todayStr}\n`);
    
    // Find doctors with appointments today
    const doctors = await prisma.user.findMany({
      where: { 
        role: 'DOCTOR',
        doctorAppointments: {
          some: {
            date: {
              gte: new Date(todayStr + 'T00:00:00.000Z'),
              lte: new Date(todayStr + 'T23:59:59.999Z')
            },
            status: { not: 'CANCELLED' }
          }
        }
      },
      select: {
        id: true,
        email: true,
        doctorAppointments: {
          where: {
            date: {
              gte: new Date(todayStr + 'T00:00:00.000Z'),
              lte: new Date(todayStr + 'T23:59:59.999Z')
            },
            status: { not: 'CANCELLED' }
          },
          select: {
            id: true,
            time: true,
            status: true,
            patientId: true
          },
          orderBy: [
            { time: 'asc' },
            { id: 'asc' }
          ]
        }
      }
    });
    
    if (doctors.length === 0) {
      console.log('❌ No doctors with appointments found for today');
      console.log('\n🔍 Checking for doctors with any appointments...\n');
      
      const anyDoctors = await prisma.user.findMany({
        where: { 
          role: 'DOCTOR',
          doctorAppointments: { some: {} }
        },
        select: {
          id: true,
          email: true,
          doctorAppointments: {
            select: {
              id: true,
              date: true,
              time: true,
              status: true
            },
            take: 3,
            orderBy: { date: 'desc' }
          }
        },
        take: 5
      });
      
      console.log(`📋 Found ${anyDoctors.length} doctors with appointments (showing up to 5):\n`);
      anyDoctors.forEach(doc => {
        console.log(`Doctor ID: ${doc.id}`);
        console.log(`Email: ${doc.email}`);
        console.log(`Recent appointments (up to 3):`);
        doc.doctorAppointments.forEach(appt => {
          console.log(`  - ID: ${appt.id}, Date: ${appt.date}, Time: ${appt.time}, Status: ${appt.status}`);
        });
        console.log('');
      });
      
    } else {
      console.log(`✅ Found ${doctors.length} doctor(s) with appointments today:\n`);
      
      doctors.forEach(doctor => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👨‍⚕️ Doctor ID: ${doctor.id}`);
        console.log(`📧 Email: ${doctor.email}`);
        console.log(`📊 Appointments today: ${doctor.doctorAppointments.length}`);
        console.log(`\n🎫 Token Queue (simulated):`);
        
        doctor.doctorAppointments.forEach((appt, idx) => {
          const tokenNum = idx + 1;
          console.log(`  Token ${tokenNum}: Appt #${appt.id} at ${appt.time} - Status: ${appt.status} - Patient: ${appt.patientId}`);
        });
        
        console.log(`\n✅ Token queue can be started for this doctor!`);
        console.log(`   Use: POST /api/doctors/${doctor.id}/tokens/start`);
        console.log(`   Get current: GET /api/doctors/${doctor.id}/tokens/today`);
        console.log(`   Advance: POST /api/doctors/${doctor.id}/tokens/next\n`);
      });
    }
    
    // Check token queue store file
    const fs = require('fs');
    const path = require('path');
    const storeFile = path.join(__dirname, 'uploads', 'tokenQueues.json');
    
    if (fs.existsSync(storeFile)) {
      const data = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
      console.log(`\n📂 Token Queue Store Status:`);
      console.log(`   File: ${storeFile}`);
      console.log(`   Entries: ${Object.keys(data).length}`);
      
      if (Object.keys(data).length > 0) {
        console.log(`\n   Stored Queues:`);
        Object.entries(data).forEach(([key, value]) => {
          const [doctorId, date] = key.split(':');
          console.log(`   - Doctor ${doctorId} on ${date}: Current Token = ${value.currentToken}, Total Tokens = ${value.tokens.length}`);
        });
      }
    } else {
      console.log(`\n📂 Token Queue Store: Not yet created (will be created on first use)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testTokenQueue();
