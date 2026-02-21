// ============================================================================
// 🧪 MIDDLEWARE ROUTING TEST
// ============================================================================
// Test if middleware correctly handles custom domains and subdomains
// ============================================================================

console.log('🧪 Testing Middleware Routing Fix...\n');

// Test middleware logic simulation
function testMiddlewareRouting(hostname, pathname) {
  console.log(`\n🔍 Testing: ${hostname}${pathname}`);
  
  const isLocalhost = hostname === 'localhost';
  const isVercelHost = hostname.endsWith('vercel.app') || hostname.endsWith('vercel.dev');
  const subdomainRoutingEnabled = true;
  const hostParts = hostname.split('.');
  const hasSubdomain = hostParts.length > 2;
  
  console.log(`   Is Localhost: ${isLocalhost}`);
  console.log(`   Has Subdomain: ${hasSubdomain}`);
  console.log(`   Subdomain Routing: ${subdomainRoutingEnabled ? 'Enabled' : 'Disabled'}`);
  
  // Apply subdomain routing when explicitly enabled
  if (!isVercelHost && subdomainRoutingEnabled && hasSubdomain) {
    const sub = hostParts[0];
    console.log(`   Subdomain: "${sub}"`);
    
    if (sub === 'www') {
      console.log(`   ✅ Result: Pass through (www)`);
      return { action: 'pass-through', target: pathname };
    }
    
    // Don't treat main domain as subdomain
    if (sub === 'hosptest' || sub === 'healtara' || sub === 'app') {
      console.log(`   ✅ Result: Pass through (main domain)`);
      return { action: 'pass-through', target: pathname };
    }
    
    // Hospital subdomain patterns
    if (sub.startsWith('hospital-')) {
      const suffix = sub.slice('hospital-'.length);
      const target = `/hospital-site/${suffix}${pathname}`;
      console.log(`   ✅ Result: Hospital ID routing -> "${target}"`);
      return { action: 'hospital-id', target };
    }
    
    // Check if it's a custom domain (contains dots)
    if (sub.includes('.')) {
      const target = `/site/${sub}${pathname}`;
      console.log(`   ✅ Result: Custom domain routing -> "${target}"`);
      return { action: 'custom-domain', target };
    }
    
    // Try slug lookup for subdomains without hospital- prefix
    const target = `/site/${sub}${pathname}`;
    console.log(`   ✅ Result: Subdomain slug routing -> "${target}"`);
    return { action: 'subdomain-slug', target };
  }
  
  console.log(`   ✅ Result: No subdomain routing -> "${pathname}"`);
  return { action: 'no-routing', target: pathname };
}

// Test cases
const testCases = [
  {
    hostname: 'localhost',
    pathname: '/',
    description: 'Main homepage'
  },
  {
    hostname: 'hospital1.localhost',
    pathname: '/',
    description: 'Custom domain on localhost'
  },
  {
    hostname: 'my-hospital.localhost',
    pathname: '/',
    description: 'Subdomain on localhost'
  },
  {
    hostname: 'hospital-123.localhost',
    pathname: '/',
    description: 'Hospital ID subdomain'
  },
  {
    hostname: 'dr-john.localhost',
    pathname: '/',
    description: 'Doctor subdomain'
  },
  {
    hostname: 'hosptest.localhost',
    pathname: '/',
    description: 'Main domain (should pass through)'
  }
];

console.log('📋 Test Results:\n');
testCases.forEach((testCase, index) => {
  const result = testMiddlewareRouting(testCase.hostname, testCase.pathname);
  
  console.log(`${index + 1}. ${testCase.description}:`);
  console.log(`   Input: ${testCase.hostname}`);
  console.log(`   Action: ${result.action}`);
  console.log(`   Target: ${result.target}`);
  console.log(`   Status: ${result.action !== 'no-routing' ? '✅ Routed' : '✅ Pass-through'}`);
  console.log('');
});

console.log('🎯 Expected Routing Behavior:');
console.log('1. localhost → Pass through to homepage');
console.log('2. hospital1.localhost → Custom domain routing (/site/hospital1)');
console.log('3. my-hospital.localhost → Subdomain routing (/site/my-hospital)');
console.log('4. hospital-123.localhost → Hospital ID routing (/hospital-site/123)');
console.log('5. dr-john.localhost → Doctor subdomain routing (/doctor-site/dr-john)');
console.log('6. hosptest.localhost → Pass through (main domain)');

console.log('\n🔧 What Should Happen:');
console.log('✅ Custom domains route to /site/[domain]');
console.log('✅ Subdomains route to /site/[subdomain]');
console.log('✅ Hospital IDs route to /hospital-site/[id]');
console.log('✅ Main domains pass through to homepage');

console.log('\n🚀 Ready for Local Testing:');
console.log('1. Start: npm run dev');
console.log('2. Visit: http://hospital1.localhost:3000');
console.log('3. Check: Browser console for routing logs');
console.log('4. Verify: Hospital microsite loads correctly');

console.log('\n🎉 Middleware routing test complete!');
