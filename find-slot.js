const fs = require('fs');
const lines = fs.readFileSync('apps/web/app/dashboard/page.tsx', 'utf8').split('\n');

// Find slot admin login page
const slotLoginIdx = lines.findIndex(l => l.includes('/slot-admin/login') && l.includes('href'));
console.log('Slot admin login link at line', slotLoginIdx+1);

// Find slot admin dashboard rendering
lines.forEach((l, i) => {
  if (l.includes('SLOT_ADMIN') && (l.includes('role') || l.includes('user'))) {
    console.log('SLOT_ADMIN role check at line', i+1, ':', l.trim().substring(0, 90));
  }
});
