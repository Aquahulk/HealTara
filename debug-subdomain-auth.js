// ============================================================================
// 🧪 SUBDOMAIN AUTHENTICATION DEBUG
// ============================================================================
// Debug authentication issues on subdomain microsites
// ============================================================================

console.log('🧪 Subdomain Authentication Debug\n');

console.log('🔍 Issue Analysis:');
console.log('- User logged in on homepage (localhost)');
console.log('- User logged out on subdomain (hospital1.localhost)');
console.log('- User logged back in when returning to homepage');
console.log('');
console.log('This suggests:');
console.log('1. AuthContext not reading cookies on subdomain');
console.log('2. Cookie domain not set correctly');
console.log('3. AuthContext initialization issue on subdomain');

console.log('\n📋 Debug Steps:');
console.log('');
console.log('1. CHECK COOKIES ON BOTH DOMAINS:');
console.log('   - Login on: http://localhost:3000/login');
console.log('   - DevTools → Application → Cookies');
console.log('   - Filter by localhost');
console.log('   - Note authToken cookie details');
console.log('   - Navigate to: http://hospital1.localhost:3000');
console.log('   - DevTools → Application → Cookies');
console.log('   - Filter by hospital1.localhost');
console.log('   - Compare authToken cookie');

console.log('\n2. CHECK AUTHCONTEXT STATE:');
console.log('   - On localhost: Open console');
console.log('   - Type: window.__AUTH_CONTEXT_USER__');
console.log('   - Note user object');
console.log('   - On hospital1.localhost: Open console');
console.log('   - Type: window.__AUTH_CONTEXT_USER__');
console.log('   - Compare user objects');

console.log('\n3. CHECK API CLIENT TOKEN:');
console.log('   - On localhost: Open console');
console.log('   - Type: window.apiClient?.getStoredToken()');
console.log('   - Note token value');
console.log('   - On hospital1.localhost: Open console');
console.log('   - Type: window.apiClient?.getStoredToken()');
console.log('   - Compare token values');

console.log('\n🔧 Expected Cookie Behavior:');
console.log('localhost:');
console.log('  Name: authToken');
console.log('  Value: [token-value]');
console.log('  Domain: (empty)');
console.log('  Path: /');
console.log('');
console.log('hospital1.localhost:');
console.log('  Name: authToken');
console.log('  Value: [same-token-value]');
console.log('  Domain: .localhost');
console.log('  Path: /');

console.log('\n🚨 If Cookies Different:');
console.log('1. Cookie domain not set correctly');
console.log('2. Browser blocking cross-domain cookies');
console.log('3. Cookie path too restrictive');
console.log('4. SameSite policy blocking');

console.log('\n🛠️  Manual Cookie Test:');
console.log('1. On localhost, manually set cookie:');
console.log('   document.cookie = "authToken=test123; Path=/; Domain=.localhost; SameSite=Lax"');
console.log('2. Navigate to hospital1.localhost');
console.log('3. Check if cookie is accessible');

console.log('\n📝 Debug Report:');
console.log('Please provide:');
console.log('1. Cookie values on both domains');
console.log('2. AuthContext user objects');
console.log('3. apiClient.getStoredToken() results');
console.log('4. Any console errors');

console.log('\n🎉 Debug script ready!');
