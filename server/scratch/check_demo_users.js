const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function checkSchema() {
  try {
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name));

    for (const table of tables.rows) {
      const columns = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table.table_name]);
      console.log(`Columns in ${table.table_name}:`, columns.rows.map(r => r.column_name).join(', '));
    }
  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    process.exit();
  }
}

checkSchema();
