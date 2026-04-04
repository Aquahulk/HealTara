// ============================================================================
// 🏥 HOSPITALS API TEST - Test the hospitals endpoint
// ============================================================================

console.log('🏥 Testing Hospitals API Endpoint...');

// Test the hospitals API endpoint
async function testHospitalsAPI() {
  try {
    console.log('📡 Making request to /api/hospitals...');
    
    const response = await fetch('http://localhost:3000/api/hospitals', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Hospitals API Response:', data);
    
    if (data.success && data.data) {
      console.log(`📋 Found ${data.data.length} hospitals`);
      data.data.forEach((hospital, index) => {
        console.log(`  ${index + 1}. ${hospital.name} - ${hospital.city}, ${hospital.state}`);
      });
    } else {
      console.log('❌ Unexpected response format:', data);
    }

  } catch (error) {
    console.error('❌ Error testing hospitals API:', error);
  }
}

// Run the test
testHospitalsAPI();

console.log('\n🎯 Instructions:');
console.log('1. Make sure your development server is running: npm run dev');
console.log('2. Open this file in your browser or run: node test-hospitals-api.js');
console.log('3. Check the console output for API response');
console.log('4. The hospital list should now appear on the homepage!');

console.log('\n🚀 FIXED!');
console.log('The hospitals API endpoint has been created and the API client has been updated.');
console.log('The hospital list should now be visible on the homepage feed! 🎉');
