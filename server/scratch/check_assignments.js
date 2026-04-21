const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function checkData() {
  try {
    const modules = await db.query('SELECT moduleid, modulecode, subcoordinatorid FROM module');
    const users = await db.query('SELECT userid, name, roleid FROM users');
    
    console.log('--- MODULES ---');
    console.log(modules.rows);
    
    console.log('\n--- USERS ---');
    console.log(users.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
