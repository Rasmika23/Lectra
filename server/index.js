const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Login endpoint
// Login endpoint
// Login endpoint (Step 1: Credential Check & OTP Generation)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check Credentials
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
    const match = await bcrypt.compare(password, user.passwordhash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Credentials Valid -> Generate OTP
    // Generate 6 digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    // 3. Store in verification_tokens
    await db.query(
      'INSERT INTO verification_tokens (identifier, token, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'OTP', expiresAt]
    );

    // 4. Send Email
    const emailResult = await sendOtpEmail(email, otp);

    // Even if email fails (development), we proceed. 
    if (!emailResult.success) {
      console.error("Failed to send OTP email", emailResult.error);
    } else {
      console.log(`OTP sent to ${email}: ${otp}`); // Log for dev convenience
    }

    // 5. Return status to Frontend
    res.json({
      status: 'OTP_REQUIRED',
      email: email,
      message: 'Credentials verified. Please enter the OTP sent to your email.'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify OTP Endpoint (Step 2: Key Verification)
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // 1. Find valid OTP
    const tokenQuery = `
      SELECT * FROM verification_tokens 
      WHERE identifier = $1 
      AND token = $2 
      AND type = 'OTP' 
      AND expires_at > NOW()
    `;
    const tokenResult = await db.query(tokenQuery, [email, otp]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // 2. OTP Valid -> Fetch User Details for Login
    const userQuery = `
      SELECT u.*, r.rolename 
      FROM users u 
      JOIN roles r ON u.roleid = r.roleid 
      WHERE u.email = $1
    `;
    const userResult = await db.query(userQuery, [email]);
    const user = userResult.rows[0];

    // 3. Map Role
    let frontendRole = 'staff'; // Default
    const dbRole = user.rolename;
    if (dbRole === 'MainCoordinator') frontendRole = 'main-coordinator';
    else if (dbRole === 'SubCoordinator') frontendRole = 'sub-coordinator';
    else if (dbRole === 'Lecturer') frontendRole = 'lecturer';

    const userResponse = {
      id: user.userid,
      name: user.name,
      email: user.email,
      role: frontendRole
    };

    // 4. Delete Used Token (Single Use)
    await db.query('DELETE FROM verification_tokens WHERE id = $1', [tokenResult.rows[0].id]);

    // 5. Return User Session
    res.json(userResponse);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
});

// Invite User Endpoint
// Import OTP email sender
const { sendInviteEmail, sendPasswordResetEmail, sendOtpEmail } = require('./email');

// --- Scheduled Cleanup Job ---
// Runs once every 24 hours to clean up expired tokens
setInterval(async () => {
  try {
    const result = await db.query('DELETE FROM verification_tokens WHERE expires_at < NOW()');
    console.log(`[Cleanup] Deleted ${result.rowCount} expired tokens.`);
  } catch (err) {
    console.error('[Cleanup] Failed to delete expired tokens:', err);
  }
}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

const { v4: uuidv4 } = require('uuid');

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
      'UPDATE users SET name = $1, passwordhash = $2 WHERE email = $3 RETURNING userid',
      [name, hashedPassword, email]
    );

    if (result.rows.length > 0) {
      res.json({ message: 'Account set up successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get All Users Endpoint
app.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT u.userid as id, u.name, u.email, r.rolename as role 
      FROM users u 
      JOIN roles r ON u.roleid = r.roleid
      ORDER BY u.userid ASC
    `;
    const result = await db.query(query);

    // Map DB roles to frontend roles
    const users = result.rows.map(user => {
      let frontendRole = 'staff';
      if (user.role === 'MainCoordinator') frontendRole = 'main-coordinator';
      else if (user.role === 'SubCoordinator') frontendRole = 'sub-coordinator';
      else if (user.role === 'Lecturer') frontendRole = 'lecturer';

      return {
        ...user,
        role: frontendRole
      };
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Delete User Endpoint
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

// Forgot Password Endpoint
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Return 200 even if user doesn't exist to prevent enumeration
      return res.json({ message: 'If an account with that email exists, we have sent a reset link.' });
    }

    // Generate token
    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Store in verification_tokens
    await db.query(
      'INSERT INTO verification_tokens (identifier, token, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, token, 'RESET_PASSWORD', expires]
    );

    // Send email
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetLink);

    res.json({ message: 'If an account with that email exists, we have sent a reset link.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password Endpoint
app.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  try {
    // Find valid token in verification_tokens
    const tokenQuery = `
      SELECT * FROM verification_tokens 
      WHERE token = $1 
      AND type = 'RESET_PASSWORD' 
      AND expires_at > NOW()
    `;
    const tokenResult = await db.query(tokenQuery, [token]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }

    const email = tokenResult.rows[0].identifier;

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await db.query(
      'UPDATE users SET passwordhash = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    // Delete used token
    await db.query('DELETE FROM verification_tokens WHERE id = $1', [tokenResult.rows[0].id]);

    res.json({ message: 'Password has been reset successfully.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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
