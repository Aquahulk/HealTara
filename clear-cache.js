// Script to help clear browser cache for testing

console.log('🧹 Cache Clearing Guide\n');
console.log('To see the hospital names on doctor cards, you need to clear the cached data:\n');
console.log('Option 1 - Browser Developer Tools:');
console.log('  1. Open http://localhost:3000');
console.log('  2. Press F12 to open DevTools');
console.log('  3. Go to Application tab → Storage → Local Storage');
console.log('  4. Find and delete "homepage_cache" key');
console.log('  5. Refresh the page (Ctrl+F5 for hard refresh)\n');

console.log('Option 2 - Browser Console:');
console.log('  1. Open http://localhost:3000');
console.log('  2. Press F12, go to Console tab');
console.log('  3. Run: localStorage.removeItem("homepage_cache")');
console.log('  4. Run: localStorage.removeItem("homepage_cache_timestamp")');
console.log('  5. Refresh the page\n');

console.log('Option 3 - Clear All Site Data:');
console.log('  1. Open http://localhost:3000');
console.log('  2. Press F12');
console.log('  3. Go to Application tab → Storage');
console.log('  4. Click "Clear site data" button');
console.log('  5. Refresh the page\n');

console.log('✅ After clearing cache, the homepage will fetch fresh data from the API');
console.log('   and you should see hospital names (🏥 DocProc) for linked doctors!\n');
