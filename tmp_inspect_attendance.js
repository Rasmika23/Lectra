const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

async function inspect() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    console.log('--- sessiondetails table ---');
    const sdCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sessiondetails' ORDER BY ordinal_position`);
    console.log(sdCols.rows);

    const sdConstraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'sessiondetails'::regclass
    `);
    console.log('Constraints:', sdConstraints.rows);

    console.log('\n--- sessionattendance table ---');
    const saCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sessionattendance' ORDER BY ordinal_position`);
    console.log(saCols.rows);

    const saConstraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'sessionattendance'::regclass
    `);
    console.log('Constraints:', saConstraints.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
