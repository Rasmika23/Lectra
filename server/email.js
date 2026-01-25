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

module.exports = { sendInviteEmail };
