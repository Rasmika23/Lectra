const db = require('../db');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class ReportService {
  async getBankDetailsReport(filters) {
    const { moduleId, lecturerId } = filters;
    let query = `
      SELECT 
        u.userid, u.name, u.email,
        lp.phonenumber, lp.nicnumber,
        b.bankname, bd.accountnumber, bd.branch, 
        bd.accountholdername, bd.bankcountry, bd.swiftbic, bd.iban
      FROM users u
      JOIN roles r ON u.roleid = r.roleid
      LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
      LEFT JOIN bankdetails bd ON u.userid = bd.lecturerid
      LEFT JOIN banks b ON bd.bankid = b.bankid
      WHERE r.rolename = 'Lecturer'
    `;
    const params = [];

    if (lecturerId && lecturerId !== 'all') {
      params.push(parseInt(lecturerId));
      query += ` AND u.userid = $${params.length}`;
    }

    if (moduleId && moduleId !== 'all') {
      query += ` AND u.userid IN (SELECT lecturerid FROM modulelecturer WHERE moduleid = $${params.length + 1})`;
      params.push(parseInt(moduleId));
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  async getAttendanceReport(filters) {
    const { moduleId, lecturerId, startDate, endDate } = filters;
    let query = `
      SELECT 
        TO_CHAR(s.datetime, 'DD/MM/YYYY HH:mi') as date, 
        s.duration,
        m.modulecode, mc.modulename,
        t.academicyear, t.semester,
        u.name as lecturername,
        CASE 
          WHEN sa.isattended IS TRUE THEN 'Present'
          WHEN sa.isattended IS FALSE THEN 'Absent'
          ELSE 'Not Marked'
        END as status
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      JOIN modulelecturer ml ON s.moduleid = ml.moduleid
      LEFT JOIN sessionattendance sa ON (s.sessionid = sa.sessionid AND ml.lecturerid = sa.lecturerid)
      JOIN users u ON ml.lecturerid = u.userid
      WHERE (s.status = 'Completed' OR (s.status = 'Scheduled' AND s.datetime < NOW()))
    `;
    const params = [];

    if (moduleId && moduleId !== 'all') {
      params.push(parseInt(moduleId));
      query += ` AND s.moduleid = $${params.length}`;
    }

    if (lecturerId && lecturerId !== 'all') {
      params.push(parseInt(lecturerId));
      query += ` AND ml.lecturerid = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND s.datetime >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND s.datetime <= $${params.length}`;
    }

    query += ` ORDER BY s.datetime DESC`;
    const result = await db.query(query, params);
    return result.rows;
  }

  async getTopicsReport(filters) {
    const { moduleId, lecturerId, startDate, endDate } = filters;
    let query = `
      SELECT 
        TO_CHAR(s.datetime, 'DD/MM/YYYY HH:mi') as date,
        m.modulecode, mc.modulename,
        t.academicyear, t.semester,
        sd.topicscovered, sd.actual_duration,
        u.name as recordedby
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      JOIN sessiondetails sd ON s.sessionid = sd.sessionid
      LEFT JOIN users u ON sd.recordedby = u.userid
      WHERE s.status = 'Completed'
    `;
    const params = [];

    if (moduleId && moduleId !== 'all') {
      params.push(parseInt(moduleId));
      query += ` AND s.moduleid = $${params.length}`;
    }

    if (lecturerId && lecturerId !== 'all') {
      params.push(parseInt(lecturerId));
      query += ` AND s.lecturerid = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND s.datetime >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND s.datetime <= $${params.length}`;
    }

    query += ` ORDER BY s.datetime DESC`;
    const result = await db.query(query, params);
    return result.rows;
  }

  async getRescheduleReport(filters) {
    const { moduleId, lecturerId, startDate, endDate } = filters;
    let query = `
      SELECT 
        TO_CHAR(s.previous_datetime, 'DD/MM/YYYY HH:mi') as original_date,
        TO_CHAR(s.datetime, 'DD/MM/YYYY HH:mi') as new_date,
        s.duration,
        m.modulecode, mc.modulename,
        t.academicyear, t.semester,
        u.name as lecturername
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      LEFT JOIN users u ON s.lecturerid = u.userid
      WHERE s.status = 'Rescheduled'
    `;
    const params = [];

    if (moduleId && moduleId !== 'all') {
      params.push(parseInt(moduleId));
      query += ` AND s.moduleid = $${params.length}`;
    }

    if (lecturerId && lecturerId !== 'all') {
      params.push(parseInt(lecturerId));
      query += ` AND s.lecturerid = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND s.datetime >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND s.datetime <= $${params.length}`;
    }

    query += ` ORDER BY s.datetime DESC`;
    const result = await db.query(query, params);
    return result.rows;
  }

  async getWeeklyScheduleReport(filters) {
    const { moduleId } = filters;
    let query = `
      SELECT 
        ms.day, ms.starttime, ms.duration, ms.location,
        m.modulecode, mc.modulename,
        t.academicyear, t.semester
      FROM moduleschedule ms
      JOIN module m ON ms.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
    `;
    const params = [];

    if (moduleId && moduleId !== 'all') {
      params.push(parseInt(moduleId));
      query += ` WHERE ms.moduleid = $1`;
    }

    query += ` ORDER BY CASE 
      WHEN day = 'Monday' THEN 1
      WHEN day = 'Tuesday' THEN 2
      WHEN day = 'Wednesday' THEN 3
      WHEN day = 'Thursday' THEN 4
      WHEN day = 'Friday' THEN 5
      WHEN day = 'Saturday' THEN 6
      WHEN day = 'Sunday' THEN 7
    END, ms.starttime`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async exportToExcel(data, type) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');

    if (data.length === 0) {
      sheet.addRow(['No data available']);
      return await workbook.xlsx.writeBuffer();
    }

    // Set columns based on type
    const columns = Object.keys(data[0]).map(key => ({
      header: key.charAt(0).toUpperCase() + key.slice(1),
      key: key,
      width: 20
    }));
    sheet.columns = columns;

    // Add rows
    data.forEach(item => {
      sheet.addRow(item);
    });

    // Add Summary Row
    if (data.length > 0) {
      sheet.addRow([]);
      if (type === 'attendance') {
        const totalDuration = data.reduce((sum, row) => sum + Number(row.duration || 0), 0);
        const presentCount = data.filter(row => row.status === 'Present').length;
        const absentCount = data.filter(row => row.status === 'Absent').length;
        const notMarkedCount = data.filter(row => row.status === 'Not Marked').length;
        sheet.addRow({ date: 'SUMMARY:', duration: totalDuration, lecturername: `P: ${presentCount}, A: ${absentCount}, NM: ${notMarkedCount}` });
      } else if (type === 'topics') {
        const totalDuration = data.reduce((sum, row) => sum + Number(row.actual_duration || 0), 0);
        sheet.addRow({ date: 'SUMMARY:', actual_duration: `Total Duration: ${totalDuration}` });
      } else if (type === 'reschedules') {
        sheet.addRow({ original_date: 'SUMMARY:', lecturername: `Total Rescheduled: ${data.length}` });
      }
      sheet.lastRow.font = { bold: true };
    }

    // Style header
    sheet.getRow(1).font = { bold: true };

    return await workbook.xlsx.writeBuffer();
  }

  async exportToPDF(data, type, title) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header-info { margin-bottom: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="header-info">
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          ${data.length === 0 ? `
            <div style="text-align: center; margin-top: 50px; color: #666;">
              <h3>No data available for the selected filters.</h3>
              <p>Please try adjusting your date range or module selection.</p>
            </div>
          ` : `
          <table>
            <thead>
              <tr>
                ${Object.keys(data[0] || {}).map(key => `<th>${key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${Object.values(row).map(val => `<td>${val === null || val === undefined ? '' : (typeof val === 'boolean' ? (val ? 'Yes' : 'No') : (val.toString().includes('GMT') ? new Date(val).toLocaleDateString() : val))}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 30px; border-top: 2px solid #333; padding-top: 10px;">
            <h3>Report Summary</h3>
            ${type === 'attendance' ? `
              <p><strong>Total Session Records:</strong> ${data.length}</p>
              <p><strong>Total Present:</strong> ${data.filter(row => row.status === 'Present').length}</p>
              <p><strong>Total Absent:</strong> ${data.filter(row => row.status === 'Absent').length}</p>
              <p><strong>Total Not Marked:</strong> ${data.filter(row => row.status === 'Not Marked').length}</p>
              <p><strong>Total Scheduled Duration:</strong> ${data.reduce((sum, row) => sum + Number(row.duration || 0), 0)} hours</p>
            ` : ''}
            ${type === 'topics' ? `
              <p><strong>Total Sessions:</strong> ${data.length}</p>
              <p><strong>Total Actual Duration:</strong> ${data.reduce((sum, row) => sum + Number(row.actual_duration || 0), 0)} hours</p>
            ` : ''}
            ${type === 'reschedules' ? `
              <p><strong>Total Rescheduled Sessions:</strong> ${data.length}</p>
            ` : ''}
          </div>
          `}
        </body>
      </html>
    `;

    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    await browser.close();
    return pdfBuffer;
  }
}

module.exports = new ReportService();
