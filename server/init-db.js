require('dotenv').config();
const db = require('./db');

async function init() {
  try {
    console.log('Initializing otps table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS otps (
        otpid SERIAL PRIMARY KEY,
        userid INT REFERENCES users(userid) ON DELETE CASCADE,
        email VARCHAR(255), -- for email change, stores target email
        otpcode VARCHAR(6) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        expiresat TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        createdat TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Table created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating table:', err);
    process.exit(1);
  }
}

init();
