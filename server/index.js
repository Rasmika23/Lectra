const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SlotFinderService = require('./services/SlotFinderService');
const multer = require('multer');
const fs = require('fs');
const reportService = require('./services/ReportService');
const auditLog = require('./services/AuditService');
const { sendInviteEmail, sendMail } = require('./email');

// ── JWT Auth Middleware ─────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ── OTP Helper ─────────────────────────────────────────────────────────────
async function generateAndSendOTP(userId, email, purpose) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

  await db.query(`
    INSERT INTO otps (userid, otpcode, purpose, expiresat)
    VALUES ($1, $2, $3, $4)
  `, [userId, otpCode, purpose, expiresAt]);

  const subject = `Lectra Verification Code - ${purpose.replace(/_/g, ' ')}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h1 style="color: #0f172a; margin-bottom: 8px;">Verification Code</h1>
      <p style="color: #64748b; margin-bottom: 24px;">Your verification code for ${purpose.replace(/_/g, ' ').toLowerCase()} is:</p>
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0284c7; background: #f0f9ff; padding: 16px; border-radius: 8px; display: inline-block; margin-bottom: 24px;">
        ${otpCode}
      </div>
      <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px;">If you did not request this code, please ignore this email or contact support if you suspect unauthorized access.</p>
    </div>
  `;
  await sendMail(email, subject, `Your verification code is: ${otpCode}`, html);
  return otpCode;
}

// ── Notification Helper for Sub-Coordinators ────────────────────────────────
async function notifySubCoordinator(moduleId, subject, message) {
  try {
    const moduleRes = await db.query(`
      SELECT m.modulecode, mc.modulename, m.subcoordinatorid 
      FROM module m 
      JOIN module_catalog mc ON m.modulecode = mc.modulecode 
      WHERE m.moduleid = $1
    `, [moduleId]);

    if (moduleRes.rows.length === 0 || !moduleRes.rows[0].subcoordinatorid) return;

    const { modulecode, modulename, subcoordinatorid } = moduleRes.rows[0];
    const subRes = await db.query('SELECT name, email, phonenumber FROM users WHERE userid = $1', [subcoordinatorid]);
    
    if (subRes.rows.length === 0) return;
    const sub = subRes.rows[0];

    const fullSubject = `${subject}: ${modulecode}`;
    const formattedMessage = `Dear ${sub.name},\n\n${message}\n\nModule: ${modulecode} - ${modulename}\n\n_Lectra VLMS_`;
    const htmlMessage = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a;">${subject}</h2>
        <p>Dear ${sub.name},</p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p><strong>Module:</strong> ${modulecode} - ${modulename}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from Lectra VLMS.</p>
      </div>
    `;

    if (sub.email) {
      await sendMail(sub.email, fullSubject, formattedMessage, htmlMessage);
    }

    if (sub.phonenumber) {
      const waMessage = `*${subject}*\n\n${formattedMessage}`;
      await whatsappService.sendMessage(sub.phonenumber, waMessage);
    }
  } catch (err) {
    console.error('Error in notifySubCoordinator:', err);
  }
}

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up static uploads folder
const uploadDir = path.join(__dirname, 'uploads');
const cvUploadDir = path.join(uploadDir, 'cvs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(cvUploadDir)) {
  fs.mkdirSync(cvUploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Save file with module ID context if available
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `timetable-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage: storage });

