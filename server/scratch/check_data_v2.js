const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Manually load .env from parent dir
const envPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const pool = new Pool({
    user: env.DB_USER,
    host: env.DB_HOST,
    database: env.DB_NAME,
    password: env.DB_PASSWORD,
    port: parseInt(env.DB_PORT),
});

async function checkData() {
  try {
    const users = await pool.query("SELECT u.userid, u.name, r.rolename FROM users u JOIN roles r ON u.roleid = r.roleid WHERE r.rolename = 'sub-coordinator'");
    console.log('SUB-COORDINATORS:', JSON.stringify(users.rows));

    const modules = await pool.query('SELECT moduleid, modulecode, subcoordinatorid FROM module');
    console.log('MODULES:', JSON.stringify(modules.rows));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
