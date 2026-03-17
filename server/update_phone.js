const { Pool } = require('pg');
const fs = require('fs');
const env = {};
fs.readFileSync('.env', 'utf8').split('\n').filter(l=>l.includes('=')).forEach(l=>{
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

async function run() {
    try {
        // Try to update lecturerprofile
        const res1 = await pool.query(
            "INSERT INTO lecturerprofile (lecturerid, phonenumber) VALUES ($1, $2) ON CONFLICT (lecturerid) DO UPDATE SET phonenumber = EXCLUDED.phonenumber RETURNING *", 
            [33, '+94704902526']
        );
        console.log("Updated lecturerprofile for ID 33");
    } catch (e) {
        console.error("Error updating lecturerprofile:", e.message);
    }
    
    try {
        // Try to update users table as well, just in case
        const res2 = await pool.query("UPDATE users SET phonenumber = $1 WHERE userid = $2 RETURNING *", ['+94704902526', 33]);
        if (res2.rowCount > 0) {
            console.log("Updated users table for ID 33");
        }
    } catch (e) {
        // It's okay if users table doesn't have a phonenumber column
    }
    
    pool.end();
}
run();
