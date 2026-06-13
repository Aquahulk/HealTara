const fs = require('fs');
const c = fs.readFileSync('apps/api/src/index.ts', 'utf8');
const lines = c.split('\n');

// Find CORS origins
const corsStart = lines.findIndex(l => l.includes('corsOptions') || (l.includes('cors') && l.includes('origin')));
console.log('=== CORS options ===');
for(let i=Math.max(0,corsStart-2); i<corsStart+20; i++) console.log((i+1)+': '+lines[i].trim().substring(0,100));
