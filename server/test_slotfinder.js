require('dotenv').config();
const db = require('./db');
const SlotFinderService = require('./services/SlotFinderService');

async function runTest() {
  console.log('--- Starting SlotFinderService Test ---');
  try {
    // 1. Find a module that has a timetable
    const modRes = await db.query('SELECT moduleid, studenttimetablepath FROM module WHERE studenttimetablepath IS NOT NULL LIMIT 1');
    if (modRes.rows.length === 0) {
      console.log('❌ No modules with uploaded timetables found!');
      process.exit(1);
    }
    const module = modRes.rows[0];
    console.log(`✅ Found Module block: ID ${module.moduleid}, Path: ${module.studenttimetablepath}`);

    // 2. Insert a dummy session for this module to test rescheduling
    const sessRes = await db.query(`
      INSERT INTO session (moduleid, lecturerid, datetime, duration, locationorurl, mode, status)
      VALUES ($1, 1, NOW(), '2', 'Test Room', 'Online', 'Scheduled')
      RETURNING sessionid
    `, [module.moduleid]);
    const sessionId = sessRes.rows[0].sessionid;
    console.log(`✅ Created temporary Session ID: ${sessionId} for testing`);

    // 3. Run the SlotFinderService for this session
    console.log(`\n⏳ Running SlotFinderService to generate 5-day grid...`);
    const grid = await SlotFinderService.getAvailableSlots(sessionId, 2, 0); // 2 hours duration, current week
    
    // 4. Print results elegantly
    let busyFound = false;
    grid.forEach(day => {
      console.log(`\n🗓️  ${day.day} (${day.date})`);
      day.slots.forEach(slot => {
        if (slot.status === 'BUSY') {
          busyFound = true;
          console.log(`   [${slot.time}] ❌ BUSY: ${slot.reason}`);
        }
      });
    });

    if (!busyFound) {
      console.log('\n✅ Grid generated, but NO busy slots were found! (Timetable might be empty or formatting unmatched)');
    } else {
      console.log('\n✅ SUCCESS: SlotFinderService effectively blocked out timetable slots!');
    }

    // Cleanup
    await db.query('DELETE FROM session WHERE sessionid = $1', [sessionId]);
    console.log(`\n🧹 Cleaned up temporary Session ID ${sessionId}`);
  } catch (err) {
    console.error('❌ Test failed:', err.message || err);
  } finally {
    process.exit();
  }
}

runTest();
