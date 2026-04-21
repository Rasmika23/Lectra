const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function checkSchema() {
    try {
        const res = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'module'
        `);
        console.log('Columns in module:');
        res.rows.forEach(row => console.log('- ' + row.column_name));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
