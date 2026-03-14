const { Pool } = require('pg');
const fs = require('fs');
async function check() {
  const env = {};
  fs.readFileSync('.env', 'utf8').split('\n').filter(l=>l.includes('=')).forEach(l=>{const p=l.split('=');env[p[0].trim()]=p.slice(1).join('=').trim()});
  const pool = new Pool({user:env.DB_USER,host:env.DB_HOST,database:env.DB_NAME,password:env.DB_PASSWORD,port:env.DB_PORT});
  // Full session columns
  const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='session' ORDER BY ordinal_position`);
  console.log('Session columns:', cols.rows.map(r=>r.column_name+':'+r.data_type).join(', '));
  // Full module columns
  const mcols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='module' ORDER BY ordinal_position`);
  console.log('Module columns:', mcols.rows.map(r=>r.column_name+':'+r.data_type).join(', '));
  // Sample sessions with all columns
  const s = await pool.query(`SELECT * FROM session LIMIT 3`);
  console.log('Sample sessions:', JSON.stringify(s.rows, null, 2));
  await pool.end();
}
check();
