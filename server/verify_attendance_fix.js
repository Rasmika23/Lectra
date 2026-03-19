const { Pool } = require('pg');
require('dotenv').config();

async function verify() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    const sessionIdResult = await pool.query('SELECT sessionid FROM session LIMIT 1');
    if (sessionIdResult.rows.length === 0) {
        console.error('No sessions found to test');
        return;
    }
    const sessionId = sessionIdResult.rows[0].sessionid;

    const userIdResult = await pool.query('SELECT userid FROM users LIMIT 1');
    const recordedBy = userIdResult.rows[0].userid;

    const lecturerIdResult = await pool.query('SELECT userid FROM users WHERE roleid = 3 LIMIT 1');
    const mockLecturerId = lecturerIdResult.rows.length > 0 ? lecturerIdResult.rows[0].userid : recordedBy;

    console.log(`--- Verifying Session ${sessionId} with User ${recordedBy} ---`);
    
    // 1. Initial State
    const initialDetails = await pool.query('SELECT * FROM sessiondetails WHERE sessionid = $1', [sessionId]);
    console.log('Initial Details:', initialDetails.rows[0]);

    // 2. Simulate POST with partial data (attendance only)
    console.log('\n--- Simulating Attendance Update Only ---');
    const mockAttendance = { [mockLecturerId]: true };

    await pool.query('BEGIN');
    
    const existingDetails = await pool.query('SELECT * FROM sessiondetails WHERE sessionid = $1', [sessionId]);
    let topicsToSave = existingDetails.rows.length > 0 ? existingDetails.rows[0].topicscovered : 'Initial Topic';
    let durationToSave = existingDetails.rows.length > 0 ? existingDetails.rows[0].actual_duration : 2.0;

    // Simulate sending NO topics/duration in request
    // topicsToSave and durationToSave remain as they are

    await pool.query('DELETE FROM sessiondetails WHERE sessionid = $1', [sessionId]);
    await pool.query(
      'INSERT INTO sessiondetails (sessionid, topicscovered, actual_duration, recordedby, recordedat) VALUES ($1, $2, $3, $4, NOW())',
      [sessionId, topicsToSave, durationToSave, recordedBy]
    );

    await pool.query('DELETE FROM sessionattendance WHERE sessionid = $1', [sessionId]);
    for (const [lId, isAtt] of Object.entries(mockAttendance)) {
        await pool.query(
          'INSERT INTO sessionattendance (sessionid, lecturerid, isattended) VALUES ($1, $2, $3)',
          [sessionId, parseInt(lId), isAtt]
        );
    }
    await pool.query('COMMIT');

    // 3. Verify Result
    const updatedDetails = await pool.query('SELECT * FROM sessiondetails WHERE sessionid = $1', [sessionId]);
    console.log('Updated Details (should match initial/saved):', updatedDetails.rows[0]);
    
    // 4. Verify Fetch Endpoint equivalent
    console.log('\n--- Verifying Fetch Logic (Data Pre-fill) ---');
    const fetchDetails = await pool.query('SELECT * FROM sessiondetails WHERE sessionid = $1', [sessionId]);
    const fetchAttendance = await pool.query('SELECT * FROM sessionattendance WHERE sessionid = $1', [sessionId]);
    
    console.log('Fetched Detail Topic:', fetchDetails.rows[0]?.topicscovered);
    console.log('Fetched Attendance Count:', fetchAttendance.rows.length);

  } catch (err) {
    console.error('Error during verification:', err);
    await pool.query('ROLLBACK');
  } finally {
    await pool.end();
  }
}

verify();
