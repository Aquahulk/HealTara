require('dotenv').config({ path: './apps/api/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkComment() {
  try {
    const comment = await pool.query("SELECT * FROM comments LIMIT 1");
    console.log('Comment row:', comment.rows[0]);
  } catch (err) {
    console.error('Error checking comment:', err);
  } finally {
    await pool.end();
  }
}

checkComment();
