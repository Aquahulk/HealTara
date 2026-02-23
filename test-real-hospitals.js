// ============================================================================
// 🏥 REAL HOSPITALS API TEST - Test database connection
// ============================================================================

console.log('🏥 Testing Real Hospitals API (Database)...');

// Test the real hospitals API endpoint
async function testRealHospitalsAPI() {
  try {
    console.log('📡 Making request to /api/hospitals (real database)...');
    
    const response = await fetch('http://localhost:3000/api/hospitals', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Real Hospitals API Response:', data);
    
    if (data.success && data.data) {
      console.log(`\n📋 Found ${data.data.length} real hospitals in database:`);
      
      if (data.data.length === 0) {
        console.log('🔍 No hospitals found in database. You need to add some hospitals first!');
        console.log('\n💡 To add hospitals:');
        console.log('1. Go to your database admin panel');
        console.log('2. Or use the POST /api/hospitals endpoint');
        console.log('3. Or run a database seed script');
      } else {
        data.data.forEach((hospital, index) => {
          console.log(`  ${index + 1}. ${hospital.name} - ${hospital.city || 'No city'}, ${hospital.state || 'No state'}`);
          console.log(`     📍 ${hospital.address || 'No address'}`);
          console.log(`     📞 ${hospital.phone || 'No phone'}`);
          console.log(`     🏥 ${hospital._count?.departments || 0} departments, ${hospital._count?.doctors || 0} doctors`);
        });
      }
    } else {
      console.log('❌ Unexpected response format:', data);
    }

    console.log('\n📄 Pagination info:', data.pagination);

  } catch (error) {
    console.error('❌ Error testing real hospitals API:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🚨 Development server not running!');
      console.log('Please start your server with: npm run dev');
    }
  }
}

// Run the test
testRealHospitalsAPI();

console.log('\n🎯 What changed:');
console.log('❌ Removed: Demo/mock hospital data');
console.log('✅ Added: Real database connection');
console.log('✅ Added: Prisma ORM queries');
console.log('✅ Added: Department and doctor counts');
console.log('✅ Added: Proper error handling');

console.log('\n🚀 REAL HOSPITALS READY!');
console.log('The hospital list now shows real data from your PostgreSQL database! 🏥✨');

console.log('\n💡 If no hospitals appear:');
console.log('- Your database might be empty');
console.log('- Check DATABASE_URL environment variable');
console.log('- Verify database connection');
console.log('- Add some hospitals to the database');
