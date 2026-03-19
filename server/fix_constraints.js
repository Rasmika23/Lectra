require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function addUniqueConstraints() {
    try {
        console.log('Adding UNIQUE constraint to lecturerprofile(lecturerid)...');
        // Check if lecturerid is already primary key or unique
        // For simplicity, we'll try to add it. If it fails, it might already exist.
        // But lecturerprofile might HAVE lecturerid as PK already?
        // Let's check the table structure more closely.
        
        await pool.query(`
            ALTER TABLE lecturerprofile 
            ADD CONSTRAINT lecturerprofile_lecturerid_unique UNIQUE (lecturerid);
        `);
        console.log('Added UNIQUE constraint to lecturerprofile.');

        console.log('Adding UNIQUE constraint to bankdetails(lecturerid)...');
        await pool.query(`
            ALTER TABLE bankdetails 
            ADD CONSTRAINT bankdetails_lecturerid_unique UNIQUE (lecturerid);
        `);
        console.log('Added UNIQUE constraint to bankdetails.');

        console.log('Success.');
    } catch (err) {
        console.error('Error:', err.message);
        if (err.message.includes('already exists')) {
            console.log('Constraint already exists, skipping.');
        } else {
            // If there are duplicate lecturerids, we might need to clean them up.
            console.log('Failed to add constraint. Duplicate lecturerids might exist.');
        }
    } finally {
        await pool.end();
    }
}

addUniqueConstraints();
