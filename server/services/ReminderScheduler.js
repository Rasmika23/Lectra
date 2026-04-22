/**
 * @file ReminderScheduler.js
 * @description Background service that manages automated session reminders via Email and WhatsApp.
 * It uses node-cron to periodically check for upcoming sessions and dispatch notifications.
 */

const cron = require('node-cron');
const db = require('../db');
const { sendInviteEmail } = require('../email'); 
const whatsappService = require('./WhatsAppService');

// Custom plain text email sender for reminders
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends a plain text reminder email.
 * @param {string} email - Recipient's email.
 * @param {string} subject - Email subject.
 * @param {string} textContent - Plain text message.
 * @returns {Promise<boolean>} Success status.
 */
async function sendReminderEmail(email, subject, textContent) {
   try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || '"Lectra" <noreply@lectra.com>',
      to: email,
      subject: subject,
      text: textContent,
      html: `<div style="font-family: sans-serif; padding: 20px;"><p>${textContent.replace(/\n/g, '<br>')}</p></div>`,
    });
    return true;
  } catch (error) {
    console.error('Reminder Email sending failed:', error);
    return false;
  }
}

/**
 * The ReminderScheduler class manages the lifecycle of automated notifications.
 */
class ReminderScheduler {
  constructor() {
    this.task = null;
  }

