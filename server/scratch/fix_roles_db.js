const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function standardizeRoles() {
  try {
    console.log('Standardizing roles...');
    await db.query(`
      UPDATE roles SET rolename = 'main-coordinator' WHERE roleid = 1;
      UPDATE roles SET rolename = 'sub-coordinator' WHERE roleid = 2;
      UPDATE roles SET rolename = 'lecturer' WHERE roleid = 3;
      UPDATE roles SET rolename = 'staff' WHERE roleid = 4;
    `);
    const res = await db.query('SELECT * FROM roles');
    console.log('Updated roles:', res.rows);
  } catch (err) {
    console.error('Error updating roles:', err);
  } finally {
    process.exit();
  }
}

standardizeRoles();
