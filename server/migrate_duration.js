require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        console.log('Adding duration column to session table...');
        await db.query('ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "duration" NUMERIC DEFAULT 2;');
        console.log('Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
