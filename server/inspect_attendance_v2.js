const { Pool } = require('pg');
require('dotenv').config();

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
    console.log(JSON.stringify(sdCols.rows, null, 2));

    const sdConstraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'sessiondetails'::regclass
    `);
    console.log('Constraints:', JSON.stringify(sdConstraints.rows, null, 2));

    console.log('\n--- sessionattendance table ---');
    const saCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sessionattendance' ORDER BY ordinal_position`);
    console.log(JSON.stringify(saCols.rows, null, 2));

    const saConstraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'sessionattendance'::regclass
    `);
    console.log('Constraints:', JSON.stringify(saConstraints.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
