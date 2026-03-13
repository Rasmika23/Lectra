require('dotenv').config();
const db = require('./db');

async function checkSchema() {
    try {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'module'
        `);
        console.log('Columns in module table:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
