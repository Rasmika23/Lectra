require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function checkData() {
    try {
        console.log('--- users table ---');
        const users = await pool.query('SELECT userid, name, email, role FROM users WHERE role = \'lecturer\' LIMIT 5');
        console.table(users.rows);

        if (users.rows.length > 0) {
            const lecturerId = users.rows[0].userid;
            console.log(`\n--- lecturerprofile for ID ${lecturerId} ---`);
            const lp = await pool.query('SELECT * FROM lecturerprofile WHERE lecturerid = $1', [lecturerId]);
            console.table(lp.rows);

            console.log(`\n--- bankdetails for ID ${lecturerId} ---`);
            const bd = await pool.query('SELECT * FROM bankdetails WHERE lecturerid = $1', [lecturerId]);
            console.table(bd.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkData();
