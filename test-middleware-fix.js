// ============================================================================
// 🌐 MIDDLEWARE TEST
// ============================================================================
// Test if middleware fix resolves the homepage routing issue
// ============================================================================

console.log('🔧 Testing Middleware Fix...\n');

// Test cases for middleware logic
const testCases = [
  {
    hostname: 'hosptest.healtara.com',
    expected: 'Should pass through to homepage',
    isLocalhost: false,
    isVercelHost: false
  },
  {
    hostname: 'healtara.com',
    expected: 'Should pass through to homepage',
    isLocalhost: false,
    isVercelHost: false
  },
  {
    hostname: 'john-doe.hosptest.healtara.com',
    expected: 'Should route to doctor site',
    isLocalhost: false,
    isVercelHost: false
  },
  {
    hostname: 'hospital-123.hosptest.healtara.com',
    expected: 'Should route to hospital site',
    isLocalhost: false,
    isVercelHost: false
  },
  {
    hostname: 'localhost',
    expected: 'Should pass through (no subdomain routing)',
    isLocalhost: true,
    isVercelHost: false
  }
];

function testMiddleware(hostname, expected, isLocalhost, isVercelHost) {
  const hostParts = hostname.split('.');
  const hasSubdomain = hostParts.length > 2;
  
  console.log(`🧪 Testing: ${hostname}`);
  console.log(`   Has subdomain: ${hasSubdomain}`);
  console.log(`   Is localhost: ${isLocalhost}`);
  console.log(`   Is Vercel: ${isVercelHost}`);
  
  // Simulate middleware logic
  const subdomainRoutingEnabled = true;
  
  if (!isLocalhost && !isVercelHost && subdomainRoutingEnabled && hasSubdomain) {
    const sub = hostParts[0];
    
    if (sub === 'www') {
      console.log(`   ✅ Pass through (www)`);
      return true;
    }
    
    // IMPORTANT: Don't treat the main domain as a subdomain
    if (sub === 'hosptest' || sub === 'healtara' || sub === 'app') {
      console.log(`   ✅ Pass through (main domain)`);
      return true;
    }
    
    console.log(`   🔄 Would route to subdomain: ${sub}`);
    return false;
  }
  
  console.log(`   ✅ Pass through (no subdomain routing)`);
  return true;
}

console.log('📋 Test Results:\n');
testCases.forEach((testCase, index) => {
  const result = testMiddleware(
    testCase.hostname,
    testCase.expected,
    testCase.isLocalhost,
    testCase.isVercelHost
  );
  
  console.log(`   Expected: ${testCase.expected}`);
  console.log(`   Result: ${result ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
});

console.log('🎯 Expected Behavior:');
console.log('- hosptest.healtara.com → Homepage (shows partnered hospitals)');
console.log('- doctor-name.hosptest.healtara.com → Doctor microsite');
console.log('- hospital-123.hosptest.healtara.com → Hospital microsite');
console.log('');
console.log('🚀 After deploying this fix:');
console.log('1. The homepage should load properly');
console.log('2. Partnered hospitals list should be visible');
console.log('3. Subdomain routing still works for actual subdomains');
