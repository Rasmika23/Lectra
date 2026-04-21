const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const pool = new Pool({
    user: env.DB_USER, host: env.DB_HOST, database: env.DB_NAME, password: env.DB_PASSWORD, port: parseInt(env.DB_PORT),
});

async function testNaN() {
  try {
    const val = parseInt(undefined); // NaN
    console.log('Testing query with NaN...', val);
    const res = await pool.query('SELECT $1::int', [val]);
    console.log('QUERY SUCCESS:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('QUERY FAILED:', err.message);
    console.error(err);
    process.exit(1);
  }
}
testNaN();
