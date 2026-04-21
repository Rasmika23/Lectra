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
        u.name, u.email, u.phonenumber,
        lp.nicnumber,
        b.bankname, bd.accountnumber, bd.branch, 
        bd.accountholdername, b.country as bankcountry, b.swiftbic, bd.iban
      FROM users u
      JOIN roles r ON u.roleid = r.roleid
      LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
      LEFT JOIN bankdetails bd ON u.userid = bd.lecturerid
      LEFT JOIN banks b ON bd.bankid = b.bankid
      WHERE r.rolename = 'lecturer'
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
        s.duration::float,
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
        sd.topicscovered, sd.actual_duration::float,
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
        s.duration::float,
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
        ms.day, ms.starttime, ms.duration::float, ms.location,
        m.modulecode, mc.modulename,
        t.academicyear, t.semester
      FROM moduleschedule ms
      JOIN module m ON ms.moduleid = m.moduleid
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
    `;
    const params = [];

    const result = await db.query(query, params);
    return result.rows;
  }

  async getVisitingLecturersReport(filters) {
    const { moduleId, lecturerId } = filters;
    let query = `
      SELECT 
        u.name, u.email, u.phonenumber,
        lp.nicnumber,
        (SELECT STRING_AGG(mc.modulecode, ', ') 
         FROM modulelecturer ml 
         JOIN module m ON ml.moduleid = m.moduleid 
         JOIN module_catalog mc ON m.modulecode = mc.modulecode
         WHERE ml.lecturerid = u.userid) as assigned_modules
      FROM users u
      JOIN roles r ON u.roleid = r.roleid
      LEFT JOIN lecturerprofile lp ON u.userid = lp.lecturerid
      WHERE r.rolename = 'lecturer'
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

    query += ` ORDER BY u.name ASC`;
    const result = await db.query(query, params);
    return result.rows;
  }

  async getModulesReport(filters) {
    const { moduleId } = filters;
    let query = `
      SELECT 
        m.modulecode, mc.modulename, 
        t.academicyear, t.semester,
        sc.name as subcoordinator,
        (SELECT STRING_AGG(u.name, ', ') 
         FROM modulelecturer ml 
         JOIN users u ON ml.lecturerid = u.userid 
         WHERE ml.moduleid = m.moduleid) as assigned_lecturers
      FROM module m
      JOIN module_catalog mc ON m.modulecode = mc.modulecode
      JOIN academic_terms t ON m.termid = t.termid
      LEFT JOIN users sc ON m.subcoordinatorid = sc.userid
      WHERE 1=1
    `;
    const params = [];

    if (moduleId && moduleId !== 'all') {
      params.push(parseInt(moduleId));
      query += ` AND m.moduleid = $${params.length}`;
    }

    query += ` ORDER BY t.academicyear DESC, t.semester DESC, m.modulecode ASC`;
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
        const uniqueLecturers = [...new Set(data.map(row => row.lecturername))];
        if (uniqueLecturers.length > 1) {
          sheet.addRow(['BREAKDOWN BY LECTURER:']);
          sheet.lastRow.font = { bold: true };
          uniqueLecturers.forEach(lecturer => {
            const lecturerData = data.filter(row => row.lecturername === lecturer);
            const duration = lecturerData.reduce((sum, row) => sum + Number(row.duration || 0), 0);
            const p = lecturerData.filter(row => row.status === 'Present').length;
            const a = lecturerData.filter(row => row.status === 'Absent').length;
            const nm = lecturerData.filter(row => row.status === 'Not Marked').length;
            sheet.addRow({ date: lecturer, duration: duration, lecturername: `P: ${p}, A: ${a}, NM: ${nm}` });
          });
          sheet.addRow([]);
        }
        const totalDuration = data.reduce((sum, row) => sum + Number(row.duration || 0), 0);
        const presentCount = data.filter(row => row.status === 'Present').length;
        const absentCount = data.filter(row => row.status === 'Absent').length;
        const notMarkedCount = data.filter(row => row.status === 'Not Marked').length;
        sheet.addRow({ date: 'TOTAL SUMMARY:', duration: totalDuration, lecturername: `P: ${presentCount}, A: ${absentCount}, NM: ${notMarkedCount}` });

      } else if (type === 'topics') {
        const uniqueRecorders = [...new Set(data.map(row => row.recordedby))];
        if (uniqueRecorders.length > 1) {
          sheet.addRow(['BREAKDOWN BY LECTURER:']);
          sheet.lastRow.font = { bold: true };
          uniqueRecorders.forEach(recorder => {
            const recorderData = data.filter(row => row.recordedby === recorder);
            const duration = recorderData.reduce((sum, row) => sum + Number(row.actual_duration || 0), 0);
            sheet.addRow({ date: recorder, actual_duration: `Sessions: ${recorderData.length}, Total: ${duration}h` });
          });
          sheet.addRow([]);
        }
        const totalDuration = data.reduce((sum, row) => sum + Number(row.actual_duration || 0), 0);
        sheet.addRow({ date: 'TOTAL SUMMARY:', actual_duration: `Total Sessions: ${data.length}, Total Duration: ${totalDuration}h` });

      } else if (type === 'reschedules') {
        const uniqueLecturers = [...new Set(data.filter(row => row.lecturername).map(row => row.lecturername))];
        if (uniqueLecturers.length > 1) {
          sheet.addRow(['BREAKDOWN BY LECTURER:']);
          sheet.lastRow.font = { bold: true };
          uniqueLecturers.forEach(lecturer => {
            const count = data.filter(row => row.lecturername === lecturer).length;
            sheet.addRow({ original_date: lecturer, lecturername: `Rescheduled: ${count}` });
          });
          sheet.addRow([]);
        }
        sheet.addRow({ original_date: 'TOTAL SUMMARY:', lecturername: `Total Rescheduled: ${data.length}` });

      } else if (type === 'weekly-schedule') {
        const uniqueModules = [...new Set(data.map(row => row.modulecode))];
        sheet.addRow({ day: 'TOTAL SUMMARY:', modulecode: `Total Modules: ${uniqueModules.length}, Total Sessions: ${data.length}` });

      } else if (type === 'visiting-lecturers') {
        sheet.addRow({ name: 'TOTAL SUMMARY:', email: `Total Lecturers: ${data.length}` });

      } else if (type === 'modules') {
        const uniqueCoordinators = [...new Set(data.filter(row => row.subcoordinator).map(row => row.subcoordinator))];
        if (uniqueCoordinators.length > 1) {
          sheet.addRow(['BREAKDOWN BY SUB-COORDINATOR:']);
          sheet.lastRow.font = { bold: true };
          uniqueCoordinators.forEach(sc => {
            const count = data.filter(row => row.subcoordinator === sc).length;
            sheet.addRow({ modulecode: sc, subcoordinator: `Assigned Modules: ${count}` });
          });
          sheet.addRow([]);
        }
        sheet.addRow({ modulecode: 'TOTAL SUMMARY:', subcoordinator: `Total Modules: ${data.length}` });

      } else if (type === 'bank-details') {
        sheet.addRow({ name: 'TOTAL SUMMARY:', email: `Total Lecturers: ${data.length}` });
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
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #334155; line-height: 1.5; }
            h1 { text-align: center; color: #0f172a; font-size: 26px; margin-bottom: 8px; font-weight: 700; }
            .header-info { text-align: center; margin-bottom: 30px; color: #64748b; font-size: 13px; }
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
            th, td { padding: 12px 10px; text-align: center; font-size: 10px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
            th:last-child, td:last-child { border-right: none; }
            tr:last-child td { border-bottom: none; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.025em; font-size: 9px; }
            tr:nth-child(even) { background-color: #fdfdfd; }
            tr:nth-child(odd) { background-color: #ffffff; }
            tr:hover { background-color: #f1f5f9; }
            .summary { margin-top: 30px; border-top: 2px solid #0f172a; padding-top: 15px; }
            .summary h3 { color: #0f172a; margin-bottom: 12px; font-size: 18px; }
            .summary p { margin: 4px 0; font-size: 12px; color: #475569; }
            .summary strong { color: #1e293b; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="header-info">
            <p>Generated on: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
          </div>
          ${data.length === 0 ? `
            <div style="text-align: center; margin-top: 50px; color: #64748b; padding: 40px; border: 2px dashed #e2e8f0; border-radius: 12px;">
              <h3 style="margin-bottom: 10px;">No data available</h3>
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
                  ${Object.values(row).map(val => `<td>${val === null || val === undefined ? '' : (typeof val === 'boolean' ? (val ? '<span style="color: #059669; font-weight: bold;">Yes</span>' : '<span style="color: #dc2626;">No</span>') : (val.toString().includes('GMT') ? new Date(val).toLocaleDateString() : val))}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <h3>Report Summary</h3>
            ${(() => {
              if (type === 'attendance') {
                const uniqueLecturers = [...new Set(data.map(row => row.lecturername))];
                const totalDuration = data.reduce((sum, row) => sum + Number(row.duration || 0), 0);
                const p = data.filter(row => row.status === 'Present').length;
                const a = data.filter(row => row.status === 'Absent').length;
                
                let html = `
                  <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; flex: 1; min-width: 120px;">
                      <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Sessions</span>
                      <div style="font-size: 18px; font-weight: bold; color: #0f172a;">${data.length}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; flex: 1; min-width: 120px;">
                      <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Duration</span>
                      <div style="font-size: 18px; font-weight: bold; color: #0f172a;">${totalDuration}h</div>
                    </div>
                    <div style="background: #ecfdf5; padding: 12px; border-radius: 6px; border: 1px solid #d1fae5; flex: 1; min-width: 120px;">
                      <span style="font-size: 9px; color: #059669; text-transform: uppercase;">Present</span>
                      <div style="font-size: 18px; font-weight: bold; color: #059669;">${p}</div>
                    </div>
                    <div style="background: #fef2f2; padding: 12px; border-radius: 6px; border: 1px solid #fee2e2; flex: 1; min-width: 120px;">
                      <span style="font-size: 9px; color: #dc2626; text-transform: uppercase;">Absent</span>
                      <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${a}</div>
                    </div>
                  </div>
                `;
                
                if (uniqueLecturers.length > 1) {
                  html += `
                    <h4 style="margin: 15px 0 8px 0; color: #334155; font-size: 14px;">Breakdown by Lecturer</h4>
                    <table style="margin: 0; box-shadow: none; border: 1px solid #f1f5f9;">
                      <thead>
                        <tr><th style="text-align: left;">Lecturer</th><th>Sessions</th><th>Duration</th><th>P</th><th>A</th><th>NM</th></tr>
                      </thead>
                      <tbody>
                        ${uniqueLecturers.map(l => {
                          const ld = data.filter(r => r.lecturername === l);
                          return `<tr>
                            <td style="text-align: left; font-weight: 500;">${l}</td>
                            <td>${ld.length}</td>
                            <td>${ld.reduce((s, r) => s + Number(r.duration || 0), 0)}</td>
                            <td style="color: #059669;">${ld.filter(r => r.status === 'Present').length}</td>
                            <td style="color: #dc2626;">${ld.filter(r => r.status === 'Absent').length}</td>
                            <td>${ld.filter(r => r.status === 'Not Marked').length}</td>
                          </tr>`;
                        }).join('')}
                      </tbody>
                    </table>
                  `;
                }
                return html;
              }

              if (type === 'topics') {
                const uniqueRecorders = [...new Set(data.map(row => row.recordedby))];
                const totalDuration = data.reduce((sum, row) => sum + Number(row.actual_duration || 0), 0);
                let html = `
                  <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; flex: 1;">
                      <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Sessions</span>
                      <div style="font-size: 18px; font-weight: bold;">${data.length}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; flex: 1;">
                      <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Actual Duration</span>
                      <div style="font-size: 18px; font-weight: bold;">${totalDuration}h</div>
                    </div>
                  </div>
                `;
                if (uniqueRecorders.length > 1) {
                  html += `
                    <h4 style="margin: 15px 0 8px 0; font-size: 14px;">Breakdown by Lecturer</h4>
                    <table style="margin: 0; box-shadow: none; border: 1px solid #f1f5f9;">
                      <thead><tr><th style="text-align: left;">Lecturer</th><th>Sessions</th><th>Total Duration</th></tr></thead>
                      <tbody>
                        ${uniqueRecorders.map(l => {
                          const ld = data.filter(r => r.recordedby === l);
                          return `<tr><td style="text-align: left;">${l}</td><td>${ld.length}</td><td>${ld.reduce((s, r) => s + Number(r.actual_duration || 0), 0)}h</td></tr>`;
                        }).join('')}
                      </tbody>
                    </table>
                  `;
                }
                return html;
              }

              if (type === 'reschedules') {
                const uniqueLecturers = [...new Set(data.filter(r => r.lecturername).map(r => r.lecturername))];
                let html = `
                  <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; min-width: 150px; margin-bottom: 20px;">
                    <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Reschedules</span>
                    <div style="font-size: 18px; font-weight: bold;">${data.length}</div>
                  </div>
                `;
                if (uniqueLecturers.length > 1) {
                  html += `
                    <h4 style="margin: 15px 0 8px 0; font-size: 14px;">Breakdown by Lecturer</h4>
                    <table style="margin: 0; box-shadow: none; border: 1px solid #f1f5f9;">
                      <thead><tr><th style="text-align: left;">Lecturer</th><th>Count</th></tr></thead>
                      <tbody>
                        ${uniqueLecturers.map(l => `<tr><td style="text-align: left;">${l}</td><td>${data.filter(r => r.lecturername === l).length}</td></tr>`).join('')}
                      </tbody>
                    </table>
                  `;
                }
                return html;
              }

              if (type === 'weekly-schedule') {
                const uniqueModules = [...new Set(data.map(r => r.modulecode))];
                return `
                  <div style="display: flex; gap: 15px;">
                    <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; flex: 1;">
                      <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Modules</span>
                      <div style="font-size: 18px; font-weight: bold;">${uniqueModules.length}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; flex: 1;">
                      <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Weekly Sessions</span>
                      <div style="font-size: 18px; font-weight: bold;">${data.length}</div>
                    </div>
                  </div>
                `;
              }

              if (type === 'visiting-lecturers') {
                return `
                  <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; min-width: 150px;">
                    <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Visiting Lecturers</span>
                    <div style="font-size: 18px; font-weight: bold;">${data.length}</div>
                  </div>
                `;
              }

              if (type === 'modules') {
                const uniqueCoordinators = [...new Set(data.filter(r => r.subcoordinator).map(r => r.subcoordinator))];
                let html = `
                  <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; min-width: 150px; margin-bottom: 20px;">
                    <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Modules</span>
                    <div style="font-size: 18px; font-weight: bold;">${data.length}</div>
                  </div>
                `;
                if (uniqueCoordinators.length > 1) {
                  html += `
                    <h4 style="margin: 15px 0 8px 0; font-size: 14px;">Breakdown by Sub-coordinator</h4>
                    <table style="margin: 0; box-shadow: none; border: 1px solid #f1f5f9;">
                      <thead><tr><th style="text-align: left;">Sub-coordinator</th><th>Modules Assigned</th></tr></thead>
                      <tbody>
                        ${uniqueCoordinators.map(sc => `<tr><td style="text-align: left;">${sc}</td><td>${data.filter(r => r.subcoordinator === sc).length}</td></tr>`).join('')}
                      </tbody>
                    </table>
                  `;
                }
                return html;
              }

              if (type === 'bank-details') {
                return `
                  <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; min-width: 150px;">
                    <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total Records</span>
                    <div style="font-size: 18px; font-weight: bold;">${data.length}</div>
                  </div>
                `;
              }
              return '';
            })()}
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
