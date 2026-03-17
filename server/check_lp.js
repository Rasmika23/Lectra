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
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lecturerprofile';").then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
}).catch(e => {
    console.error('Error:', e);
    pool.end();
});
