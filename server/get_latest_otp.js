require('dotenv').config();
const db = require('./db');

async function getOtp() {
    try {
        const res = await db.query("SELECT * FROM verification_tokens WHERE identifier = 'main.coordinator@university.edu' AND type = 'OTP' ORDER BY id DESC LIMIT 1");
        if (res.rows.length > 0) {
            console.log('Latest OTP:', res.rows[0].token);
            console.log('Expires At:', res.rows[0].expires_at);
        } else {
            console.log('No OTP found for main.coordinator@university.edu');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

getOtp();
