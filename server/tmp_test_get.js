require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function testGet() {
    const userId = 36;
    try {
        const query = `
          SELECT 
            u.userid, u.name, u.email,
            lp.phonenumber, lp.address, lp.nicnumber, lp.cvpath,
            bd.bankname, bd.accountnumber, bd.branch, 
            bd.accountholdername, bd.bankcountry, bd.swiftbic, bd.iban
          FROM users u
          LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
          LEFT JOIN bankdetails bd ON u.userid = bd.lecturerid
          WHERE u.userid = $1
        `;
        const res = await pool.query(query, [userId]);
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

testGet();
