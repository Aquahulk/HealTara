// ============================================================================
// 🏥 HEALTH CHECK SCRIPT - Check API and Database Status
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const http = require('http');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('\n🔍 Checking Database Connection...');
    await prisma.$connect();
    console.log('✅ Database: Connected');
    
    // Test query
    const userCount = await prisma.user.count();
    const doctorCount = await prisma.user.count({ where: { role: 'DOCTOR' } });
    const patientCount = await prisma.user.count({ where: { role: 'PATIENT' } });
    const hospitalCount = await prisma.hospital.count();
    const appointmentCount = await prisma.appointment.count();
    
    console.log(`   └─ Users: ${userCount} (${doctorCount} doctors, ${patientCount} patients)`);
    console.log(`   └─ Hospitals: ${hospitalCount}`);
    console.log(`   └─ Appointments: ${appointmentCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database: FAILED');
    console.error('   └─ Error:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function checkAPI() {
  return new Promise((resolve) => {
    console.log('\n🔍 Checking API Server...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/homepage',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log('✅ API Server: Running on http://localhost:3001');
            console.log(`   └─ Status Code: ${res.statusCode}`);
            console.log(`   └─ Hospitals in response: ${json.hospitals?.length || 0}`);
            resolve(true);
          } catch (e) {
            console.log('✅ API Server: Running (response parsing failed)');
            resolve(true);
          }
        } else {
          console.log(`⚠️  API Server: Running but returned status ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ API Server: NOT RUNNING');
      console.error('   └─ Error:', error.message);
      console.error('   └─ Make sure to start the API with: npm run dev (in apps/api)');
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('❌ API Server: TIMEOUT (took more than 5 seconds)');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function checkWebApp() {
  return new Promise((resolve) => {
    console.log('\n🔍 Checking Web App...');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 304) {
        console.log('✅ Web App: Running on http://localhost:3000');
        console.log(`   └─ Status Code: ${res.statusCode}`);
        resolve(true);
      } else {
        console.log(`⚠️  Web App: Running but returned status ${res.statusCode}`);
        resolve(false);
      }
      res.resume(); // Consume response data to free up memory
    });
    
    req.on('error', (error) => {
      console.error('❌ Web App: NOT RUNNING');
      console.error('   └─ Error:', error.message);
      console.error('   └─ Make sure to start the web app with: npm run dev (in apps/web)');
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('❌ Web App: TIMEOUT (took more than 5 seconds)');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏥 HEALTARA HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════');
  
  const dbOk = await checkDatabase();
  const apiOk = await checkAPI();
  const webOk = await checkWebApp();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Database: ${dbOk ? '✅ HEALTHY' : '❌ FAILED'}`);
  console.log(`API:      ${apiOk ? '✅ HEALTHY' : '❌ FAILED'}`);
  console.log(`Web App:  ${webOk ? '✅ HEALTHY' : '❌ FAILED'}`);
  
  const allOk = dbOk && apiOk && webOk;
  console.log(`\nOverall Status: ${allOk ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️  SOME SYSTEMS DOWN'}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  process.exit(allOk ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Health check failed with error:', error);
  process.exit(1);
});
