require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    try {
        console.log('Starting migration...');

        // Update bankdetails table
        console.log('Updating bankdetails table...');
        await pool.query(`
            ALTER TABLE bankdetails 
            ADD COLUMN IF NOT EXISTS accountholdername VARCHAR(255),
            ADD COLUMN IF NOT EXISTS bankcountry VARCHAR(100),
            ADD COLUMN IF NOT EXISTS swiftbic VARCHAR(50),
            ADD COLUMN IF NOT EXISTS iban VARCHAR(50);
        `);

        // Update lecturerprofile table
        console.log('Updating lecturerprofile table...');
        await pool.query(`
            ALTER TABLE lecturerprofile 
            ADD COLUMN IF NOT EXISTS address TEXT,
            ADD COLUMN IF NOT EXISTS nicnumber VARCHAR(20);
        `);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
