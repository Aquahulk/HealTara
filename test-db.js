const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_ugLM1TWFvzI9@ep-broad-sunset-adnahhvd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testConnection() {
  const client = new Client({
    connectionString: connectionString,
  });
  try {
    await client.connect();
    console.log('Successfully connected to the database');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
}

testConnection();
