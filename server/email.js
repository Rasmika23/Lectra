const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendInviteEmail(email, inviteLink) {
  try {
    const info = await transporter.sendMail({
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

module.exports = { sendInviteEmail };