  /**
   * Starts the hourly cron job for reminders.
   */
  start() {
    console.log('Starting ReminderScheduler (runs every hour at minute 0)...');
    
    // Run at the beginning of every hour (e.g. 10:00, 11:00)
    this.task = cron.schedule('0 * * * *', async () => {
       await this.checkAndSendReminders();
    });
    
    // Optionally call it once immediately on startup for testing/catching up
    // this.checkAndSendReminders();
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log('ReminderScheduler stopped.');
    }
  }

  /**
   * Main logic that scans the database for sessions needing reminders.
   * Runs every hour.
   */
  async checkAndSendReminders() {
    console.log(`[${new Date().toISOString()}] Checking for session reminders...`);
    try {
      // 1. Find all modules that have reminders configured
      const modulesQuery = `
        SELECT m.moduleid, m.modulecode, mc.modulename, m.reminder_hours, m.reminder_template, t.academicyear, t.semester
        FROM module m 
        JOIN module_catalog mc ON m.modulecode = mc.modulecode
        JOIN academic_terms t ON m.termid = t.termid
        WHERE reminder_hours IS NOT NULL
      `;
      const modulesRes = await db.query(modulesQuery);
      const modules = modulesRes.rows;

      if (modules.length === 0) return; // No modules configured for reminders

      const now = new Date();

      for (const mod of modules) {
        const targetMs = mod.reminder_hours * 60 * 60 * 1000;

        // 2. Find sessions for this module scheduled in the future, where difference <= targetMs, and reminder_sent is false
        // We add a grace period (e.g. up to 1 hour past the target interval) so we don't miss any if the cron job is slightly delayed.
        // Or simply: time until session is between 0 and reminder_hours hours.
        const sessionsRes = await db.query(`
          SELECT * FROM session 
          WHERE moduleid = $1 
            AND reminder_sent = false 
            AND datetime > $2
        `, [mod.moduleid, now]);

        for (const session of sessionsRes.rows) {
          const sessionTime = new Date(session.datetime);
          const timeDiff = sessionTime.getTime() - now.getTime();

          // If the session is within the reminder window
          if (timeDiff > 0 && timeDiff <= targetMs) {
             console.log(`Sending reminders for session ${session.sessionid} of module ${mod.moduleid}`);
             await this.processSessionReminders(session, mod);
          }
        }
      }

    } catch (err) {
       console.error('Error in checkAndSendReminders:', err);
    }
  }

  /**
   * Processes reminders for a specific session, notifying assigned lecturers.
   * @param {Object} session - The session record from DB.
   * @param {Object} mod - The module record with template and settings.
   */
  async processSessionReminders(session, mod) {
    try {
        // Find assigned lecturers for this module who want reminders
        const lecturersRes = await db.query(`
            SELECT ml.lecturerid, ml.wants_reminders, u.email, u.phonenumber, u.name
            FROM modulelecturer ml
            JOIN users u ON ml.lecturerid = u.userid
            WHERE ml.moduleid = $1 AND ml.wants_reminders = true
        `, [session.moduleid]);

        if (lecturersRes.rows.length === 0) {
            // Mark as sent even if no one wanted it, so we don't keep trying
            await db.query('UPDATE session SET reminder_sent = true WHERE sessionid = $1', [session.sessionid]);
            return;
        }

        const sessionDateStr = new Date(session.datetime).toLocaleString();
        const moduleName = mod.modulename || 'N/A';
        const moduleCode = mod.modulecode || 'N/A';

        for (const lecturer of lecturersRes.rows) {
            // Customize template if provided, else generic message
            let messageText = mod.reminder_template || `Reminder:\n\n You have an upcoming session for {moduleCode} - {moduleName} scheduled at {sessionDate}.\n\n_Lectra VLMS_`;
            // Simple string replacements
            messageText = messageText.replace('{lecturerName}', lecturer.name)
                                     .replace('{sessionDate}', sessionDateStr)
                                     .replace('{moduleName}', moduleName)
                                     .replace('{moduleCode}', moduleCode)
                                     .replace('{location}', session.locationorurl || 'TBD');

            // Send Email
            if (lecturer.email) {
                await sendReminderEmail(lecturer.email, 'Upcoming Session Reminder', messageText);
            }

            // Send WhatsApp
            const phone = lecturer.phonenumber;
            if (phone) {
                await whatsappService.sendMessage(phone, messageText);
            }

            // Log to the reminder table
            await db.query(
                'INSERT INTO reminder (sessionid, recipientid, content, senttime) VALUES ($1, $2, $3, NOW())',
                [session.sessionid, lecturer.lecturerid, messageText]
            );
        }

        // --- Notify Sub-Coordinator ---
        const moduleRes = await db.query('SELECT subcoordinatorid FROM module WHERE moduleid = $1', [session.moduleid]);
        if (moduleRes.rows.length > 0 && moduleRes.rows[0].subcoordinatorid) {
            const subId = moduleRes.rows[0].subcoordinatorid;
            const subRes = await db.query('SELECT name, email, phonenumber FROM users WHERE userid = $1', [subId]);
            
            if (subRes.rows.length > 0) {
                const sub = subRes.rows[0];
                const lecturerNames = lecturersRes.rows.map(l => l.name).join(', ');
                const subMessage = `Notification: Automated reminder sent to lecturer(s) (${lecturerNames}) for module ${moduleCode} - ${moduleName} session scheduled at ${sessionDateStr}.`;
                
                if (sub.email) {
                    await sendReminderEmail(sub.email, 'Lecturer Reminder Notification', subMessage);
                }
                if (sub.phonenumber) {
                    await whatsappService.sendMessage(sub.phonenumber, subMessage);
                }
            }
        }

        // Mark session as reminder sent
        await db.query('UPDATE session SET reminder_sent = true WHERE sessionid = $1', [session.sessionid]);
        console.log(`Reminders sent and marked for session ${session.sessionid}`);

    } catch (err) {
        console.error(`Error processing reminders for session ${session.sessionid}:`, err);
    }
  }

  async triggerManualReminder(sessionId) {
    try {
      // Fetch session and module details
      const sessionRes = await db.query('SELECT * FROM session WHERE sessionid = $1', [sessionId]);
      if (sessionRes.rows.length === 0) throw new Error('Session not found');
      
      const session = sessionRes.rows[0];
      const moduleQuery = `
        SELECT m.moduleid, m.modulecode, mc.modulename, m.reminder_template, t.academicyear, t.semester
        FROM module m 
        JOIN module_catalog mc ON m.modulecode = mc.modulecode
        JOIN academic_terms t ON m.termid = t.termid 
        WHERE moduleid = $1
      `;
      const moduleRes = await db.query(moduleQuery, [session.moduleid]);
      if (moduleRes.rows.length === 0) throw new Error('Module not found');
      
      const mod = moduleRes.rows[0];
      
      console.log(`Manual reminder triggered for session ${sessionId}`);
      await this.processSessionReminders(session, mod);
      return { success: true };
    } catch (err) {
      console.error(`Error triggering manual reminder for session ${sessionId}:`, err);
      throw err;
    }
  }
}

// Export singleton
const reminderScheduler = new ReminderScheduler();
module.exports = reminderScheduler;
