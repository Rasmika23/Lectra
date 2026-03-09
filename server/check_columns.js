require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        console.log('--- MODULE TABLE ---');
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'module'");
        res.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));

        console.log('\n--- MODULELECTURER TABLE ---');
        const res2 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'modulelecturer'");
        res2.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
