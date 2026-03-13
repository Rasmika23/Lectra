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
app.get('/users', async (req, res) => {
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
            (SELECT string_agg(m.modulecode, ', ') FROM module m JOIN modulelecturer ml ON m.moduleid = ml.moduleid WHERE ml.lecturerid = u.userid)
          ELSE NULL
        END as assignedmodules
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
        department: 'Computing',
        joinDate: new Date().toISOString().split('T')[0],
        assignedModules: user.assignedmodules || '',
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

// Get all modules with assignments
app.get('/modules', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.moduleid, 
        m.modulecode, 
        m.modulename, 
        m.academicyear, 
        m.semester, 
        m.studenttimetablepath,
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
app.post('/modules', async (req, res) => {
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
app.patch('/modules/:id/assign-subcoordinator', async (req, res) => {
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
app.patch('/modules/:id/unassign-subcoordinator', async (req, res) => {
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
app.delete('/modules/:id/lecturers/:lecturerId', async (req, res) => {
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
app.post('/modules/:id/lecturers', async (req, res) => {
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

// Assign lecturers to module
app.post('/modules/:id/assign-lecturers', async (req, res) => {
  const { id } = req.params;
  const { lecturerIds } = req.body; // Array of IDs
  console.log(`Assigning lecturers ${JSON.stringify(lecturerIds)} to module ${id}`);
  
  try {
    const moduleId = parseInt(id);
    if (isNaN(moduleId)) return res.status(400).json({ error: 'Invalid module ID' });

    // Start transaction
    await db.query('BEGIN');
    
    // Clear existing assignments for this module
    await db.query('DELETE FROM modulelecturer WHERE moduleid = $1', [moduleId]);
    
    // Insert new assignments
    if (lecturerIds && Array.isArray(lecturerIds) && lecturerIds.length > 0) {
      for (const lecturerId of lecturerIds) {
        const lId = parseInt(lecturerId);
        if (!isNaN(lId)) {
          await db.query(
            'INSERT INTO modulelecturer (moduleid, lecturerid) VALUES ($1, $2)',
            [moduleId, lId]
          );
        }
      }
    }
    
    await db.query('COMMIT');
    console.log(`Lecturers assigned successfully to module ${id}`);
    res.json({ message: 'Lecturers assigned successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error assigning lecturers:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Rescheduling available slots endpoint
app.get('/sessions/available-slots', async (req, res) => {
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

// Upload timetable endpoint
app.post('/modules/:moduleId/timetable', upload.single('timetable'), async (req, res) => {
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
