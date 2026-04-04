require('dotenv').config({ path: './apps/web/.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('Testing direct connection to Neon...');
    const res = await pool.query('SELECT COUNT(*) FROM "Hospital"');
    console.log('Hospital count:', res.rows[0].count);
    
    const hospitals = await pool.query('SELECT id, name FROM "Hospital"');
    console.log('Hospitals in DB:', hospitals.rows);
    
  } catch (err) {
    console.error('❌ Direct connection failed:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
