const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');
const bcrypt = require('bcrypt');

async function verify() {
  const demoEmails = [
    'main.coordinator@university.edu',
    'sub.coordinator@university.edu',
    'lecturer1@example.com',
    'staff@university.edu'
  ];

  try {
    const result = await db.query('SELECT email, passwordhash, roleid FROM users WHERE email = ANY($1)', [demoEmails]);
    console.log(`Found ${result.rows.length} demo users.`);

    for (const row of result.rows) {
      const match = await bcrypt.compare('password123', row.passwordhash);
      console.log(`User: ${row.email}, RoleID: ${row.roleid}, Password Match: ${match}`);
    }

    if (result.rows.length === 4 && result.rows.every(row => bcrypt.compareSync('password123', row.passwordhash))) {
      console.log('Verification: ALL demo users seeded and password verified.');
    } else {
      console.log('Verification: FAILED. Some users missing or password mismatch.');
    }
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    process.exit();
  }
}

verify();
