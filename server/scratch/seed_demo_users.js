const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');
const bcrypt = require('bcrypt');

async function seed() {
  const demoUsers = [
    {
      name: 'Main Coordinator',
      email: 'main.coordinator@university.edu',
      password: 'password123',
      roleid: 1, // MainCoordinator
      phonenumber: '+94112233445'
    },
    {
      name: 'Sub Coordinator',
      email: 'sub.coordinator@university.edu',
      password: 'password123',
      roleid: 2, // SubCoordinator
      phonenumber: '+94112233446'
    },
    {
      name: 'Dr. John Smith',
      email: 'lecturer1@example.com',
      password: 'password123',
      roleid: 3, // Lecturer
      phonenumber: '+94112233447',
      profile: {
        address: '123 University Road, Colombo',
        nicnumber: '123456789V'
      }
    },
    {
      name: 'Staff Member',
      email: 'staff@university.edu',
      password: 'password123',
      roleid: 4, // Staff
      phonenumber: '+94112233448'
    }
  ];

  try {
    for (const user of demoUsers) {
      console.log(`Processing user: ${user.email}`);
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Upsert user
      const userRes = await db.query(`
        INSERT INTO users (name, email, passwordhash, roleid, phonenumber)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          passwordhash = EXCLUDED.passwordhash,
          roleid = EXCLUDED.roleid,
          phonenumber = EXCLUDED.phonenumber
        RETURNING userid
      `, [user.name, user.email, hashedPassword, user.roleid, user.phonenumber]);

      const userId = userRes.rows[0].userid;

      // If it's a lecturer, ensure they have a profile
      if (user.roleid === 3 && user.profile) {
        await db.query(`
          INSERT INTO lecturerprofile (lecturerid, address, nicnumber)
          VALUES ($1, $2, $3)
          ON CONFLICT (lecturerid) DO UPDATE SET
            address = EXCLUDED.address,
            nicnumber = EXCLUDED.nicnumber
        `, [userId, user.profile.address, user.profile.nicnumber]);
        console.log(`  Profile created/updated for lecturer: ${user.email}`);
      }
    }
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding demo users:', err);
  } finally {
    process.exit();
  }
}

seed();
