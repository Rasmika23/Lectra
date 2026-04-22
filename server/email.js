/**
 * @file email.js
 * @description Email service using Nodemailer for system notifications and user invitations.
 */

const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// SMTP transporter instance (lazily initialized)
let transporter;

/**
 * Gets the email transporter, initializing it if necessary.
 * @returns {import('nodemailer').Transporter}
 */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Sends an invitation email to a new user with a setup link.
 * @param {string} email - Recipient's email address.
 * @param {string} inviteLink - URL for account setup.
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
async function sendInviteEmail(email, inviteLink) {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM_EMAIL || '"Lectra" <noreply@lectra.com>',
      to: email,
      subject: 'Welcome to Lectra - Setup your Account',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>Welcome to Lectra!</h1>
          <p>You have been invited to join the Visiting Lecturers Management System.</p>
          <p>Please click the link below to set up your account name and password:</p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Setup Account</a>
          <p style="margin-top: 20px; color: #666;">Or copy this link: ${inviteLink}</p>
        </div>
      `,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
}

/**
 * Generic function to send formatted emails.
 * @param {string} to - Recipient email.
 * @param {string} subject - Email subject.
 * @param {string} textContent - Plain text fallback.
 * @param {string} htmlContent - Rich HTML content.
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
async function sendMail(to, subject, textContent, htmlContent) {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM_EMAIL || '"Lectra" <noreply@lectra.com>',
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });
    console.log('Generic Email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Generic Email sending failed:', error);
    return { success: false, error };
  }
}

module.exports = { 
  sendInviteEmail, 
  sendMail,
  /**
   * Sets a custom transporter instance (used for testing).
   * @param {Object} customTransporter - The transporter to use.
   */
  setTransporter: (customTransporter) => { transporter = customTransporter; }
};

