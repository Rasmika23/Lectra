require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function verify() {
    try {
        console.log('Verifying database schema...');
        const bankCols = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'bankdetails' AND column_name IN ('accountholdername', 'bankcountry', 'swiftbic', 'iban')
        `);
        console.log('New Bank columns:', bankCols.rows.map(r => r.column_name));

        const profileCols = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'lecturerprofile' AND column_name IN ('address', 'nicnumber')
        `);
        console.log('New Profile columns:', profileCols.rows.map(r => r.column_name));

        if (bankCols.rows.length === 4 && profileCols.rows.length === 2) {
            console.log('SUCCESS: All new columns exist.');
        } else {
            console.warn('WARNING: Missing some columns!');
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await pool.end();
    }
}

verify();
