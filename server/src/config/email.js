// src/config/email.js — Nodemailer transporter
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: false, // TLS via STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send a 6-digit verification email to a newly registered user.
 * @param {string} toEmail
 * @param {string} fullName
 * @param {string} code  6-digit string
 */
const sendVerificationEmail = async (toEmail, fullName, code, is2FA = false) => {
  const from = process.env.EMAIL_FROM || `"SavePlate" <${process.env.EMAIL_USER}>`;
  const subject = is2FA ? 'Your SavePlate 2FA Code' : 'Verify your SavePlate account';
  const heading = is2FA ? `SavePlate Security Verification` : `Welcome to SavePlate, ${fullName}!`;
  const pText = is2FA 
    ? 'Use the 6-digit code below to log in to your account.' 
    : 'Use the 6-digit code below to verify your email address.';

  await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">${heading}</h2>
        <p>${pText}
           The code expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;
                    padding:24px;background:#f3f4f6;text-align:center;
                    margin:24px 0">${code}</div>
        <p style="color:#6b7280;font-size:13px">
          If you did not create a SavePlate account, you can ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = { transporter, sendVerificationEmail };
