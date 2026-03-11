const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Login endpoint
// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Join with roles table to get the role name
    const query = `
      SELECT u.*, r.rolename 
      FROM users u 
      JOIN roles r ON u.roleid = r.roleid 
      WHERE u.email = $1
    `;
    const result = await db.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    // Compare with passwordhash
    const match = await bcrypt.compare(password, user.passwordhash);

    if (match) {
      // Map DB role name to frontend expected role string
      // MainCoordinator -> main-coordinator
      // SubCoordinator -> sub-coordinator
      // Lecturer -> lecturer
      // Staff -> staff
      let frontendRole = 'login';
      const dbRole = user.rolename;

      if (dbRole === 'MainCoordinator') frontendRole = 'main-coordinator';
      else if (dbRole === 'SubCoordinator') frontendRole = 'sub-coordinator';
      else if (dbRole === 'Lecturer') frontendRole = 'lecturer';
      else if (dbRole === 'Staff') frontendRole = 'staff';

      const userResponse = {
        id: user.userid,
        name: user.name,
        email: user.email,
        role: frontendRole
      };

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.userid, email: user.email, role: frontendRole },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ user: userResponse, token });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Invite User Endpoint
const { v4: uuidv4 } = require('uuid');
const { sendInviteEmail } = require('./email');

app.post('/users/invite', async (req, res) => {
  const { email, role } = req.body;

  // Map frontend role to DB Role ID
  let roleId = 4; // Default to Staff
  if (role === 'main-coordinator') roleId = 1;
  else if (role === 'sub-coordinator') roleId = 2;
  else if (role === 'lecturer') roleId = 3;
  else if (role === 'staff') roleId = 4;

  try {
    // Check if user exists
    const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Create placeholder data
    const placeholderName = 'Pending Registration';
    const randomPassword = uuidv4();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const newUser = await db.query(
      'INSERT INTO users (name, email, passwordhash, roleid) VALUES ($1, $2, $3, $4) RETURNING userid',
      [placeholderName, email, hashedPassword, roleId]
    );

    // Send Email
    const inviteLink = `http://localhost:3000/setup-account?email=${encodeURIComponent(email)}`;
    const emailResult = await sendInviteEmail(email, inviteLink);

    if (emailResult.success) {
      res.json({ message: 'Invitation sent successfully', userId: newUser.rows[0].userid });
    } else {
      res.status(500).json({ error: 'User created but failed to send email' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during invitation' });
  }
});

// Setup Account Endpoint
app.post('/users/setup', async (req, res) => {
  const { email, name, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    const result = await db.query(
      'UPDATE users SET name = $1, passwordhash = $2 WHERE email = $3 RETURNING *',
      [name, hashedPassword, email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Get user role for token
      const roleResult = await db.query(
        'SELECT rolename FROM roles WHERE roleid = $1',
        [user.roleid]
      );

      let frontendRole = 'staff';
      if (roleResult.rows.length > 0) {
        const dbRole = roleResult.rows[0].rolename;
        if (dbRole === 'MainCoordinator') frontendRole = 'main-coordinator';
        else if (dbRole === 'SubCoordinator') frontendRole = 'sub-coordinator';
        else if (dbRole === 'Lecturer') frontendRole = 'lecturer';
      }

      const userResponse = {
        id: user.userid,
        name: user.name,
        email: user.email,
        role: frontendRole
      };

      const token = jwt.sign(
        { id: user.userid, email: user.email, role: frontendRole },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ message: 'Account set up successfully', user: userResponse, token });
    } else {
      res.status(404).json({ error: 'User not found' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Users Management Endpoints ---

// Get all users
app.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT u.userid as id, u.name, u.email, r.rolename 
      FROM users u 
      JOIN roles r ON u.roleid = r.roleid 
      ORDER BY u.userid DESC
    `;
    const result = await db.query(query);

    // Map DB role name to frontend expected role string
    const mappedUsers = result.rows.map(user => {
      let frontendRole = 'staff';
      const dbRole = user.rolename;

      if (dbRole === 'MainCoordinator') frontendRole = 'main-coordinator';
      else if (dbRole === 'SubCoordinator') frontendRole = 'sub-coordinator';
      else if (dbRole === 'Lecturer') frontendRole = 'lecturer';
      else if (dbRole === 'Staff') frontendRole = 'staff';

      return {
        id: user.id.toString(), // Frontend expects string ID typically, or number is fine. Using toString to be safe.
        name: user.name,
        email: user.email,
        role: frontendRole,
        department: 'Computing', // Temporary mock data for missing fields
        joinDate: new Date().toISOString().split('T')[0],
      };
    });

    res.json(mappedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Delete user
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM users WHERE userid = $1 RETURNING userid', [id]);

    if (result.rows.length > 0) {
      res.json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('Lectra API is running');
});

// Example DB route - to be expanded
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Database connected successfully', time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
