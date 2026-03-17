const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').filter(l=>l.includes('=')).forEach(l=>{
    const p=l.split('=');
    env[p[0].trim()]=p.slice(1).join('=').trim()
});

const pool = new Pool({
    user: env.DB_USER,
    host: env.DB_HOST,
    database: env.DB_NAME,
    password: env.DB_PASSWORD,
    port: env.DB_PORT
});

async function check() {
    try {
        console.log("--- Sessions ---");
        const sessions = await pool.query("SELECT sessionid, moduleid, lecturerid, datetime, status FROM session LIMIT 10");
        console.log(JSON.stringify(sessions.rows, null, 2));

        console.log("\n--- Module Lecturer Assignments ---");
        const assignments = await pool.query("SELECT * FROM modulelecturer LIMIT 10");
        console.log(JSON.stringify(assignments.rows, null, 2));

        console.log("\n--- Users (Lecturers) ---");
        const users = await pool.query("SELECT userid, name, email FROM users WHERE roleid = 3 LIMIT 10");
        console.log(JSON.stringify(users.rows, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}

check();
