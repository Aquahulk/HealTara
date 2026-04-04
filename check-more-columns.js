require('dotenv').config({ path: './apps/api/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkHospitalDoctor() {
  try {
    const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'HospitalDoctor'");
    console.log('HospitalDoctor columns:', columns.rows.map(r => r.column_name));

    const deptColumns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Department'");
    console.log('Department columns:', deptColumns.rows.map(r => r.column_name));

    const apptColumns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Appointment'");
    console.log('Appointment columns:', apptColumns.rows.map(r => r.column_name));

  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    await pool.end();
  }
}

checkHospitalDoctor();
