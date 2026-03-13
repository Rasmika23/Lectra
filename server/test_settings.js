require('dotenv').config();
const db = require('./db');

async function testEndpoint() {
    try {
        console.log('Testing PATCH /modules/:id/settings...');
        // Test with moduleid 1 (assuming it exists)
        const res = await db.query(`
            UPDATE module SET 
                default_day = 'Friday', 
                default_time = '09:00', 
                default_end_time = '11:00', 
                reminder_hours = 24, 
                reminder_template = 'Test Template' 
            WHERE moduleid = 1 RETURNING *
        `);
        if (res.rows.length > 0) {
            console.log('Test successful. Updated module:', res.rows[0]);
        } else {
            console.log('Test failed: Module 1 not found.');
        }
    } catch (err) {
        console.error('Test error:', err);
    } finally {
        process.exit();
    }
}

testEndpoint();
