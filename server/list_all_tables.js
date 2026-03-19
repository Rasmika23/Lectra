require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function listSpecificTables() {
    const tableNames = ['sessionattendance', 'sessiondetails', 'session'];
    try {
        for (const tableName of tableNames) {
            const columns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);
            console.log(`\nTable: ${tableName}`);
            columns.rows.forEach(c => {
                console.log(`  - ${c.column_name} (${c.data_type})`);
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listSpecificTables();
