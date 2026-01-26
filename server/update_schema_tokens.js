const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function updateSchema() {
    try {
        console.log('Updating database schema for tokens...');

        // 1. Create verification_tokens table
        console.log('Creating verification_tokens table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id SERIAL PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- 'OTP' or 'RESET_PASSWORD'
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log('verification_tokens table created.');

        // 2. Remove columns from users table (if they exist)
        console.log('Cleaning up users table...');

        // Check if columns exist before dropping to avoid errors if run multiple times
        const checkToken = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='reset_password_token'");
        if (checkToken.rows.length > 0) {
            await pool.query('ALTER TABLE users DROP COLUMN reset_password_token');
            console.log('Dropped reset_password_token column.');
        }

        const checkExpires = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='reset_password_expires'");
        if (checkExpires.rows.length > 0) {
            await pool.query('ALTER TABLE users DROP COLUMN reset_password_expires');
            console.log('Dropped reset_password_expires column.');
        }

        console.log('Schema update successful!');
        process.exit(0);
    } catch (err) {
        console.error('Schema update failed:', err);
        process.exit(1);
    }
}

updateSchema();
