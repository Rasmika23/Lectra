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

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'module'");
    console.log('SCHEMA:', JSON.stringify(res.rows));
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
checkSchema();
