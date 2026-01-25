require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

async function seedUser() {
    try {
        const password = 'password123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const email = 'main.coordinator@university.edu';
        const name = 'Admin User';
        const role = 'main-coordinator'; // This variable is no longer directly used in the query, but kept as per instruction to not make unrelated edits.

        console.log('Seeding user...');

        // Check if user exists
        const checkRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
            console.log('User already exists, updating password...');
            await db.query('UPDATE users SET passwordhash = $1, roleid = 1 WHERE email = $2', [hashedPassword, email]);
        } else {
            console.log('Creating new user...');
            await db.query(
                'INSERT INTO users (name, email, passwordhash, roleid) VALUES ($1, $2, $3, 1)',
                [name, email, hashedPassword]
            );
        }

        console.log('Seed successful!');
        console.log(`User: ${email}`);
        console.log(`Password: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
}

seedUser();
