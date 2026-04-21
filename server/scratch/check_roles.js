const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function checkRoles() {
  try {
    const res = await db.query('SELECT * FROM roles');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkRoles();
