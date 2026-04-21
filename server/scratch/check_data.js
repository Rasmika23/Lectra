require('dotenv').config();
const db = require('../db');

async function checkData() {
  try {
    const roles = await db.query('SELECT * FROM roles');
    console.log('ROLES:', roles.rows);

    const users = await db.query('SELECT u.userid, u.name, r.rolename FROM users u JOIN roles r ON u.roleid = r.roleid');
    console.log('USERS:', users.rows);

    const modules = await db.query('SELECT moduleid, modulecode, subcoordinatorid FROM module');
    console.log('MODULES:', modules.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
