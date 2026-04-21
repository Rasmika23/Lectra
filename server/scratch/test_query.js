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

async function testQuery() {
  try {
    const userId = 32; // Rasmika's ID
    const query = `
      SELECT m.moduleid, m.modulecode
      FROM module m
      WHERE m.subcoordinatorid = $1
         OR EXISTS (SELECT 1 FROM modulelecturer ml WHERE ml.moduleid = m.moduleid AND ml.lecturerid = $1)
    `;
    console.log('Testing query with duplicate $1...');
    const res = await pool.query(query, [userId]);
    console.log('QUERY SUCCESS:', res.rows.length, 'rows returned');
    process.exit(0);
  } catch (err) {
    console.error('QUERY FAILED:', err.message);
    console.error(err);
    process.exit(1);
  }
}
testQuery();
