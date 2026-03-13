require('dotenv').config();
const db = require('./db');

async function checkData() {
    try {
        console.log('--- Modules ---');
        const modules = await db.query('SELECT moduleid, modulecode, subcoordinatorid FROM module');
        console.table(modules.rows);

        console.log('\n--- Sub-Coordinators ---');
        const subcos = await db.query(`
            SELECT u.userid, u.name, u.email, r.rolename 
            FROM users u 
            JOIN roles r ON u.roleid = r.roleid 
            WHERE r.rolename = 'SubCoordinator'
        `);
        console.table(subcos.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
