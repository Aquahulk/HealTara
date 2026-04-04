// ============================================================================
// 🧪 TEST DOCTORS API - Check if doctors are working
// ============================================================================

console.log('🧪 Testing Doctors API...');

async function testDoctorsAPI() {
  try {
    console.log('📡 Making request to /api/doctors...');
    
    const response = await fetch('http://localhost:3000/api/doctors?sort=trending&page=1&pageSize=6', {
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
    console.log('✅ Doctors API Response:', data);
    
    if (data.success && data.data) {
      console.log(`\n📋 Found ${data.data.length} doctors:`);
      data.data.forEach((doctor, index) => {
        console.log(`  ${index + 1}. ${doctor.name || 'Unknown Doctor'} - ${doctor.specialization || 'General'}`);
      });
    } else {
      console.log('❌ No doctors found or API error');
    }

    console.log('\n📄 Pagination info:', data.pagination);

  } catch (error) {
    console.error('❌ Error testing doctors API:', error.message);
  }
}

testDoctorsAPI();

console.log('\n🎯 Doctors API Test Complete!');
console.log('If this works, your localhost issues are resolved! 🧪✨');
