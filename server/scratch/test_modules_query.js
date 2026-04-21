const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../db');

async function testQuery() {
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
    console.log('Modules from DB:', result.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

testQuery();
