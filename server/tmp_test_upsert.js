require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function testUpsert() {
    const userId = 36;
    const phone = 'TEST_PHONE_123';
    const address = 'TEST_ADDRESS';
    const nicNumber = 'TEST_NIC';

    try {
        console.log('--- Before Upsert ---');
        const before = await pool.query('SELECT * FROM lecturerprofile WHERE lecturerid = $1', [userId]);
        console.log(before.rows[0]);

        console.log('\n--- Running Upsert ---');
        await pool.query(`
            INSERT INTO lecturerprofile (lecturerid, phonenumber, address, nicnumber)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (lecturerid) DO UPDATE SET
              phonenumber = COALESCE(EXCLUDED.phonenumber, lecturerprofile.phonenumber),
              address = COALESCE(EXCLUDED.address, lecturerprofile.address),
              nicnumber = COALESCE(EXCLUDED.nicnumber, lecturerprofile.nicnumber)
        `, [userId, phone, address, nicNumber]);

        console.log('\n--- After Upsert ---');
        const after = await pool.query('SELECT * FROM lecturerprofile WHERE lecturerid = $1', [userId]);
        console.log(after.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

testUpsert();