// Multer Config for CVs
const cvStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, cvUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `cv-${uniqueSuffix}${ext}`);
  }
});
const cvUpload = multer({ storage: cvStorage });

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
      const dbRole = user.rolename ? user.rolename.trim() : '';

      if (dbRole.toLowerCase() === 'main-coordinator') frontendRole = 'main-coordinator';
      else if (dbRole.toLowerCase() === 'sub-coordinator') frontendRole = 'sub-coordinator';
      else if (dbRole.toLowerCase() === 'lecturer') frontendRole = 'lecturer';
      else if (dbRole.toLowerCase() === 'staff') frontendRole = 'staff';

      const userResponse = {
        id: user.userid,
        userid: user.userid,
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

      // Record login audit log
      await auditLog.record(user.userid, 'LOGIN', 'USER', user.userid, { email: user.email }, req);

      res.json({ token, user: userResponse });
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
    const inviteLink = `${process.env.VITE_FRONTEND_URL || 'http://localhost:3000'}/setup-account?email=${encodeURIComponent(email)}`;
    const emailResult = await sendInviteEmail(email, inviteLink);

    if (emailResult.success) {
      await auditLog.record(req.user ? req.user.id : null, 'INVITE_USER', 'USER', newUser.rows[0].userid, { email, role }, req);
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
        const dbRole = roleResult.rows[0].rolename ? roleResult.rows[0].rolename.trim() : '';
        if (dbRole.toLowerCase() === 'main-coordinator') frontendRole = 'main-coordinator';
        else if (dbRole.toLowerCase() === 'sub-coordinator') frontendRole = 'sub-coordinator';
        else if (dbRole.toLowerCase() === 'lecturer') frontendRole = 'lecturer';
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

      await auditLog.record(user.userid, 'ACCOUNT_SETUP', 'USER', user.userid, { email: user.email }, req);

      res.json({ message: 'Account set up successfully', user: userResponse, token });
    } else {
      res.status(404).json({ error: 'User not found' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Auth & Profile Management Endpoints ---

// Request OTP endpoint
app.post('/auth/request-otp', authenticateToken, async (req, res) => {
  const { purpose } = req.body;
  if (!purpose) return res.status(400).json({ error: 'Purpose is required' });

  try {
    const userRes = await db.query('SELECT email FROM users WHERE userid = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    await generateAndSendOTP(req.user.id, userRes.rows[0].email, purpose);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error requesting OTP:', err);
    res.status(500).json({ error: 'Server error sending OTP' });
  }
});

// Verify OTP endpoint
app.post('/auth/verify-otp', authenticateToken, async (req, res) => {
  const { otpCode, purpose } = req.body;
  if (!otpCode || !purpose) return res.status(400).json({ error: 'OTP code and purpose are required' });

  try {
    const otpRes = await db.query(`
      SELECT * FROM otps 
      WHERE userid = $1 AND otpcode = $2 AND purpose = $3 AND verified = FALSE AND expiresat > NOW()
      ORDER BY createdat DESC LIMIT 1
    `, [req.user.id, otpCode, purpose]);

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await db.query('UPDATE otps SET verified = TRUE WHERE otpid = $1', [otpRes.rows[0].otpid]);
    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
});

// Update core user profile (Name, Email, Password)
app.patch('/user/profile', authenticateToken, async (req, res) => {
  const { name, email, phone, currentPassword, newPassword, otpCode } = req.body;
  const userId = parseInt(req.user.id);
  try {
    const userRes = await db.query('SELECT * FROM users WHERE userid = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    let updateQuery = 'UPDATE users SET name = $1';
    let updateParams = [name || user.name];

    // Phone Number update
    if (phone !== undefined) {
      updateQuery += `, phonenumber = $${updateParams.length + 1}`;
      updateParams.push(phone);
    }

    // 1. Password Change Logic
    if (newPassword) {
      if (!currentPassword || !otpCode) {
        return res.status(400).json({ error: 'Current password and OTP required for password change' });
      }

      // Verify current password
      const match = await bcrypt.compare(currentPassword, user.passwordhash);
      if (!match) return res.status(401).json({ error: 'Incorrect current password' });

      // Verify OTP
      const otpVerify = await db.query(`
        SELECT * FROM otps 
        WHERE userid = $1 AND otpcode = $2 AND purpose = 'PASSWORD_CHANGE' AND verified = TRUE
        ORDER BY createdat DESC LIMIT 1
      `, [userId, otpCode]);

      if (otpVerify.rows.length === 0) return res.status(403).json({ error: 'OTP not verified for password change' });

      const newHashed = await bcrypt.hash(newPassword, 10);
      updateQuery += `, passwordhash = $${updateParams.length + 1}`;
      updateParams.push(newHashed);
    }

    // 2. Email Change Logic
    if (email && email !== user.email) {
      if (!otpCode) return res.status(400).json({ error: 'OTP required for email change' });

      // Verify OTP specifically for email change
      const otpVerify = await db.query(`
        SELECT * FROM otps 
        WHERE userid = $1 AND otpcode = $2 AND purpose = 'EMAIL_CHANGE' AND verified = TRUE
        ORDER BY createdat DESC LIMIT 1
      `, [userId, otpCode]);

      if (otpVerify.rows.length === 0) return res.status(403).json({ error: 'OTP not verified for email change' });

      // Check if email already taken
      const emailCheck = await db.query('SELECT 1 FROM users WHERE email = $1 AND userid != $2', [email, userId]);
      if (emailCheck.rows.length > 0) return res.status(409).json({ error: 'Email already in use' });

      updateQuery += `, email = $${updateParams.length + 1}`;
      updateParams.push(email);
    }

    updateQuery += ` WHERE userid = $${updateParams.length + 1} RETURNING userid, name, email`;
    updateParams.push(userId);

    const updated = await db.query(updateQuery, updateParams);
    
    await auditLog.record(userId, 'UPDATE_PROFILE', 'USER', userId, { fields: Object.keys(req.body).filter(k => k !== 'currentPassword' && k !== 'newPassword' && k !== 'otpCode') }, req);

    res.json({ message: 'Profile updated successfully', user: updated.rows[0] });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// --- Users Management Endpoints ---

// Get all users
app.get('/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator' && req.user.role !== 'sub-coordinator') return res.status(403).json({ error: 'Access denied' });
  try {
    const query = `
      SELECT 
        u.userid, 
        u.name, 
        u.email, 
        r.rolename,
        lp.cvpath,
        CASE
          WHEN r.rolename = 'sub-coordinator' THEN
            (SELECT string_agg(m.modulecode, ', ') FROM module m WHERE m.subcoordinatorid = u.userid)
          WHEN r.rolename = 'lecturer' THEN
            (SELECT string_agg(mc.modulecode, ', ') 
             FROM module m 
             JOIN module_catalog mc ON m.modulecode = mc.modulecode
             JOIN modulelecturer ml ON m.moduleid = ml.moduleid 
             WHERE ml.lecturerid = u.userid)
          ELSE NULL
        END as assignedmodules
      FROM users u 
      JOIN roles r ON u.roleid = r.roleid 
      LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
      ORDER BY u.userid DESC
    `;
    const result = await db.query(query);

    // Map DB role name to frontend expected role string
    const mappedUsers = result.rows.map(user => {
      let frontendRole = 'staff';
      const dbRole = user.rolename ? user.rolename.trim() : '';

      if (dbRole.toLowerCase() === 'main-coordinator') frontendRole = 'main-coordinator';
      else if (dbRole.toLowerCase() === 'sub-coordinator') frontendRole = 'sub-coordinator';
      else if (dbRole.toLowerCase() === 'lecturer') frontendRole = 'lecturer';
      else if (dbRole.toLowerCase() === 'staff') frontendRole = 'staff';

      return {
        id: user.userid,
        userid: user.userid,
        name: user.name,
        email: user.email,
        role: frontendRole,
        assignedModules: user.assignedmodules || '',
        cvPath: user.cvpath
      };
    });

    res.json(mappedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Get modules assigned to a specific lecturer
app.get('/lecturers/:id/modules', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT 
        m.moduleid, 
        m.modulecode, 
        mc.modulename, 
        t.academicyear, 
        t.semester,
        (
          SELECT json_agg(json_build_object('id', u_lect.userid, 'name', u_lect.name))
          FROM modulelecturer ml
          JOIN users u_lect ON ml.lecturerid = u_lect.userid
          WHERE ml.moduleid = m.moduleid
        ) as lecturers
      FROM module m
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      JOIN modulelecturer ml ON m.moduleid = ml.moduleid
      WHERE ml.lecturerid = $1
      ORDER BY t.academicyear DESC, t.semester, m.modulecode
    `, [parseInt(id)]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lecturer modules:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sessions for a specific module
app.get('/modules/:id/sessions', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        s.sessionid,
        s.sessionid as id,
        s.moduleid,
        m.modulecode,
        mc.modulename,
        s.lecturerid,
        s.datetime,
        to_char(s.datetime, 'YYYY-MM-DD') as date,
        to_char(s.datetime, 'HH24:MI') as time,
        s.duration::float,
        s.locationorurl,
        s.locationorurl as location,
        s.status,
        s.mode,
        s.reminder_sent,
        u.name as lecturername
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      LEFT JOIN users u ON s.lecturerid = u.userid
      WHERE s.moduleid = $1
      ORDER BY s.datetime ASC
    `;
    const result = await db.query(query, [parseInt(id)]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching module sessions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all sessions for a specific lecturer across all modules
app.get('/lecturers/:id/sessions', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        s.sessionid,
        s.sessionid as id,
        s.moduleid,
        m.modulecode,
        mc.modulename,
        t.academicyear,
        t.semester,
        s.lecturerid,
        s.datetime,
        to_char(s.datetime, 'YYYY-MM-DD') as date,
        to_char(s.datetime, 'HH24:MI') as time,
        s.duration::float,
        s.locationorurl,
        s.locationorurl as location,
        s.status,
        s.mode,
        u.name as lecturername
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      JOIN modulelecturer ml ON m.moduleid = ml.moduleid
      LEFT JOIN users u ON s.lecturerid = u.userid
      WHERE ml.lecturerid = $1
      ORDER BY s.datetime ASC
    `;
    const result = await db.query(query, [parseInt(id)]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lecturer summary sessions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get lecturer profile and bank details
app.get('/lecturer/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access denied. Lecturers only.' });
  }

  try {
    const userId = req.user.id;
    
    // Fetch user info, profile, and bank details
    const query = `
      SELECT 
        u.userid, u.name, u.email, u.phonenumber,
        lp.address, lp.nicnumber, lp.cvpath,
        b.bankname, bd.accountnumber, bd.branch, 
        bd.accountholdername, b.country as bankcountry, b.swiftbic, bd.iban
      FROM users u
      LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
      LEFT JOIN bankdetails bd ON u.userid = bd.lecturerid
      LEFT JOIN banks b ON bd.bankid = b.bankid
      WHERE u.userid = $1
    `;
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    const row = result.rows[0];
    console.log('Fetched data (first row):', { phonenumber: row.phonenumber, address: row.address, nicnumber: row.nicnumber });
    res.json({
      id: row.userid,
      name: row.name,
      email: row.email,
      phone: row.phonenumber || '',
      address: row.address || '',
      nicNumber: row.nicnumber || '',
      cvUploaded: !!row.cvpath,
      cvFileName: row.cvpath ? path.basename(row.cvpath) : null,
      bankDetails: {
        bankName: row.bankname || '',
        accountNumber: row.accountnumber || '',
        branch: row.branch || '',
        accountHolderName: row.accountholdername || '',
        bankCountry: row.bankcountry || '',
        swiftBic: row.swiftbic || '',
        iban: row.iban || ''
      }
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CV Upload endpoint
app.post('/lecturer/profile/cv', authenticateToken, cvUpload.single('cv'), async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access denied. Lecturers only.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const userId = req.user.id;
  const relativePath = `uploads/cvs/${req.file.filename}`;
  
  try {
    // Update or insert lecturer profile with the new CV path
    await db.query(`
      INSERT INTO lecturerprofile (lecturerid, cvpath)
      VALUES ($1, $2)
      ON CONFLICT (lecturerid) DO UPDATE SET
        cvpath = EXCLUDED.cvpath
    `, [userId, relativePath]);

    await auditLog.record(userId, 'UPLOAD_CV', 'LECTURER_PROFILE', userId, { filename: req.file.filename, path: relativePath }, req);

    res.json({ 
      message: 'CV uploaded successfully', 
      cvpath: relativePath,
      cvFileName: req.file.filename 
    });
  } catch (err) {
    console.error('Error uploading CV:', err);
    res.status(500).json({ error: 'Server error during CV upload' });
  }
});

// Delete CV endpoint
app.delete('/lecturer/profile/cv', authenticateToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access denied. Lecturers only.' });
  }

  const userId = parseInt(req.user.id);
  try {
    // 1. Get current CV path
    const result = await db.query('SELECT cvpath FROM lecturerprofile WHERE lecturerid = $1', [userId]);
    
    if (result.rows.length === 0 || !result.rows[0].cvpath) {
      return res.status(404).json({ error: 'No CV found to delete' });
    }

    const currentPath = result.rows[0].cvpath;
    const fullPath = path.join(__dirname, currentPath);

    // 2. Delete physical file if it exists
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (fileErr) {
        console.error('Error deleting physical CV file:', fileErr);
        // We continue anyway to clear the DB entry
      }
    }

    // 3. Clear path in database
    await db.query('UPDATE lecturerprofile SET cvpath = NULL WHERE lecturerid = $1', [userId]);

    await auditLog.record(userId, 'DELETE_CV', 'LECTURER_PROFILE', userId, { oldPath: currentPath }, req);

    res.json({ message: 'CV deleted successfully' });
  } catch (err) {
    console.error('Error deleting CV:', err);
    res.status(500).json({ error: 'Server error during CV deletion' });
  }
});

// Download CV endpoint
app.get('/lecturers/:id/cv/download', authenticateToken, async (req, res) => {
  // Allow Main Coordinators and Sub-Coordinators
  if (req.user.role !== 'main-coordinator' && req.user.role !== 'sub-coordinator' && req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { id } = req.params;
  const targetId = parseInt(id);

  try {
    const result = await db.query('SELECT cvpath FROM lecturerprofile WHERE lecturerid = $1', [targetId]);
    
    if (result.rows.length === 0 || !result.rows[0].cvpath) {
      return res.status(404).json({ error: 'CV not found for this lecturer' });
    }

    const cvPath = result.rows[0].cvpath;
    const fullPath = path.join(__dirname, cvPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'CV file not found on server' });
    }

    res.download(fullPath, path.basename(cvPath));
  } catch (err) {
    console.error('Error downloading CV:', err);
    res.status(500).json({ error: 'Server error during CV download' });
  }
});

// Update lecturer profile and bank details
app.post('/lecturer/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access denied. Lecturers only.' });
  }

  const { phone, address, nicNumber, bankDetails, otpCode } = req.body;
  const userId = parseInt(req.user.id);
  try {
    await db.query('BEGIN');

    // 1. If bank details are being changed, verify OTP
    if (bankDetails) {
      if (!otpCode) {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: 'OTP required to change bank details' });
      }

      const otpVerify = await db.query(`
        SELECT * FROM otps 
        WHERE userid = $1 AND otpcode = $2 AND purpose = 'BANK_DETAILS_CHANGE' AND verified = TRUE
        ORDER BY createdat DESC LIMIT 1
      `, [userId, otpCode]);

      if (otpVerify.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(403).json({ error: 'OTP not verified for bank details change' });
      }
    }

    // 1. Update lecturerprofile if contact details are provided
    if (phone !== undefined || address !== undefined || nicNumber !== undefined) {
      // Update users table for phone number
      if (phone !== undefined) {
        await db.query('UPDATE users SET phonenumber = $1 WHERE userid = $2', [phone, userId]);
      }

      const lpResult = await db.query(`
        INSERT INTO lecturerprofile (lecturerid, address, nicnumber)
        VALUES ($1, $2, $3)
        ON CONFLICT (lecturerid) DO UPDATE SET
          address = COALESCE(EXCLUDED.address, lecturerprofile.address),
          nicnumber = COALESCE(EXCLUDED.nicnumber, lecturerprofile.nicnumber)
        RETURNING *
      `, [userId, address, nicNumber]);
    }

    // 2. Update bankdetails if provided
    if (bankDetails) {
      await db.query(`
        INSERT INTO banks (bankname, swiftbic, country)
        VALUES ($1, $2, $3)
        ON CONFLICT (bankname) DO UPDATE SET
          swiftbic = EXCLUDED.swiftbic,
          country = EXCLUDED.country
      `, [bankDetails.bankName, bankDetails.swiftBic, bankDetails.bankCountry]);

      await db.query(`
        INSERT INTO bankdetails (
          lecturerid, bankid, accountnumber, branch, 
          accountholdername, iban
        )
        VALUES (
          $1, 
          (SELECT bankid FROM banks WHERE bankname = $2),
          $3, $4, $5, $6
        )
        ON CONFLICT (lecturerid) DO UPDATE SET
          bankid = EXCLUDED.bankid,
          accountnumber = EXCLUDED.accountnumber,
          branch = EXCLUDED.branch,
          accountholdername = EXCLUDED.accountholdername,
          iban = EXCLUDED.iban
      `, [
        userId, 
        bankDetails.bankName, 
        bankDetails.accountNumber, 
        bankDetails.branch || '',
        bankDetails.accountHolderName,
        bankDetails.iban
      ]);
    }

    await db.query('COMMIT');
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /sessions/:id/send-reminder — manually trigger reminders
app.post('/sessions/:id/send-reminder', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const sessionId = parseInt(id);
    
    if (isNaN(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    try {
        await reminderScheduler.triggerManualReminder(sessionId);
        res.json({ success: true, message: 'Reminder sent successfully' });
    } catch (err) {
        console.error('Error sending manual reminder:', err);
        res.status(500).json({ error: 'Failed to send reminder' });
    }
});


// DELETE /sessions/:id — delete a specific session
app.delete('/sessions/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const sessionId = parseInt(id);
        if (isNaN(sessionId)) return res.status(400).json({ error: 'Invalid session ID' });

        // Optional: Check if the user is the sub-coordinator or main-coordinator
        // For simplicity and since it's an internal tool, we'll allow authenticated users for now, 
        // but normally we'd join with module and check subcoordinatorid.
        const result = await db.query('DELETE FROM session WHERE sessionid = $1 RETURNING *', [sessionId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const deletedSession = result.rows[0];
        await auditLog.record(req.user.id, 'DELETE_SESSION', 'SESSION', sessionId, { moduleid: deletedSession.moduleid, datetime: deletedSession.datetime }, req);
        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Update session details (Reschedule or change Location)
app.patch('/sessions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { datetime, duration, location, lecturerid } = req.body;

  try {
    const sessionId = parseInt(id);
    
    // 1. Fetch current session to check permissions and compare values
    const currentRes = await db.query(`
      SELECT s.*, m.subcoordinatorid 
      FROM session s 
      JOIN module m ON s.moduleid = m.moduleid 
      WHERE s.sessionid = $1
    `, [sessionId]);

    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const current = currentRes.rows[0];

    // 2. Permission check: Sub-coordinator of the module OR any lecturer assigned to the module
    const isSub = current.subcoordinatorid === req.user.id && req.user.role === 'sub-coordinator';
    let isLecturer = false;
    if (req.user.role === 'lecturer') {
      const mlRes = await db.query('SELECT 1 FROM modulelecturer WHERE moduleid = $1 AND lecturerid = $2', [current.moduleid, req.user.id]);
      isLecturer = mlRes.rows.length > 0;
    }

    if (!isSub && !isLecturer && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 3. Determine if this is a reschedule (time/duration change)
    const newDatetime = datetime ? new Date(datetime) : null;
    const oldDatetime = new Date(current.datetime);
    
    // Check if time changed (compare epoch to ignore minor format differences)
    const timeChanged = newDatetime && newDatetime.getTime() !== oldDatetime.getTime();
    const durationChanged = duration && parseFloat(duration) !== parseFloat(current.duration);
    
    const isRescheduling = timeChanged || durationChanged;

    let status = current.status;
    let previousDatetime = current.previous_datetime;

    if (isRescheduling) {
      status = 'Rescheduled';
      previousDatetime = current.datetime;
    }

    // 4. Perform update
    const result = await db.query(
      `UPDATE session 
       SET 
         datetime = COALESCE($1, datetime), 
         duration = COALESCE($2, duration), 
         locationorurl = COALESCE($3, locationorurl), 
         lecturerid = COALESCE($4, lecturerid), 
         status = $5,
         previous_datetime = $6
       WHERE sessionid = $7 
       RETURNING *`,
      [
        datetime || null, 
        duration !== undefined ? parseFloat(duration) : null, 
        location !== undefined ? location : null, 
        lecturerid || null, 
        status,
        previousDatetime,
        sessionId
      ]
    );

    const updatedSession = result.rows[0];

    // 5. Notifications & Audit Logging
    if (isRescheduling) {
      await auditLog.record(req.user.id, 'RESCHEDULE_SESSION', 'SESSION', sessionId, { 
        moduleid: updatedSession.moduleid, 
        oldTime: current.datetime, 
        newTime: updatedSession.datetime 
      }, req);

      // Notify Sub-Coordinator if someone else rescheduled
      if (current.subcoordinatorid && current.subcoordinatorid !== req.user.id) {
        const msg = `Lecturer ${req.user.name} has rescheduled a session.\n\n` +
                    `Original: ${new Date(current.datetime).toLocaleString()}\n` +
                    `New: ${new Date(updatedSession.datetime).toLocaleString()}`;
        await notifySubCoordinator(updatedSession.moduleid, 'Session Rescheduled', msg);
      }
    } else {
      await auditLog.record(req.user.id, 'UPDATE_SESSION', 'SESSION', sessionId, { fields: Object.keys(req.body) }, req);
    }

    res.json(updatedSession);
  } catch (err) {
    console.error('Error updating session:', err);
    res.status(500).json({ error: 'Server error updating session' });
  }
});

// Assign responsibility for a session
app.patch('/sessions/:id/assign', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lecturerid } = req.body; // Can be null for "All"

  try {
    const sessionId = parseInt(id);
    if (isNaN(sessionId)) return res.status(400).json({ error: 'Invalid session ID' });

    // Verify requesting lecturer is part of the module
    const authCheck = await db.query(`
      SELECT ml.moduleid
      FROM modulelecturer ml
      JOIN session s ON ml.moduleid = s.moduleid
      WHERE s.sessionid = $1 AND ml.lecturerid = $2
    `, [sessionId, req.user.id]);

    if (authCheck.rows.length === 0 && req.user.role !== 'main-coordinator' && req.user.role !== 'sub-coordinator') {
      return res.status(403).json({ error: 'Not authorized to assign this session' });
    }

    const result = await db.query(
      'UPDATE session SET lecturerid = $1 WHERE sessionid = $2 RETURNING *',
      [lecturerid || null, sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const targetLecturerName = lecturerid ? 
      (await db.query('SELECT name FROM users WHERE userid = $1', [lecturerid])).rows[0]?.name : 
      'All Lecturers';

    await auditLog.record(req.user.id, 'ASSIGN_SESSION', 'SESSION', sessionId, { 
      lecturerid, 
      lecturerName: targetLecturerName,
      moduleid: result.rows[0].moduleid 
    }, req);

    res.json({ message: 'Session assigned successfully', session: result.rows[0] });
  } catch (err) {
    console.error('Error assigning session:', err);
    res.status(500).json({ error: 'Server error assigning session' });
  }
});

// Delete user
app.delete('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const targetUserId = parseInt(id);

  if (isNaN(targetUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Permission Check: Only Main Coordinator can delete users
  if (req.user.role !== 'main-coordinator') {
    return res.status(403).json({ error: 'Access denied. Only Main Coordinators can delete users.' });
  }

  // Prevent self-deletion
  if (req.user.id === targetUserId) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    await db.query('BEGIN');

    // 1. Delete OTPs (already has CASCADE in DB, but good to be explicit or just let CASCADE handle it)
    await db.query('DELETE FROM otps WHERE userid = $1', [targetUserId]);

    // 2. Delete Lecturer Profile & Bank Details
    await db.query('DELETE FROM lecturerprofile WHERE lecturerid = $1', [targetUserId]);
    await db.query('DELETE FROM bankdetails WHERE lecturerid = $1', [targetUserId]);

    // 3. Delete Module Assignments & Attendance
    await db.query('DELETE FROM modulelecturer WHERE lecturerid = $1', [targetUserId]);
    await db.query('DELETE FROM sessionattendance WHERE lecturerid = $1', [targetUserId]);
    await db.query('DELETE FROM reminder WHERE recipientid = $1', [targetUserId]);

    // 4. Update references in related tables (don't delete the records themselves)
    
    // Set subcoordinator to NULL in modules
    await db.query('UPDATE module SET subcoordinatorid = NULL WHERE subcoordinatorid = $1', [targetUserId]);
    
    // Set lecturer to NULL in sessions
    await db.query('UPDATE session SET lecturerid = NULL WHERE lecturerid = $1', [targetUserId]);
    
    // Set recorder to NULL in session details
    await db.query('UPDATE sessiondetails SET recordedby = NULL WHERE recordedby = $1', [targetUserId]);
    
    // Set user to NULL in audit logs (if we want to preserve the history)
    await db.query('UPDATE audit_log SET user_id = NULL WHERE user_id = $1', [targetUserId]);

    // 5. Finally delete the user
    const result = await db.query('DELETE FROM users WHERE userid = $1 RETURNING userid', [targetUserId]);

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await auditLog.record(req.user.id, 'DELETE_USER', 'USER', targetUserId, { targetUserId }, req);
    
    await db.query('COMMIT');
    res.json({ message: 'User and all associated data handled successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error deleting user: ' + err.message });
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('Lectra API is running');
});

// ══════════════════════════════════════════════════════════════════════════════
// MODULE SCHEDULE (weekly recurring slots → auto-generate sessions)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate/regenerate future sessions for a module from its schedule slots.
 * - Deletes sessions WHERE scheduleddate >= TODAY
 * - Creates one session per week per slot until semesterenddate
 */
async function generateSessionsForModule(moduleId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get semester end date
  const modRes = await db.query('SELECT t.semesterenddate FROM module m JOIN academic_terms t ON m.termid = t.termid WHERE m.moduleid = $1', [moduleId]);
  if (!modRes.rows.length) return;
  const endDate = modRes.rows[0].semesterenddate;
  if (!endDate) return;

  // Delete future sessions for this module
  await db.query(
    "DELETE FROM session WHERE moduleid = $1 AND datetime >= $2",
    [moduleId, today]
  );

  // Get all schedule slots
  const slotsRes = await db.query(
    'SELECT * FROM moduleschedule WHERE moduleid = $1',
    [moduleId]
  );
  if (!slotsRes.rows.length) return;

  const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  for (const slot of slotsRes.rows) {
    const targetDay = dayMap[slot.day];
    if (targetDay === undefined) continue;

    const cur = new Date(today);
    const curDay = cur.getDay();
    let daysUntilTarget = (targetDay - curDay + 7) % 7;
    cur.setDate(cur.getDate() + daysUntilTarget);

    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dateTimeStr = `${dateStr} ${slot.starttime}`;
      
      await db.query(
        `INSERT INTO session (moduleid, datetime, duration, locationorurl, status, mode)
         VALUES ($1, $2, $3, $4, 'Scheduled', 'Physical')`,
        [moduleId, dateTimeStr, slot.duration, slot.location || '']
      );
      cur.setDate(cur.getDate() + 7);
    }
  }
}

// GET /modules/:id/schedule — get all schedule slots
app.get('/modules/:id/schedule', async (req, res) => {
  const { id } = req.params;
  try {
    const [slotsRes, modRes] = await Promise.all([
      db.query('SELECT * FROM moduleschedule WHERE moduleid = $1 ORDER BY scheduleid', [parseInt(id)]),
      db.query('SELECT t.semesterenddate FROM module m JOIN academic_terms t ON m.termid = t.termid WHERE m.moduleid = $1', [parseInt(id)]),
    ]);
    res.json({
      slots: slotsRes.rows,
      semesterenddate: modRes.rows[0]?.semesterenddate || null,
    });
  } catch (err) {
    console.error('Error fetching schedule:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /modules/:id/schedule — add a new slot (sub-coordinator)
app.post('/modules/:id/schedule', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { day, starttime, duration, location } = req.body;
  if (!day || !starttime || !duration) {
    return res.status(400).json({ error: 'day, starttime, and duration are required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO moduleschedule (moduleid, day, starttime, duration, location) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [parseInt(id), day, starttime, parseFloat(duration), location || '']
    );
    await generateSessionsForModule(parseInt(id));
    
    const slot = result.rows[0];
    await auditLog.record(req.user.id, 'ADD_SCHEDULE_SLOT', 'MODULE', parseInt(id), { day, starttime, duration, location }, req);
    
    res.json(slot);
  } catch (err) {
    console.error('Error adding schedule slot:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// PUT /modules/:id/schedule/:slotId — update a slot (sub-coordinator)
app.put('/modules/:id/schedule/:slotId', authenticateToken, async (req, res) => {
  const { id, slotId } = req.params;
  const { day, starttime, duration, location } = req.body;
  try {
    const result = await db.query(
      'UPDATE moduleschedule SET day=$1, starttime=$2, duration=$3, location=$4 WHERE scheduleid=$5 AND moduleid=$6 RETURNING *',
      [day, starttime, parseFloat(duration), location || '', parseInt(slotId), parseInt(id)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Slot not found' });
    await generateSessionsForModule(parseInt(id));
    
    const slot = result.rows[0];
    await auditLog.record(req.user.id, 'UPDATE_SCHEDULE_SLOT', 'MODULE', parseInt(id), { slotId, day, starttime, duration, location }, req);
    
    res.json(slot);
  } catch (err) {
    console.error('Error updating slot:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// DELETE /modules/:id/schedule/:slotId — delete a slot (sub-coordinator)
app.delete('/modules/:id/schedule/:slotId', async (req, res) => {
  const { id, slotId } = req.params;
  try {
    await db.query('DELETE FROM moduleschedule WHERE scheduleid=$1 AND moduleid=$2', [parseInt(slotId), parseInt(id)]);
    await generateSessionsForModule(parseInt(id));
    await auditLog.record(req.user ? req.user.id : null, 'DELETE_SCHEDULE_SLOT', 'MODULE', parseInt(id), { slotId }, req);
    res.json({ message: 'Slot deleted and sessions regenerated' });
  } catch (err) {
    console.error('Error deleting slot:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /modules/:id/semesterenddate — update semester end date (sub-coordinator)
app.put('/modules/:id/semesterenddate', async (req, res) => {
  const { id } = req.params;
  const { semesterenddate } = req.body;
  try {
    await db.query('UPDATE academic_terms SET semesterenddate=$1 WHERE termid = (SELECT termid FROM module WHERE moduleid=$2)', [semesterenddate || null, parseInt(id)]);
    await generateSessionsForModule(parseInt(id));
    await auditLog.record(req.user ? req.user.id : null, 'UPDATE_SEMESTER_END', 'MODULE', parseInt(id), { semesterenddate }, req);
    res.json({ message: 'Semester end date updated and sessions regenerated' });
  } catch (err) {
    console.error('Error updating semester end date:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all modules with assignments
app.get('/modules', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        m.moduleid, 
        m.modulecode, 
        mc.modulename, 
        t.academicyear, 
        t.semester, 
        m.studenttimetablepath,
        t.semesterenddate,
        m.reminder_hours,
        m.reminder_template,
        u_sub.name as subcoordinator,
        m.subcoordinatorid as subcoordinatorid,
        m.subcoordinatorid as sub_coordinator_id,
        (
          SELECT json_agg(json_build_object('id', u_lect.userid, 'name', u_lect.name))
          FROM modulelecturer ml
          JOIN users u_lect ON ml.lecturerid = u_lect.userid
          WHERE ml.moduleid = m.moduleid
        ) as lecturers
      FROM module m
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      LEFT JOIN users u_sub ON m.subcoordinatorid = u_sub.userid
      ORDER BY t.academicyear DESC, t.semester DESC, m.modulecode ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching modules:', err);
    res.status(500).json({ error: 'Server error fetching modules' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TERM MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// Get all terms
app.get('/terms', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM academic_terms ORDER BY academicyear DESC, semester DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching terms:', err);
    res.status(500).json({ error: 'Server error fetching terms' });
  }
});

// Create a new term
app.post('/terms', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  const { academicyear, semester, semesterenddate } = req.body;
  if (semesterenddate && new Date(semesterenddate) < new Date().setHours(0,0,0,0)) {
    return res.status(400).json({ error: 'Semester end date must be in the future' });
  }
  try {
    const result = await db.query(
      'INSERT INTO academic_terms (academicyear, semester, semesterenddate) VALUES ($1, $2, $3) RETURNING *',
      [academicyear, semester, semesterenddate || null]
    );
    await auditLog.record(req.user.id, 'CREATE_TERM', 'TERM', result.rows[0].termid, { academicyear, semester }, req);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Term with this academic year and semester already exists' });
    }
    console.error('Error creating term:', err);
    res.status(500).json({ error: 'Server error creating term' });
  }
});

// Update a term
app.put('/terms/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  const { academicyear, semester, semesterenddate } = req.body;
  if (semesterenddate && new Date(semesterenddate) < new Date().setHours(0,0,0,0)) {
    return res.status(400).json({ error: 'Semester end date must be in the future' });
  }
  try {
    const result = await db.query(
      'UPDATE academic_terms SET academicyear = $1, semester = $2, semesterenddate = $3 WHERE termid = $4 RETURNING *',
      [academicyear, semester, semesterenddate || null, parseInt(id)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Term not found' });
    await auditLog.record(req.user.id, 'UPDATE_TERM', 'TERM', parseInt(id), { academicyear, semester, semesterenddate }, req);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Term with this academic year and semester already exists' });
    }
    console.error('Error updating term:', err);
    res.status(500).json({ error: 'Server error updating term' });
  }
});

// Delete a term
app.delete('/terms/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  try {
    const checkRes = await db.query('SELECT 1 FROM module WHERE termid = $1', [parseInt(id)]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete term because modules are assigned to it' });
    }
    const result = await db.query('DELETE FROM academic_terms WHERE termid = $1 RETURNING *', [parseInt(id)]);
    if (!result.rows.length) return res.status(404).json({ error: 'Term not found' });
    
    await auditLog.record(req.user.id, 'DELETE_TERM', 'TERM', parseInt(id), { academicyear: result.rows[0].academicyear, semester: result.rows[0].semester }, req);
    res.json({ message: 'Term deleted successfully' });
  } catch (err) {
    console.error('Error deleting term:', err);
    res.status(500).json({ error: 'Server error deleting term' });
  }
});

// Create new module
app.post('/modules', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  
  const { moduleCode, moduleName, termId } = req.body;
  
  if (!moduleCode || !moduleName || !termId) {
    return res.status(400).json({ error: 'Module code, module name, and academic term are required' });
  }

  try {
    await db.query(
      'INSERT INTO module_catalog (modulecode, modulename) VALUES ($1, $2) ON CONFLICT (modulecode) DO UPDATE SET modulename = EXCLUDED.modulename',
      [moduleCode, moduleName]
    );

    const result = await db.query(
      'INSERT INTO module (modulecode, termid) VALUES ($1, $2) RETURNING *',
      [moduleCode, termId]
    );
    const module = result.rows[0];
    
    const termRes = await db.query('SELECT academicyear, semester FROM academic_terms WHERE termid = $1', [termId]);
    if (termRes.rows.length) {
      module.academicyear = termRes.rows[0].academicyear;
      module.semester = termRes.rows[0].semester;
    }
    module.modulename = moduleName;

    await auditLog.record(req.user.id, 'CREATE_MODULE', 'MODULE', module.moduleid, { code: module.modulecode, name: module.modulename }, req);
    res.status(201).json(module);
  } catch (err) {
    console.error('Error creating module:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This module is already added for the selected academic term' });
    }
    res.status(500).json({ error: 'Server error creating module: ' + err.message });
  }
});

// Update a module
app.put('/modules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  const { moduleCode, moduleName, termId } = req.body;
  const moduleId = parseInt(id);

  try {
    await db.query('BEGIN');

    await db.query(
      'INSERT INTO module_catalog (modulecode, modulename) VALUES ($1, $2) ON CONFLICT (modulecode) DO UPDATE SET modulename = EXCLUDED.modulename',
      [moduleCode, moduleName]
    );

    const result = await db.query(
      'UPDATE module SET modulecode = $1, termid = $2 WHERE moduleid = $3 RETURNING *',
      [moduleCode, parseInt(termId), moduleId]
    );

    if (!result.rows.length) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Module not found' });
    }

    const moduleData = result.rows[0];
    
    const termRes = await db.query('SELECT academicyear, semester, semesterenddate FROM academic_terms WHERE termid = $1', [termId]);
    if (termRes.rows.length) {
      moduleData.academicyear = termRes.rows[0].academicyear;
      moduleData.semester = termRes.rows[0].semester;
      moduleData.semesterenddate = termRes.rows[0].semesterenddate;
    }
    moduleData.modulename = moduleName;

    await auditLog.record(req.user.id, 'UPDATE_MODULE', 'MODULE', moduleData.moduleid, { code: moduleData.modulecode, name: moduleData.modulename }, req);
    await db.query('COMMIT');
    res.json(moduleData);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error updating module:', err);
    res.status(500).json({ error: 'Server error updating module: ' + err.message });
  }
});

// Assign sub-coordinator to module
app.patch('/modules/:id/assign-subcoordinator', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  const { subcoordinatorId } = req.body;
  
  try {
    const moduleId = parseInt(id);
    const subId = subcoordinatorId ? parseInt(subcoordinatorId) : null;
    
    if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

    // Check if this sub-coordinator is already assigned to a different module
    if (subId) {
      const conflict = await db.query(
        'SELECT m.moduleid, mc.modulename FROM module m JOIN module_catalog mc ON m.modulecode = mc.modulecode WHERE m.subcoordinatorid = $1 AND m.moduleid != $2',
        [subId, moduleId]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({
          error: `This sub-coordinator is already assigned to "${conflict.rows[0].modulename}"`
        });
      }
    }

    const result = await db.query(
      'UPDATE module SET subcoordinatorid = $1 WHERE moduleid = $2 RETURNING *',
      [subId, moduleId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    
    const moduleData = result.rows[0];
    await auditLog.record(req.user.id, 'ASSIGN_SUBCO', 'MODULE', moduleId, { subcoordinatorId: subId, moduleCode: moduleData.modulecode }, req);
    
    res.json(moduleData);
  } catch (err) {
    console.error('Error assigning sub-coordinator:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete a module (Main Coordinator)
app.delete('/modules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') {
    return res.status(403).json({ error: 'Access denied. Main Coordinator only.' });
  }

  const { id } = req.params;
  const moduleId = parseInt(id);

  if (isNaN(moduleId)) {
    return res.status(400).json({ error: 'Invalid module ID' });
  }

  try {
    await db.query('BEGIN');

    // 1. Delete sessions
    await db.query('DELETE FROM session WHERE moduleid = $1', [moduleId]);

    // 2. Delete lecturer assignments
    await db.query('DELETE FROM modulelecturer WHERE moduleid = $1', [moduleId]);

    // 3. Delete schedule slots
    await db.query('DELETE FROM moduleschedule WHERE moduleid = $1', [moduleId]);

    // 4. Delete the module
    const result = await db.query('DELETE FROM module WHERE moduleid = $1 RETURNING *', [moduleId]);

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Module not found' });
    }

    const deletedModule = result.rows[0];
    const mcResult = await db.query('SELECT modulename FROM module_catalog WHERE modulecode = $1', [deletedModule.modulecode]);
    await auditLog.record(req.user.id, 'DELETE_MODULE', 'MODULE', moduleId, { code: deletedModule.modulecode, name: mcResult.rows[0]?.modulename }, req);
    await db.query('COMMIT');
    res.json({ message: 'Module and all associated data deleted successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error deleting module:', err);
    res.status(500).json({ error: 'Server error deleting module: ' + err.message });
  }
});

// Get dashboard statistics (Main Coordinator)
app.get('/dashboard/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  try {
    const activeLecturersQuery = `
      SELECT COUNT(*) FROM users u
      JOIN roles r ON u.roleid = r.roleid
      WHERE r.rolename = 'lecturer'
    `;
    const activeSubCoordinatorsQuery = `
      SELECT COUNT(*) FROM users u
      JOIN roles r ON u.roleid = r.roleid
      WHERE r.rolename = 'sub-coordinator'
    `;
    const rescheduledSessionsQuery = `
      SELECT COUNT(*) FROM session
      WHERE status = 'Rescheduled'
      AND datetime >= NOW() - INTERVAL '7 days'
    `;
    const totalModulesQuery = `SELECT COUNT(*) FROM module`;

    const needingAttentionQuery = `
      SELECT 
        m.moduleid, 
        m.modulecode as code, 
        mc.modulename as name, 
        t.academicyear, 
        t.semester,
        m.subcoordinatorid,
        (SELECT COUNT(*) FROM modulelecturer ml WHERE ml.moduleid = m.moduleid) as lecturer_count
      FROM module m
      LEFT JOIN module_catalog mc ON m.modulecode = mc.modulecode
      LEFT JOIN academic_terms t ON m.termid = t.termid
      WHERE (m.subcoordinatorid IS NULL OR m.subcoordinatorid = 0)
         OR NOT EXISTS (SELECT 1 FROM modulelecturer ml WHERE ml.moduleid = m.moduleid)
      ORDER BY m.moduleid DESC
      LIMIT 5
    `;

    const [lecturersRes, subCoRes, rescheduledRes, modulesRes, attentionRes] = await Promise.all([
      db.query(activeLecturersQuery),
      db.query(activeSubCoordinatorsQuery),
      db.query(rescheduledSessionsQuery),
      db.query(totalModulesQuery),
      db.query(needingAttentionQuery)
    ]);

    res.json({
      activeLecturers: parseInt(lecturersRes.rows[0].count),
      activeSubCoordinators: parseInt(subCoRes.rows[0].count),
      rescheduledSessions: parseInt(rescheduledRes.rows[0].count),
      totalModules: parseInt(modulesRes.rows[0].count),
      needingAttention: attentionRes.rows.map(row => ({
        ...row,
        lecturer_count: parseInt(row.lecturer_count)
      }))
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

// Get dashboard statistics (Sub-Coordinator)
app.get('/subcoordinator/dashboard-stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'sub-coordinator') {
    return res.status(403).json({ error: 'Access denied. Sub-coordinators only.' });
  }

  const userId = parseInt(req.user.id);
  try {
    // 1. Assigned Modules
    const modulesQuery = `
      SELECT m.moduleid, m.modulecode, mc.modulename, t.academicyear, t.semester, m.subcoordinatorid,
      (
        SELECT json_agg(json_build_object('id', u_lect.userid, 'name', u_lect.name))
        FROM modulelecturer ml
        JOIN users u_lect ON ml.lecturerid = u_lect.userid
        WHERE ml.moduleid = m.moduleid
      ) as lecturers
      FROM module m
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      WHERE m.subcoordinatorid = $1
         OR EXISTS (SELECT 1 FROM modulelecturer ml WHERE ml.moduleid = m.moduleid AND ml.lecturerid = $2)
    `;
    
    // 2. Upcoming Sessions Count
    const upcomingCountQuery = `
      SELECT COUNT(*) 
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      WHERE (m.subcoordinatorid = $1 OR EXISTS (SELECT 1 FROM modulelecturer ml WHERE ml.moduleid = m.moduleid AND ml.lecturerid = $2))
        AND s.datetime >= NOW()
        AND s.status != 'Completed'
    `;

    // 3. Missing Attendance Count
    const missingAttendanceQuery = `
      SELECT COUNT(*) 
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      WHERE (m.subcoordinatorid = $1 OR EXISTS (SELECT 1 FROM modulelecturer ml WHERE ml.moduleid = m.moduleid AND ml.lecturerid = $2))
        AND s.datetime < NOW()
        AND NOT EXISTS (SELECT 1 FROM sessionattendance sa WHERE sa.sessionid = s.sessionid)
    `;

    // 4. Recent Upcoming Sessions
    const upcomingSessionsQuery = `
      SELECT 
        s.sessionid as id,
        s.moduleid,
        m.modulecode,
        mc.modulename,
        t.academicyear,
        t.semester,
        s.datetime,
        to_char(s.datetime, 'YYYY-MM-DD') as date,
        to_char(s.datetime, 'HH24:MI') as time,
        s.duration::float,
        s.locationorurl as location,
        s.status,
        u.name as lecturername
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      LEFT JOIN users u ON s.lecturerid = u.userid
      WHERE (m.subcoordinatorid = $1 OR EXISTS (SELECT 1 FROM modulelecturer ml WHERE ml.moduleid = m.moduleid AND ml.lecturerid = $2))
        AND s.datetime >= NOW()
        AND s.status != 'Completed'
      ORDER BY s.datetime ASC
      LIMIT 5
    `;

    const [modulesRes, upcomingCountRes, missingRes, sessionsRes] = await Promise.all([
      db.query(modulesQuery, [userId, userId]),
      db.query(upcomingCountQuery, [userId, userId]),
      db.query(missingAttendanceQuery, [userId, userId]),
      db.query(upcomingSessionsQuery, [userId, userId])
    ]);

    res.json({
      assignedModules: modulesRes.rows,
      upcomingSessionsCount: parseInt(upcomingCountRes.rows[0].count),
      missingAttendanceCount: parseInt(missingRes.rows[0].count),
      upcomingSessions: sessionsRes.rows
    });
  } catch (err) {
    console.error('Error fetching sub-coordinator dashboard stats:', err);
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
});

// Unassign sub-coordinator from module
app.patch('/modules/:id/unassign-subcoordinator', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE module SET subcoordinatorid = NULL WHERE moduleid = $1 RETURNING *',
      [parseInt(id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    
    const moduleData = result.rows[0];
    await auditLog.record(req.user.id, 'UNASSIGN_SUBCO', 'MODULE', parseInt(id), { moduleCode: moduleData.modulecode }, req);
    
    res.json(moduleData);
  } catch (err) {
    console.error('Error unassigning sub-coordinator:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Unassign a single lecturer from module
app.delete('/modules/:id/lecturers/:lecturerId', authenticateToken, async (req, res) => {
  const { id, lecturerId } = req.params;
  try {
    await db.query(
      'DELETE FROM modulelecturer WHERE moduleid = $1 AND lecturerid = $2',
      [parseInt(id), parseInt(lecturerId)]
    );
    res.json({ message: 'Lecturer unassigned successfully' });
  } catch (err) {
    console.error('Error unassigning lecturer:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Add a single lecturer to module
app.post('/modules/:id/lecturers', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lecturerId } = req.body;
  try {
    await db.query(
      'INSERT INTO modulelecturer (moduleid, lecturerid) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [parseInt(id), parseInt(lecturerId)]
    );
    res.json({ message: 'Lecturer assigned successfully' });
  } catch (err) {
    console.error('Error adding lecturer:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update module settings
app.patch('/modules/:id/settings', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { defaultDay, defaultTime, defaultEndTime, reminderHours, reminderTemplate } = req.body;
  
  try {
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

    // Check if the current user is the sub-coordinator assigned to this module
    const moduleCheck = await db.query('SELECT subcoordinatorid FROM module WHERE moduleid = $1', [moduleId]);
    if (moduleCheck.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    
    // Only assigned sub-coordinator can edit (Main Coordinator handled by role if needed, but per request only sub-co)
    if (req.user.role !== 'main-coordinator' && moduleCheck.rows[0].subcoordinatorid !== req.user.id) {
        return res.status(403).json({ error: 'Only the assigned sub-coordinator can modify settings' });
    }

    const result = await db.query(
      `UPDATE module SET 
        default_day = $1, 
        default_time = $2, 
        default_end_time = $3, 
        reminder_hours = $4, 
        reminder_template = $5 
       WHERE moduleid = $6 RETURNING *`,
      [defaultDay, defaultTime, defaultEndTime, reminderHours, reminderTemplate, moduleId]
    );

    const moduleData = result.rows[0];
    await auditLog.record(req.user.id, 'UPDATE_MODULE_SETTINGS', 'MODULE', moduleId, { 
      defaultDay, default_time: defaultTime, default_end_time: defaultEndTime, reminderHours, reminderTemplate 
    }, req);

    res.json(moduleData);
  } catch (err) {
    console.error('Error updating module settings:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Assign lecturers to module
app.post('/modules/:id/assign-lecturers', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lecturerIds } = req.body; // Array of IDs or Objects
  
  try {
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

    // Start transaction
    await db.query('BEGIN');
    
    // Clear existing assignments for this module
    await db.query('DELETE FROM modulelecturer WHERE moduleid = $1', [moduleId]);
    
    // Insert new assignments
    if (lecturerIds && Array.isArray(lecturerIds) && lecturerIds.length > 0) {
      for (const reqLecturer of lecturerIds) {
        let lId, wantsReminders;
        if (typeof reqLecturer === 'object' && reqLecturer !== null) {
            lId = parseInt(reqLecturer.id);
            wantsReminders = !!reqLecturer.wants_reminders;
        } else {
            lId = parseInt(reqLecturer);
            wantsReminders = true; // default to true if only ID is provided
        }

        if (!isNaN(lId)) {
          await db.query(
            'INSERT INTO modulelecturer (moduleid, lecturerid, wants_reminders) VALUES ($1, $2, $3)',
            [moduleId, lId, wantsReminders]
          );
        }
      }
    }
    
    await db.query('COMMIT');
    res.json({ message: 'Lecturers assigned successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error assigning lecturers:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get lecturers assigned to a specific module
app.get('/modules/:id/lecturers', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

    const query = `
      SELECT u.userid as id, u.name, u.email, ml.wants_reminders, lp.cvpath
      FROM modulelecturer ml
      JOIN users u ON ml.lecturerid = u.userid
      LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
      WHERE ml.moduleid = $1
    `;
    const result = await db.query(query, [moduleId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching module lecturers:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Rescheduling available slots endpoint
app.get('/sessions/available-slots', authenticateToken, async (req, res) => {
  try {
    const { sessionId, durationHours, weekOffset } = req.query;
    if (!sessionId || !durationHours || weekOffset === undefined) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }
    const grid = await SlotFinderService.getAvailableSlots(
      parseInt(sessionId),
      parseFloat(durationHours),
      parseInt(weekOffset)
    );
    res.json(grid);
  } catch (err) {
    console.error('Error fetching available slots:', err);
    res.status(500).json({ error: 'Server error retrieving available slots' });
  }
});

// Send Custom Message to Assigned Lecturers
const whatsappService = require('./services/WhatsAppService');

app.post('/modules/:id/send-message', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lecturerIds, messageText } = req.body;
  if (!messageText || typeof messageText !== 'string') return res.status(400).json({ error: 'Message text required' });
  if (!lecturerIds || !Array.isArray(lecturerIds) || lecturerIds.length === 0) return res.status(400).json({ error: 'No lecturers selected' });

  try {
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

    const moduleCheck = await db.query('SELECT mc.modulename, m.modulecode FROM module m JOIN module_catalog mc ON m.modulecode=mc.modulecode WHERE m.moduleid = $1', [moduleId]);
    if (moduleCheck.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    const { modulename, modulecode } = moduleCheck.rows[0];

    const query = `
      SELECT u.userid, u.name, u.email, lp.phonenumber
      FROM users u
      LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
      WHERE u.userid = ANY($1::int[])
    `;
    const lecturersRes = await db.query(query, [lecturerIds]);
    const lecturers = lecturersRes.rows;

    let emailCount = 0; let waCount = 0; const errors = [];

    for (const lecturer of lecturers) {
      if (lecturer.email) {
        try {
          const emailHtml = `<h2>Message from Sub-Coordinator - ${modulecode}</h2><p>Dear ${lecturer.name},</p><p>${messageText.replace(/\n/g, '<br>')}</p><hr><p><small>Lectra Session Management System</small></p>`;
          await sendMail(lecturer.email, `Message regarding ${modulecode} - ${modulename}`, messageText, emailHtml);
          emailCount++;
        } catch (e) {
          console.error(`Email fail: ${lecturer.email}`, e);
          errors.push(`Email to ${lecturer.name} failed.`);
        }
      }
      if (lecturer.phonenumber) {
        try {
            const formattedMessage = `*Message regarding ${modulecode} - ${modulename}*\n\nDear ${lecturer.name},\n\n${messageText}\n\n_Lectra VLMS_`;
            const waSuccess = await whatsappService.sendMessage(lecturer.phonenumber, formattedMessage);
            if (waSuccess) waCount++;
            else errors.push(`WhatsApp to ${lecturer.name} failed (Service error).`);
        } catch (e) {
          console.error(`WA fail: ${lecturer.phonenumber}`, e);
          errors.push(`WhatsApp to ${lecturer.name} failed.`);
        }
      } else {
          console.warn(`Lecturer ${lecturer.name} logic no WA number`);
      }
    }

    res.json({ message: 'Message dispatch complete', stats: { emailsSent: emailCount, whatsappsSent: waCount, totalAttempted: lecturers.length, errors }});
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});



// Create a single custom session
app.post('/modules/:moduleId/sessions', authenticateToken, async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { datetime, mode, duration, locationorurl } = req.body;
        if (!datetime || !mode || !duration) return res.status(400).json({ error: 'Missing req params' });

        // Permission check
        if (req.user.role === 'sub-coordinator') {
            const moduleRes = await db.query('SELECT subcoordinatorid FROM module WHERE moduleid = $1', [moduleId]);
            if (moduleRes.rows.length === 0 || moduleRes.rows[0].subcoordinatorid !== req.user.id) {
                return res.status(403).json({ error: 'Access denied: You are not the sub-coordinator for this module' });
            }
        } else if (req.user.role === 'lecturer') {
            const mlRes = await db.query('SELECT 1 FROM modulelecturer WHERE moduleid = $1 AND lecturerid = $2', [moduleId, req.user.id]);
            if (mlRes.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied: You are not assigned to this module' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const query = `
            INSERT INTO session (moduleid, datetime, mode, status, locationorurl, duration, reminder_sent)
            VALUES ($1, $2, $3, 'Scheduled', $4, $5, false)
            RETURNING *
        `;
        const result = await db.query(query, [moduleId, datetime, mode, locationorurl, duration]);
        const newSession = result.rows[0];

        // Audit Logging
        await auditLog.record(req.user.id, 'ADD_CUSTOM_SESSION', 'SESSION', newSession.sessionid, { 
            moduleId, 
            datetime, 
            mode 
        }, req);

        // Notify Sub-Coordinator if someone else added it
        const modCheck = await db.query('SELECT subcoordinatorid FROM module WHERE moduleid = $1', [moduleId]);
        if (modCheck.rows.length > 0 && modCheck.rows[0].subcoordinatorid && modCheck.rows[0].subcoordinatorid !== req.user.id) {
            const msg = `Lecturer ${req.user.name} has added a new custom session.\n\n` +
                        `Scheduled at: ${new Date(datetime).toLocaleString()}\n` +
                        `Mode: ${mode}\n` +
                        `Location: ${locationorurl || 'TBD'}`;
            await notifySubCoordinator(moduleId, 'New Session Added', msg);
        }

        res.status(201).json(newSession);
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Upload timetable endpoint
app.post('/modules/:moduleId/timetable', authenticateToken, upload.single('timetable'), async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Fetch module and term info for human-readable filename
    const moduleInfoRes = await db.query(`
      SELECT m.modulecode, t.academicyear, t.semester 
      FROM module m 
      JOIN academic_terms t ON m.termid = t.termid 
      WHERE m.moduleid = $1
    `, [parseInt(moduleId)]);

    let finalFilename = req.file.filename;

    if (moduleInfoRes.rows.length > 0) {
      const { modulecode, academicyear, semester } = moduleInfoRes.rows[0];
      const ext = path.extname(req.file.originalname);
      const timestamp = Date.now();
      
      // Sanitize fields for filename
      const safeCode = modulecode.replace(/[^a-z0-9]/gi, '_');
      const safeYear = academicyear.replace(/[^a-z0-9]/gi, '-');
      
      // Format: Timetable_CO2201_2023-2024_S1_1712910000000.xlsx
      const newFilename = `Timetable_${safeCode}_${safeYear}_S${semester}_${timestamp}${ext}`;
      const newPath = path.join(path.dirname(req.file.path), newFilename);
      
      try {
        fs.renameSync(req.file.path, newPath);
        finalFilename = newFilename;
      } catch (renameErr) {
        console.error('Error renaming file, using original:', renameErr);
      }
    }

    // Relative path to store in DB
    const relativePath = `uploads/${finalFilename}`;

    // Update the database
    const updateRes = await db.query(
      'UPDATE module SET studenttimetablepath = $1 WHERE moduleid = $2 RETURNING *',
      [relativePath, moduleId]
    );

    if (updateRes.rows.length === 0) {
      const pathToRemove = path.join(uploadDir, finalFilename);
      if (fs.existsSync(pathToRemove)) fs.unlinkSync(pathToRemove);
      return res.status(404).json({ error: 'Module not found' });
    }

    await auditLog.record(req.user.id, 'UPLOAD_TIMETABLE', 'MODULE', parseInt(moduleId), { path: relativePath }, req);
    res.json({
      message: 'Timetable uploaded successfully',
      path: relativePath,
      module: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error uploading timetable:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); 
    res.status(500).json({ error: 'Server error uploading timetable' });
  }
});

// DELETE /modules/:id/timetable — delete uploaded timetable
app.delete('/modules/:id/timetable', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const moduleId = parseInt(id);

    if (isNaN(moduleId)) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }

    // Get current path to delete file
    const modRes = await db.query('SELECT studenttimetablepath FROM module WHERE moduleid = $1', [moduleId]);
    if (modRes.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const currentPath = modRes.rows[0].studenttimetablepath;
    if (currentPath) {
      const fullPath = path.join(__dirname, currentPath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.error('Error deleting physical file:', err);
        }
      }
    }

    // Update database
    await db.query('UPDATE module SET studenttimetablepath = NULL WHERE moduleid = $1', [moduleId]);
    
    await auditLog.record(req.user.id, 'DELETE_TIMETABLE', 'MODULE', moduleId, { oldPath: currentPath }, req);
    
    res.json({ message: 'Timetable deleted successfully' });
  } catch (err) {
    console.error('Error deleting timetable:', err);
    res.status(500).json({ error: 'Server error deleting timetable' });
  }
});

// --- Attendance & Session Details Endpoints ---

// Get modules assigned to the logged-in sub-coordinator
app.get('/subcoordinator/modules', authenticateToken, async (req, res) => {
  if (req.user.role !== 'sub-coordinator') {
    return res.status(403).json({ error: 'Access denied. Sub-coordinators only.' });
  }
  try {
    const query = `
      SELECT m.moduleid, m.modulecode, mc.modulename, t.academicyear, t.semester, m.subcoordinatorid,
      (
        SELECT json_agg(json_build_object('id', u_lect.userid, 'name', u_lect.name))
        FROM modulelecturer ml
        JOIN users u_lect ON ml.lecturerid = u_lect.userid
        WHERE ml.moduleid = m.moduleid
      ) as lecturers
      FROM module m
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      WHERE m.subcoordinatorid = $1
         OR EXISTS (SELECT 1 FROM modulelecturer ml WHERE ml.moduleid = m.moduleid AND ml.lecturerid = $2)
      ORDER BY t.academicyear DESC, t.semester DESC, m.modulecode ASC
    `;
    const result = await db.query(query, [parseInt(req.user.id), parseInt(req.user.id)]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sub-coordinator modules:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get past sessions for a specific module
app.get('/modules/:id/sessions/past', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        s.sessionid,
        s.moduleid,
        m.modulecode,
        mc.modulename,
        s.datetime,
        to_char(s.datetime, 'YYYY-MM-DD') as date,
        to_char(s.datetime, 'HH24:MI') as time,
        s.duration,
        s.locationorurl as location,
        s.status,
        sd.topicscovered,
        sd.actual_duration,
        EXISTS(SELECT 1 FROM sessionattendance sa WHERE sa.sessionid = s.sessionid) as has_attendance
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      LEFT JOIN sessiondetails sd ON s.sessionid = sd.sessionid
      WHERE s.moduleid = $1 AND s.datetime <= NOW()
      ORDER BY s.datetime DESC
    `;
    const result = await db.query(query, [parseInt(id)]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching past sessions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attendance and details for a specific session
app.get('/sessions/:id/attendance', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const sessionId = parseInt(id);
    if (isNaN(sessionId)) return res.status(400).json({ error: 'Invalid session ID' });

    const detailsResult = await db.query('SELECT * FROM sessiondetails WHERE sessionid = $1', [sessionId]);
    const attendanceResult = await db.query('SELECT * FROM sessionattendance WHERE sessionid = $1', [sessionId]);
    
    // Map attendance to an object for easy frontend use: { lecturerId: isAttended }
    const attendanceMap = {};
    attendanceResult.rows.forEach(row => {
      attendanceMap[row.lecturerid] = row.isattended;
    });

    res.json({
      details: detailsResult.rows[0] || null,
      attendance: attendanceMap
    });
  } catch (err) {
    console.error('Error fetching session attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Record attendance for a session
app.post('/sessions/:id/attendance', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { attendance, topicsCovered, actualDuration, location } = req.body;
  const sessionId = parseInt(id);

  try {
    await db.query('BEGIN');

    // 1. Update Session Location if provided
    if (location !== undefined) {
      await db.query(
        'UPDATE session SET locationorurl = $1 WHERE sessionid = $2',
        [location, sessionId]
      );
    }

    // 2. Update/Insert Session Details
    // We fetch existing details first to allow partial updates
    const existingDetails = await db.query('SELECT * FROM sessiondetails WHERE sessionid = $1', [sessionId]);
    
    let finalTopicsCovered = topicsCovered;
    let finalActualDuration = actualDuration !== undefined ? actualDuration : null;

    // If values are not provided, keep existing ones
    if (existingDetails.rows.length > 0) {
      if (topicsCovered === undefined || topicsCovered === null) {
        finalTopicsCovered = existingDetails.rows[0].topicscovered;
      }
      if (actualDuration === undefined || actualDuration === null) {
        finalActualDuration = existingDetails.rows[0].actual_duration;
      }
    }

    await db.query('DELETE FROM sessiondetails WHERE sessionid = $1', [sessionId]);
    await db.query(
      'INSERT INTO sessiondetails (sessionid, topicscovered, actual_duration, recordedby, recordedat) VALUES ($1, $2, $3, $4, NOW())',
      [sessionId, finalTopicsCovered || '', finalActualDuration || 0, req.user.id]
    );

    // 3. Update Attendance
    // If attendance is provided, update it. If not, keep existing (or clear if explicit empty object)
    if (attendance && typeof attendance === 'object') {
      await db.query('DELETE FROM sessionattendance WHERE sessionid = $1', [sessionId]);
      for (const [lecturerId, isAttended] of Object.entries(attendance)) {
        await db.query(
          'INSERT INTO sessionattendance (sessionid, lecturerid, isattended) VALUES ($1, $2, $3)',
          [sessionId, parseInt(lecturerId), isAttended]
        );
      }
    }

    // 4. Update Session Status
    await db.query(
      "UPDATE session SET status = 'Completed' WHERE sessionid = $1",
      [sessionId]
    );

    await db.query('COMMIT');
    await auditLog.record(req.user.id, 'MARK_ATTENDANCE', 'SESSION', sessionId, { 
      topicsCovered: finalTopicsCovered, 
      actualDuration: finalActualDuration,
      location: location 
    }, req);
    res.json({ message: 'Attendance recorded successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error recording attendance:', err);
    res.status(500).json({ error: 'Server error recording attendance' });
  }
});

// --- Audit Log Endpoint ---

app.get('/audit-log', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') {
    return res.status(403).json({ error: 'Access denied. Main Coordinator only.' });
  }

  const limit = parseInt(req.query.limit) || 500;

  try {
    const query = `
      SELECT 
        al.log_id,
        al.action_type,
        al.target_type,
        al.target_id,
        al.details,
        al.ip_address,
        al.created_at,
        u.name as user_name,
        u.email as user_email
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.userid
      ORDER BY al.created_at DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
});

// --- Report Endpoints ---

// Get report data for preview
app.get('/reports/data', authenticateToken, async (req, res) => {
  const { type, moduleId, lecturerId, startDate, endDate } = req.query;
  const filters = { moduleId, lecturerId, startDate, endDate };

  try {
    let data = [];
    switch (type) {
      case 'bank-details':
        data = await reportService.getBankDetailsReport(filters);
        break;
      case 'attendance':
        data = await reportService.getAttendanceReport(filters);
        break;
      case 'topics':
        data = await reportService.getTopicsReport(filters);
        break;
      case 'reschedules':
        data = await reportService.getRescheduleReport(filters);
        break;
      case 'weekly-schedule':
        data = await reportService.getWeeklyScheduleReport(filters);
        break;
      case 'visiting-lecturers':
        data = await reportService.getVisitingLecturersReport(filters);
        break;
      case 'modules':
        data = await reportService.getModulesReport(filters);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    res.json(data);
  } catch (err) {
    console.error('Error fetching report data:', err);
    res.status(500).json({ error: 'Server error fetching report data: ' + err.message });
  }
});

// Export report as Excel or PDF
app.get('/reports/export', authenticateToken, async (req, res) => {
  const { type, moduleId, lecturerId, startDate, endDate, format } = req.query;
  const filters = { moduleId, lecturerId, startDate, endDate };
  console.log(`[REPORTS] Export request: ${type}, format=${format}, filters=`, filters);

  try {
    let data = [];
    let title = '';
    switch (type) {
      case 'bank-details':
        data = await reportService.getBankDetailsReport(filters);
        title = 'Lecturer Bank Details Report';
        break;
      case 'attendance':
        data = await reportService.getAttendanceReport(filters);
        title = 'Lecturer Attendance Report';
        break;
      case 'topics':
        data = await reportService.getTopicsReport(filters);
        title = 'Topics Covered Report';
        break;
      case 'reschedules':
        data = await reportService.getRescheduleReport(filters);
        title = 'Rescheduled Sessions Report';
        break;
      case 'weekly-schedule':
        data = await reportService.getWeeklyScheduleReport(filters);
        title = 'Weekly Schedule Report';
        break;
      case 'visiting-lecturers':
        data = await reportService.getVisitingLecturersReport(filters);
        title = 'Visiting Lecturers Report';
        break;
      case 'modules':
        data = await reportService.getModulesReport(filters);
        title = 'Module Assignments Report';
        break;
      default:
        console.warn(`[REPORTS] Invalid report type: ${type}`);
        return res.status(400).json({ error: 'Invalid report type' });
    }

    console.log(`[REPORTS] Data retrieved for ${type}: ${data.length} records`);

    if (format === 'excel') {
      const buffer = await reportService.exportToExcel(data, type);
      console.log(`[REPORTS] Excel buffer generated: ${buffer.length} bytes`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report.xlsx"`);
      return res.end(Buffer.from(buffer));
    } else if (format === 'pdf') {
      const buffer = await reportService.exportToPDF(data, type, title);
      console.log(`[REPORTS] PDF buffer generated: ${buffer.length} bytes`);
      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report.pdf"`);
      return res.end(Buffer.from(buffer));
    } else {
      console.warn(`[REPORTS] Invalid format: ${format}`);
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (err) {
    console.error('[REPORTS] Error exporting report:', err);
    res.status(500).json({ error: 'Server error exporting report: ' + err.message });
  }
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

// Manual trigger for reminder scheduler scan (useful for testing)
app.post('/debug/trigger-reminders', authenticateToken, async (req, res) => {
  if (req.user.role !== 'main-coordinator') return res.status(403).json({ error: 'Access denied' });
  try {
    console.log('[DEBUG] Manually triggering reminder scan...');
    await reminderScheduler.checkAndSendReminders();
    res.json({ success: true, message: 'Reminder scan triggered successfully' });
  } catch (err) {
    console.error('[DEBUG] Error triggering reminders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start services
whatsappService.initialize();
const reminderScheduler = require('./services/ReminderScheduler');
reminderScheduler.start();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
