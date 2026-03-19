require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkConstraints() {
    try {
        console.log('Checking constraints for lecturerprofile...');
        const lpConstraints = await pool.query(`
            SELECT conname, contype, a.attname as column_name
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE conrelid = 'lecturerprofile'::regclass;
        `);
        console.log('Lecturerprofile constraints:', lpConstraints.rows);

        console.log('\nChecking constraints for bankdetails...');
        const bdConstraints = await pool.query(`
            SELECT conname, contype, a.attname as column_name
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE conrelid = 'bankdetails'::regclass;
        `);
        console.log('Bankdetails constraints:', bdConstraints.rows);

    } catch (err) {
        console.error('Error checking constraints:', err);
    } finally {
        await pool.end();
    }
}

checkConstraints();
