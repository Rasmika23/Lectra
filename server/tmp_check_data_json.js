require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function checkData() {
    try {
        const users = await pool.query('SELECT userid, name, email FROM users');
        const lp = await pool.query('SELECT * FROM lecturerprofile');
        const bd = await pool.query('SELECT * FROM bankdetails');
        
        console.log(JSON.stringify({
            users: users.rows,
            lecturerprofile: lp.rows,
            bankdetails: bd.rows
        }, null, 2));
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkData();
