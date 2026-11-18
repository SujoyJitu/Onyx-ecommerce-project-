const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

async function sendAuthEmail({ to, subject, text, html, developmentUrl }) {
  const transporter = createTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('Email delivery is not configured. Set SMTP_HOST and SMTP_FROM.');
      error.statusCode = 503;
      throw error;
    }
    console.info(`[development auth link] ${developmentUrl}`);
    return developmentUrl;
  }

  await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text, html });
  return null;
}

module.exports = { sendAuthEmail };
