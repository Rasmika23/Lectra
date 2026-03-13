require('dotenv').config();
const db = require('./db');

async function updateSchema() {
    try {
        console.log('Adding new columns to module table...');
        await db.query(`
            ALTER TABLE module 
            ADD COLUMN IF NOT EXISTS default_day VARCHAR(20),
            ADD COLUMN IF NOT EXISTS default_time TIME,
            ADD COLUMN IF NOT EXISTS default_end_time TIME,
            ADD COLUMN IF NOT EXISTS reminder_hours INTEGER DEFAULT 48,
            ADD COLUMN IF NOT EXISTS reminder_template TEXT;
        `);
        console.log('Schema updated successfully.');
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        process.exit();
    }
}

updateSchema();
