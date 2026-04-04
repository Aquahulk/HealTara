require('dotenv').config({ path: './apps/api/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDb() {
  try {
    const hospitalCount = await pool.query('SELECT COUNT(*) FROM "Hospital"');
    console.log('Hospital count:', hospitalCount.rows[0].count);

    const doctorCount = await pool.query('SELECT COUNT(*) FROM "User" WHERE role = \'DOCTOR\'');
    console.log('Doctor count:', doctorCount.rows[0].count);

    const hospitals = await pool.query('SELECT id, name FROM "Hospital" LIMIT 5');
    console.log('Sample hospitals:', hospitals.rows);

    const doctors = await pool.query('SELECT u.id, u.name, u.email FROM "User" u JOIN "DoctorProfile" dp ON u.id = dp."userId" WHERE u.role = \'DOCTOR\' LIMIT 5');
    console.log('Sample doctors:', doctors.rows);

  } catch (err) {
    console.error('Error checking database:', err);
  } finally {
    await pool.end();
  }
}

checkDb();
