const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function checkModules() {
  try {
    const result = await db.query('SELECT moduleid, modulecode, subcoordinatorid FROM module');
    console.log('Modules in DB:', result.rows);
    
    const users = await db.query('SELECT userid, name, roleid FROM users WHERE roleid = 2');
    console.log('Sub-coordinators in DB:', users.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkModules();
