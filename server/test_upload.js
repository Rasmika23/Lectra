const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    // 1. Create a dummy file
    fs.writeFileSync('dummy.xlsx', 'test excel content');
    
    // 2. Build form
    const form = new FormData();
    form.append('timetable', fs.createReadStream('dummy.xlsx'));

    // 3. Find a real module ID
    const db = require('./db');
    const res = await db.query('SELECT moduleid FROM module LIMIT 1');
    if (res.rows.length === 0) {
      console.log('No modules exist to test upload.');
      process.exit(0);
    }
    const moduleId = res.rows[0].moduleid;

    // 4. POST to endpoint
    const response = await fetch(`http://localhost:5000/modules/${moduleId}/timetable`, {
      method: 'POST',
      body: form
    });
    
    const data = await response.json();
    console.log(data);

    // 5. Cleanup
    fs.unlinkSync('dummy.xlsx');
    process.exit(0);
  } catch(err) {
    console.error('Test upload failed', err);
    process.exit(1);
  }
}

testUpload();
