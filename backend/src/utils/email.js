import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { formatRange } from './time.js';

let transporter = null;
function getTransporter() {
  if (!config.smtp.enabled) return null;
  transporter ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass }
  });
  return transporter;
}

export const emailMode = () => (config.smtp.enabled ? 'smtp' : 'console');

// The parent gets the class in THEIR zone; the mentor gets the SAME instant in the MENTOR'S zone.
// e.g. 5:30-6:30 PM in London (BST) is 10:00-11:00 PM for a mentor in India.
function buildMessages(kind, b) {
  const start = new Date(b.start_at);
  const end = new Date(b.end_at);
  const parentTime = formatRange(start, end, b.parent_timezone);
  const mentorTime = formatRange(start, end, b.mentor_timezone);

  if (kind === 'cancelled') {
    return [
      { to: b.parent_email, subject: 'Your Codeyoung trial class was cancelled',
        text: `Hi ${b.parent_name},\n\nYour trial class with ${b.mentor_name} on ${parentTime} has been cancelled.\n\nYou are welcome to book a new time whenever you like.` },
      { to: b.mentor_email, subject: 'Codeyoung trial class cancelled',
        text: `Hi ${b.mentor_name},\n\nThe trial class with ${b.parent_name} on ${mentorTime} has been cancelled. No action is needed.` }
    ];
  }
  return [
    { to: b.parent_email, subject: 'Your Codeyoung trial class is confirmed',
      text: `Hi ${b.parent_name},\n\nYour trial class is confirmed!\n\nMentor: ${b.mentor_name}\nTime (your local time): ${parentTime}\nJoin the class: ${b.meeting_link}\n\nNeed to cancel? ${config.frontendOrigin}/booking/${b.id}` },
    { to: b.mentor_email, subject: 'New Codeyoung trial class assigned to you',
      text: `Hi ${b.mentor_name},\n\nYou have a trial class session.\n\nParent: ${b.parent_name}\nTime (your local time): ${mentorTime}\nJoin the class: ${b.meeting_link}` }
  ];
}

export async function sendBookingNotifications(kind, booking) {
  const messages = buildMessages(kind, booking);
  const mailer = getTransporter();

  if (mailer) {
    const results = await Promise.allSettled(
      messages.map(m => mailer.sendMail({ from: config.smtp.from, ...m }))
    );
    results.filter(r => r.status === 'rejected').forEach(r => console.error('Email failed:', r.reason?.message));
    return;
  }

  // Demo mode (no SMTP configured): print what would have been sent.
  for (const m of messages) {
    console.log(`\n========== SIMULATED EMAIL ==========\nTo: ${m.to}\nSubject: ${m.subject}\n\n${m.text}\n=====================================\n`);
  }
}
