const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendInviteEmail(email, inviteLink) {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // Default test domain. Change to your verified domain in prod.
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
    console.log('Email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
}

async function sendPasswordResetEmail(email, resetLink) {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Reset your Lectra Password',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password for the Visiting Lecturers Management System.</p>
          <p>Please click the link below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Reset Password</a>
          <p style="margin-top: 20px; color: #666;">Or copy this link: ${resetLink}</p>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">If you did not request this, please ignore this email. The link will expire in 1 hour.</p>
        </div>
      `,
    });
    console.log('Reset email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Reset email sending failed:', error);
    return { success: false, error };
  }
}

const sendOtpEmail = async (to, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Lectra <onboarding@resend.dev>',
      to: [to],
      subject: 'Lectra: Your Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Login Verification</h2>
          <p>Your one-time password (OTP) for login is:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Email exception:', err);
    return { success: false, error: err };
  }
};

module.exports = { sendInviteEmail, sendPasswordResetEmail, sendOtpEmail };
