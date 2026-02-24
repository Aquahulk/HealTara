require('dotenv').config({ path: './apps/api/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkComments() {
  try {
    const commentsColumns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'comments'");
    console.log('Comments columns:', commentsColumns.rows.map(r => r.column_name));

    const commentsCount = await pool.query("SELECT COUNT(*) FROM comments");
    console.log('Comments count:', commentsCount.rows[0].count);

  } catch (err) {
    console.error('Error checking comments:', err);
  } finally {
    await pool.end();
  }
}

checkComments();
