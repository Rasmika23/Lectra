require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function checkData() {
    try {
        console.log('--- users table (all) ---');
        const users = await pool.query('SELECT userid, name, email FROM users LIMIT 10');
        console.table(users.rows);

        console.log('\n--- lecturerprofile table (all) ---');
        const lp = await pool.query('SELECT * FROM lecturerprofile LIMIT 10');
        console.table(lp.rows);

        console.log('\n--- bankdetails table (all) ---');
        const bd = await pool.query('SELECT * FROM bankdetails LIMIT 10');
        console.table(bd.rows);
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkData();
