require('dotenv').config({ path: './apps/web/.env.local' });
const { executeQuery } = require('./apps/web/lib/database-pool');

async function testPool() {
  try {
    console.log('Testing database connection with apps/web/.env.local...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');
    
    const rows = await executeQuery('SELECT COUNT(*) FROM "Hospital"');
    console.log('✅ Connection successful!');
    console.log('Hospital count:', rows[0].count);
    
    const hospitals = await executeQuery('SELECT id, name FROM "Hospital" LIMIT 5');
    console.log('Sample hospitals:', hospitals);
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

testPool();
