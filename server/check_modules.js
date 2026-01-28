require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM module");
        console.log('Modules count:', res.rows.length);
        if (res.rows.length === 0) {
            console.log('Inserting sample module...');
            await db.query(`
        INSERT INTO module (modulename, modulecode, academicyear, semester, subcoordinatorid)
        VALUES ('Distributed Systems', 'CS4001', '2025/2026', 1, NULL)
      `);
            console.log('Sample module inserted.');
        } else {
            console.log('Modules:', res.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
