const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function getUsers() {
    try {
        const res = await db.query('SELECT userid, email, name, roleid FROM users');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
getUsers();
