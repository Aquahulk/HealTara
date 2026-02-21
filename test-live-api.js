// ============================================================================
// 🌐 LIVE API TESTER
// ============================================================================
// Test if the hospitals API endpoint works on live server
// ============================================================================

const http = require('http');

function testLiveAPI() {
  console.log('🌐 Testing Live API Endpoints...\n');

  // Test 1: Hospitals endpoint
  const options1 = {
    hostname: 'hosptest.healtara.com',
    port: 80,
    path: '/api/hospitals',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };

  const req1 = http.request(options1, (res) => {
    console.log(`📡 Testing: ${options1.hostname}${options1.path}`);
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log(`✅ Response received: ${Array.isArray(jsonData) ? jsonData.length : 'Error'} items`);
        
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          console.log('📋 First hospital:', jsonData[0]);
        } else {
          console.log('❌ No hospitals data received');
        }
      } catch (parseError) {
        console.log('❌ JSON parse error:', parseError.message);
        console.log('📄 Raw response:', data.substring(0, 200));
      }
    });
  });

  req1.on('error', (error) => {
    console.log('❌ Request failed:', error.message);
  });

  req1.setTimeout(10000, () => {
    console.log('⏰ Request timeout');
    req1.destroy();
  });

  req1.end();
}

// Alternative: Test with curl command
function generateCurlCommands() {
  console.log('\n🔧 Manual Test Commands:');
  console.log('\n1. Test hospitals endpoint:');
  console.log('curl -H "Content-Type: application/json" https://hosptest.healtara.com/api/hospitals');
  
  console.log('\n2. Test hospital profile:');
  console.log('curl -H "Content-Type: application/json" https://hosptest.healtara.com/api/hospitals/1/profile');
  
  console.log('\n3. Test with specific limit:');
  console.log('curl -H "Content-Type: application/json" https://hosptest.healtara.com/api/hospitals?limit=5');
  
  console.log('\n4. Test debug endpoint:');
  console.log('curl -H "Content-Type: application/json" https://hosptest.healtara.com/api/debug/hospitals');
}

// Run tests
testLiveAPI();
generateCurlCommands();

console.log('\n📝 Next Steps:');
console.log('1. Run debug-live-hospitals.js on your live server');
console.log('2. If no hospitals found, run seed-live-hospitals.js');
console.log('3. Test API endpoints using the curl commands above');
console.log('4. Check browser console for JavaScript errors');
console.log('5. Verify frontend is calling correct API endpoint');
