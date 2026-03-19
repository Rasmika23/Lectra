require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkSchemas() {
    try {
        const tablesToCheck = ['bankdetails', 'lecturerprofile'];
        for (const tableName of tablesToCheck) {
            const columns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);
            
            if (columns.rows.length === 0) {
                console.log(`Table '${tableName}' does not exist.`);
            } else {
                console.log(`\nTable: ${tableName}`);
                columns.rows.forEach(c => {
                    console.log(`  - ${c.column_name} (${c.data_type})`);
                });
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchemas();
