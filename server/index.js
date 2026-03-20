const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SlotFinderService = require('./services/SlotFinderService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const reportService = require('./services/ReportService');

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

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up static uploads folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
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
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.userid, 
        u.name, 
        u.email, 
        r.rolename,
        CASE
          WHEN r.rolename = 'SubCoordinator' THEN
            (SELECT string_agg(m.modulecode, ', ') FROM module m WHERE m.subcoordinatorid = u.userid)
          WHEN r.rolename = 'Lecturer' THEN
            (SELECT string_agg(m.moduleid::text, ', ') FROM module m JOIN modulelecturer ml ON m.moduleid = ml.moduleid WHERE ml.lecturerid = u.userid)
          ELSE NULL
        END as assignedmoduleids
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
        id: user.userid,
        userid: user.userid,
        name: user.name,
        email: user.email,
        role: frontendRole,
        assignedmoduleids: user.assignedmoduleids ? user.assignedmoduleids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : []
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
      SELECT m.moduleid, m.modulecode, m.modulename, m.academicyear, m.semester
      FROM module m
      JOIN modulelecturer ml ON m.moduleid = ml.moduleid
      WHERE ml.lecturerid = $1
      ORDER BY m.academicyear DESC, m.semester, m.modulecode
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
        m.modulename,
        s.lecturerid,
        s.datetime,
        to_char(s.datetime, 'YYYY-MM-DD') as date,
        to_char(s.datetime, 'HH24:MI') as time,
        s.duration,
        s.locationorurl,
        s.locationorurl as location,
        s.status,
        s.mode,
        s.reminder_sent,
        u.name as lecturername
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
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
        m.modulename,
        s.lecturerid,
        s.datetime,
        to_char(s.datetime, 'YYYY-MM-DD') as date,
        to_char(s.datetime, 'HH24:MI') as time,
        s.duration,
        s.locationorurl,
        s.locationorurl as location,
        s.status,
        s.mode,
        u.name as lecturername
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
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
        u.userid, u.name, u.email,
        lp.phonenumber, lp.address, lp.nicnumber, lp.cvpath,
        bd.bankname, bd.accountnumber, bd.branch, 
        bd.accountholdername, bd.bankcountry, bd.swiftbic, bd.iban
      FROM users u
      LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
      LEFT JOIN bankdetails bd ON u.userid = bd.lecturerid
      WHERE u.userid = $1
    `;
    const result = await db.query(query, [userId]);
    const logMsg = `FETCH: user ${userId}, found ${result.rows.length} rows, first row phone: ${result.rows[0]?.phonenumber}\n`;
    fs.appendFileSync(path.join(__dirname, 'debug_profile.log'), logMsg);
    
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

// Update lecturer profile and bank details
app.post('/lecturer/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access denied. Lecturers only.' });
  }

  const { phone, address, nicNumber, bankDetails } = req.body;
  const userId = req.user.id;
  fs.appendFileSync(path.join(__dirname, 'debug_profile.log'), `SAVE: user ${userId}, data: ${JSON.stringify({ phone, address, nicNumber })}\n`);

  try {
    await db.query('BEGIN');

    // 1. Update lecturerprofile if contact details are provided
    if (phone !== undefined || address !== undefined || nicNumber !== undefined) {
      const lpResult = await db.query(`
        INSERT INTO lecturerprofile (lecturerid, phonenumber, address, nicnumber)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (lecturerid) DO UPDATE SET
          phonenumber = COALESCE(EXCLUDED.phonenumber, lecturerprofile.phonenumber),
          address = COALESCE(EXCLUDED.address, lecturerprofile.address),
          nicnumber = COALESCE(EXCLUDED.nicnumber, lecturerprofile.nicnumber)
        RETURNING *
      `, [userId, phone, address, nicNumber]);
      fs.appendFileSync(path.join(__dirname, 'debug_profile.log'), `SAVE RESULT: ${JSON.stringify(lpResult.rows[0])}\n`);
    }

    // 2. Update bankdetails if provided
    if (bankDetails) {
      await db.query(`
        INSERT INTO bankdetails (
          lecturerid, bankname, accountnumber, branch, 
          accountholdername, bankcountry, swiftbic, iban
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (lecturerid) DO UPDATE SET
          bankname = EXCLUDED.bankname,
          accountnumber = EXCLUDED.accountnumber,
          branch = EXCLUDED.branch,
          accountholdername = EXCLUDED.accountholdername,
          bankcountry = EXCLUDED.bankcountry,
          swiftbic = EXCLUDED.swiftbic,
          iban = EXCLUDED.iban
      `, [
        userId, 
        bankDetails.bankName, 
        bankDetails.accountNumber, 
        bankDetails.branch || '',
        bankDetails.accountHolderName,
        bankDetails.bankCountry,
        bankDetails.swiftBic,
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
        
        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Reschedule a session
app.patch('/sessions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { datetime, duration, location, lecturerid } = req.body;

  try {
    // If lecturerid is not provided, and the user is a lecturer, assign it to them
    let targetLecturerId = lecturerid;
    if (!targetLecturerId && req.user.role === 'lecturer') {
      targetLecturerId = req.user.id;
    }

    const result = await db.query(
      `UPDATE session 
       SET previous_datetime = datetime, datetime = $1, duration = $2, locationorurl = $3, lecturerid = COALESCE($4, lecturerid), status = 'Rescheduled'
       WHERE sessionid = $5 
       RETURNING *`,
      [datetime, duration, location, targetLecturerId || null, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error rescheduling session:', err);
    res.status(500).json({ error: 'Server error updating session' });
  }
});

// Delete user
app.delete('/users/:id', authenticateToken, async (req, res) => {
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
  const modRes = await db.query('SELECT semesterenddate FROM module WHERE moduleid = $1', [moduleId]);
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
      db.query('SELECT semesterenddate FROM module WHERE moduleid = $1', [parseInt(id)]),
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
app.post('/modules/:id/schedule', async (req, res) => {
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
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding schedule slot:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// PUT /modules/:id/schedule/:slotId — update a slot (sub-coordinator)
app.put('/modules/:id/schedule/:slotId', async (req, res) => {
  const { id, slotId } = req.params;
  const { day, starttime, duration, location } = req.body;
  try {
    const result = await db.query(
      'UPDATE moduleschedule SET day=$1, starttime=$2, duration=$3, location=$4 WHERE scheduleid=$5 AND moduleid=$6 RETURNING *',
      [day, starttime, parseFloat(duration), location || '', parseInt(slotId), parseInt(id)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Slot not found' });
    await generateSessionsForModule(parseInt(id));
    res.json(result.rows[0]);
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
    await db.query('UPDATE module SET semesterenddate=$1 WHERE moduleid=$2', [semesterenddate || null, parseInt(id)]);
    await generateSessionsForModule(parseInt(id));
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
        m.modulename, 
        m.academicyear, 
        m.semester, 
        m.studenttimetablepath,
        m.semesterenddate,
        m.reminder_hours,
        m.reminder_template,
        u_sub.name as subcoordinator,
        u_sub.userid as subcoordinatorid,
        (
          SELECT json_agg(json_build_object('id', u_lect.userid, 'name', u_lect.name))
          FROM modulelecturer ml
          JOIN users u_lect ON ml.lecturerid = u_lect.userid
          WHERE ml.moduleid = m.moduleid
        ) as lecturers
      FROM module m
      LEFT JOIN users u_sub ON m.subcoordinatorid = u_sub.userid
      ORDER BY m.academicyear DESC, m.semester DESC, m.modulecode ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching modules:', err);
    res.status(500).json({ error: 'Server error fetching modules' });
  }
});

// Create new module
app.post('/modules', authenticateToken, async (req, res) => {
  const { moduleCode, moduleName, academicYear, semester } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO module (modulecode, modulename, academicyear, semester) VALUES ($1, $2, $3, $4) RETURNING *',
      [moduleCode, moduleName, academicYear, semester]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating module:', err);
    res.status(500).json({ error: 'Server error creating module' });
  }
});

// Assign sub-coordinator to module
app.patch('/modules/:id/assign-subcoordinator', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { subcoordinatorId } = req.body;
  
  try {
    const moduleId = parseInt(id);
    const subId = subcoordinatorId ? parseInt(subcoordinatorId) : null;
    
    if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

    // Check if this sub-coordinator is already assigned to a different module
    if (subId) {
      const conflict = await db.query(
        'SELECT m.moduleid, m.modulename FROM module m WHERE m.subcoordinatorid = $1 AND m.moduleid != $2',
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
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error assigning sub-coordinator:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Unassign sub-coordinator from module
app.patch('/modules/:id/unassign-subcoordinator', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE module SET subcoordinatorid = NULL WHERE moduleid = $1 RETURNING *',
      [parseInt(id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    res.json(result.rows[0]);
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

    res.json(result.rows[0]);
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
      SELECT u.userid as id, u.name, u.email, ml.wants_reminders
      FROM modulelecturer ml
      JOIN users u ON ml.lecturerid = u.userid
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
const { sendMail } = require('./email');
const whatsappService = require('./services/WhatsAppService');

app.post('/modules/:id/send-message', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lecturerIds, messageText } = req.body;
  if (!messageText || typeof messageText !== 'string') return res.status(400).json({ error: 'Message text required' });
  if (!lecturerIds || !Array.isArray(lecturerIds) || lecturerIds.length === 0) return res.status(400).json({ error: 'No lecturers selected' });

  try {
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

    const moduleCheck = await db.query('SELECT modulename, modulecode FROM module WHERE moduleid = $1', [moduleId]);
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
            const formattedMessage = `*Message regarding ${modulecode} - ${modulename}*\n\nDear ${lecturer.name},\n\n${messageText}\n\n_Lectra Session Management System_`;
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

        const query = `
            INSERT INTO session (moduleid, datetime, mode, status, locationorurl, duration, reminder_sent)
            VALUES ($1, $2, $3, 'Scheduled', $4, $5, false)
            RETURNING *
        `;
        const result = await db.query(query, [moduleId, datetime, mode, locationorurl, duration]);
        res.status(201).json(result.rows[0]);
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

    // Relative path to store in DB
    const relativePath = `uploads/${req.file.filename}`;

    // Update the database
    const updateRes = await db.query(
      'UPDATE module SET studenttimetablepath = $1 WHERE moduleid = $2 RETURNING *',
      [relativePath, moduleId]
    );

    if (updateRes.rows.length === 0) {
      fs.unlinkSync(req.file.path); // remove the file if module not found
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({
      message: 'Timetable uploaded successfully',
      path: relativePath,
      module: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error uploading timetable:', err);
    if (req.file) fs.unlinkSync(req.file.path); // clean up file on error
    res.status(500).json({ error: 'Server error uploading timetable' });
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
      SELECT moduleid, modulecode, modulename, academicyear, semester
      FROM module
      WHERE subcoordinatorid = $1
      ORDER BY academicyear DESC, semester DESC, modulecode ASC
    `;
    const result = await db.query(query, [req.user.id]);
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
        m.modulename,
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
  const { attendance, topicsCovered, actualDuration } = req.body;
  const sessionId = parseInt(id);

  try {
    await db.query('BEGIN');

    // 1. Update/Insert Session Details
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

    // 2. Update Attendance
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

    // 3. Update Session Status
    await db.query(
      "UPDATE session SET status = 'Completed' WHERE sessionid = $1",
      [sessionId]
    );

    await db.query('COMMIT');
    res.json({ message: 'Attendance recorded successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error recording attendance:', err);
    res.status(500).json({ error: 'Server error recording attendance' });
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

// Start services
whatsappService.initialize();
const reminderScheduler = require('./services/ReminderScheduler');
reminderScheduler.start();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
