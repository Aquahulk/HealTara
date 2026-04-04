require('dotenv').config({ path: './apps/api/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkColumns() {
  try {
    const userColumns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'User'");
    console.log('User columns:', userColumns.rows.map(r => r.column_name));

    const profileColumns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'DoctorProfile'");
    console.log('DoctorProfile columns:', profileColumns.rows.map(r => r.column_name));

  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    await pool.end();
  }
}

checkColumns();
