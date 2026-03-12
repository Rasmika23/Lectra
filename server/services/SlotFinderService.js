const ExcelJS = require('exceljs');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { startOfWeek, addDays, startOfDay, addMinutes, isWithinInterval, format, parse } = require('date-fns');

class SlotFinderService {
    /**
     * Generates a 5-Day (Mon-Fri) availability grid from 08:00 to 18:00 in 30-min increments.
     * @param {number} sessionId 
     * @param {number} durationHours 
     * @param {number} weekOffset 
     */
    static async getAvailableSlots(sessionId, durationHours, weekOffset) {
        // 1. Fetch Session and Module Info
        const sessionRes = await db.query(`
      SELECT s.datetime, s.lecturerid, m.moduleid, m.academicyear, m.semester, m.studenttimetablepath
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      WHERE s.sessionid = $1
    `, [sessionId]);

        if (sessionRes.rows.length === 0) {
            throw new Error('Session not found');
        }

        const { moduleid, academicyear, semester, studenttimetablepath, lecturerid } = sessionRes.rows[0];

        // 2. Determine target week dates
        // startOfWeek(..., { weekStartsOn: 1 }) sets start as Monday
        const today = new Date();
        const targetWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);

        // 3. Initialize the 5-Day Grid
        const daysArr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        let grid = daysArr.map((dayName, index) => {
            let currentDayStart = addDays(targetWeekStart, index);
            let slots = [];
            // 08:00 to 18:00 is 10 hours -> 20 slots of 30 mins
            let slotTime = addMinutes(startOfDay(currentDayStart), 8 * 60); // 08:00 AM

            for (let i = 0; i < 20; i++) {
                slots.push({
                    time: format(slotTime, 'HH:mm'),
                    datetime: new Date(slotTime), // keep object for easier comparison later
                    status: 'AVAILABLE',
                    reason: null
                });
                slotTime = addMinutes(slotTime, 30);
            }
            return { day: dayName, date: format(currentDayStart, 'yyyy-MM-dd'), slots };
        });

        // 4. Parse Fixed Schedule (Excel)
        if (studenttimetablepath) {
            const fullPath = path.resolve(__dirname, '..', '..', studenttimetablepath); // adjust path relative to server root
            if (fs.existsSync(fullPath)) {
                try {
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.readFile(fullPath);
                    const worksheet = workbook.worksheets[0]; // first active sheet

                    // Assume structure:
                    // Row 1: Time | Monday | Tuesday | Wednesday | Thursday | Friday
                    // Row 2+: 08:00 | SE101 | ...

                    // Find which column corresponds to which day text
                    const dayColumns = {};
                    const headerRow = worksheet.getRow(1);
                    headerRow.eachCell((cell, colNumber) => {
                        const val = cell.text.trim();
                        if (daysArr.includes(val)) {
                            dayColumns[val] = colNumber;
                        }
                    });

                    // Iterate rows from row 2 onwards to check times
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber === 1) return; // skip header
                        let timeStr = '';
                        const timeCell = row.getCell(1); // Assume col 1 is Time
                        if (timeCell.value instanceof Date) {
                            // Excel saves times relative to 1899-12-30 UTC. Extract EXACT hour/minute from UTC string
                            timeStr = timeCell.value.toISOString().substring(11, 16);
                        } else {
                            timeStr = timeCell.text.trim();
                        }
                        if (!timeStr) return;

                        // Simple match for "HH:mm"
                        // For each day column, check if we have a module name
                        for (const [dayName, colNumber] of Object.entries(dayColumns)) {
                            const moduleName = row.getCell(colNumber).text.trim();
                            if (moduleName) {
                                // Find corresponding day and time in our grid
                                const dayObj = grid.find(d => d.day === dayName);
                                if (dayObj) {
                                    const slotObj = dayObj.slots.find(s => s.time === timeStr);
                                    if (slotObj) {
                                        slotObj.status = 'BUSY';
                                        slotObj.reason = `Fixed Lecture (${moduleName})`;
                                    }
                                }
                            }
                        }
                    });
                } catch (err) {
                    console.error('Error parsing excel timetable:', err);
                    // Don't fail the whole request, maybe just log it
                }
            }
        }

        // 5. Fetch Active Sessions for this 'batch' (same academic year & semester) + same lecturer
        const targetWeekEnd = addDays(targetWeekStart, 5); // up to Saturday 00:00
        const activeSessionsRes = await db.query(`
      SELECT s.datetime, s.status, s.sessionid, m.modulename, s.lecturerid as sess_lecturerid, s.duration
      FROM session s
      JOIN module m ON s.moduleid = m.moduleid
      WHERE (
        (m.academicyear = $1 AND m.semester = $2) -- Batch collision
        OR s.lecturerid = $5 -- Lecturer collision
      )
      AND s.status IN ('Scheduled', 'Rescheduled')
      AND s.datetime >= $3 AND s.datetime < $4
      AND s.sessionid != $6
    `, [academicyear, semester, targetWeekStart, targetWeekEnd, lecturerid, sessionId]);

        for (const activeSess of activeSessionsRes.rows) {
            // Find the slot matching activeSess.datetime
            const sessDate = new Date(activeSess.datetime);
            const sessDayStr = format(sessDate, 'yyyy-MM-dd');

            const isLecturerBusy = activeSess.sess_lecturerid === lecturerid;
            const collisionReason = isLecturerBusy
                ? `Lecturer Busy (${activeSess.modulename})`
                : `Batch Busy (${activeSess.modulename})`;

            // Get session duration from DB (default 2 if not found/null)
            const sessionDurationHours = parseFloat(activeSess.duration) || 2;
            const slotsToBlock = Math.ceil(sessionDurationHours / 0.5);

            for (let i = 0; i < slotsToBlock; i++) {
                const slotTimeStr = format(addMinutes(sessDate, i * 30), 'HH:mm');
                const dayObj = grid.find(d => d.date === sessDayStr);
                if (dayObj) {
                    const slotObj = dayObj.slots.find(s => s.time === slotTimeStr);
                    if (slotObj) {
                        slotObj.status = 'BUSY';
                        slotObj.reason = collisionReason;
                    }
                }
            }
        }

        // 6. Block out durations that don't fit the continuous time requirement
        // Need roundUp(durationHours / 0.5) continuous slots
        const requiredContinuousSlots = Math.ceil(durationHours / 0.5);

        grid = grid.map(dayObj => {
            // Create a new slots array to preserve reference changes
            const newSlots = [...dayObj.slots];

            for (let i = 0; i < newSlots.length; i++) {
                if (newSlots[i].status === 'BUSY') continue;

                // Check if from i to i + requiredContinuousSlots - 1 are all AVAILABLE
                let hasEnoughTime = true;
                for (let j = 0; j < requiredContinuousSlots; j++) {
                    if (i + j >= newSlots.length || newSlots[i + j].status === 'BUSY') {
                        hasEnoughTime = false;
                        break;
                    }
                }

                if (!hasEnoughTime) {
                    // It's still "AVAILABLE" in that it's empty time, but it doesn't fit the requested duration
                    // Let's mark it 'SHORT' or 'UNAVAILABLE' to indicate the requested block doesn't fit
                    newSlots[i].status = 'UNAVAILABLE';
                    newSlots[i].reason = 'Insufficient duration';
                }
            }

            // We only return the fields needed
            return {
                day: dayObj.day,
                date: dayObj.date,
                slots: newSlots.map(s => ({
                    time: s.time,
                    status: s.status,
                    reason: s.reason
                }))
            };
        });

        return grid;
    }
}

module.exports = SlotFinderService;
