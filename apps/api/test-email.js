// test-email.js
// Standalone SMTP sanity check — run from apps/api with: node test-email.js
//
// This bypasses NestJS entirely and calls nodemailer directly, so if it
// works here but still fails inside the app, the problem is in how the
// app loads .env (or a leftover SMTP_HOST conflicting with GMAIL_USER),
// not in the Gmail credentials or network path.

require('dotenv').config();
const nodemailer = require('nodemailer');

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_APP_PASSWORD;

console.log('--- Config loaded from .env ---');
console.log('GMAIL_USER:', gmailUser || '(missing)');
console.log('GMAIL_APP_PASSWORD:', gmailPass ? `${gmailPass.slice(0, 4)}********` : '(missing)');
console.log('SMTP_HOST:', process.env.SMTP_HOST || '(not set)');
console.log('--------------------------------\n');

if (!gmailUser || !gmailPass) {
  console.error('❌ GMAIL_USER or GMAIL_APP_PASSWORD missing from .env — fix that first.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: gmailUser, pass: gmailPass },
});

async function main() {
  console.log('🔄 Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified — credentials and network path are good.\n');
  } catch (err) {
    console.error('❌ SMTP verify failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }

  console.log('🔄 Sending test email...');
  try {
    const info = await transporter.sendMail({
      from: `"CarsAuto Test" <${gmailUser}>`,
      to: gmailUser, // sends to yourself
      subject: '✅ CarsAuto SMTP Test',
      text: 'If you received this, your Gmail SMTP config works correctly.',
      html: '<p>If you received this, your Gmail SMTP config works correctly.</p>',
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ Send failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

main();

