import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import { config } from '../config/env.js';
import { localWallTimeToDate, timeAtZone } from '../utils/time.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { groupByMentor, pickMentor } from './allocation.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOCATION_LOCK_KEY = 734219;
const durationMs = config.classDurationMinutes * 60 * 1000;
const formatHour = (h) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;

const BOOKING_SELECT = `
  SELECT b.id, b.mentor_id, b.start_at, b.end_at, b.status, b.meeting_link,
         b.parent_name, b.parent_email, b.parent_phone, b.parent_timezone,
         m.name AS mentor_name, m.email AS mentor_email, m.timezone AS mentor_timezone
    FROM bookings b
    JOIN mentors m ON m.id = b.mentor_id`;

// `db` is either the pool or a transaction client; both expose .query().
async function loadSchedule(db, from, to) {
  const mentors = (await db.query('SELECT * FROM mentors WHERE is_active = TRUE ORDER BY name, id')).rows;
  const bookings = (await db.query(
    `SELECT mentor_id, start_at, end_at FROM bookings
      WHERE status = 'confirmed' AND start_at < $2 AND end_at > $1`,
    [from, to]
  )).rows;
  return { mentors, bookingsByMentor: groupByMentor(bookings) };
}

async function getActiveBookingsByEmail(db, email) {
  const result = await db.query(
    `${BOOKING_SELECT}
      WHERE LOWER(b.parent_email) = LOWER($1) AND b.status = 'confirmed' AND b.end_at > NOW()
      ORDER BY b.start_at`,
    [email]
  );
  return result.rows;
}

// Every class start time (on the parent's local date) that at least one mentor can take.
// DST gaps/repeats are skipped (localWallTimeToDate throws for them), so only unambiguous times are offered.
export async function listAvailability({ date, timezone }) {
  const candidates = [];
  for (let hour = config.bookableFromHour; hour <= config.bookableToHour; hour++) {
    const startLocal = `${date}T${String(hour).padStart(2, '0')}:00:00`;
    let startAt;
    try { startAt = localWallTimeToDate(startLocal, timezone); } catch { continue; }
    if (startAt.getTime() <= Date.now()) continue;
    candidates.push({ startLocal: startLocal.slice(0, 16), startAt, endAt: new Date(startAt.getTime() + durationMs) });
  }
  if (!candidates.length) return [];

  // Two queries cover the whole day.
  const from = new Date(candidates[0].startAt.getTime() - 2 * DAY_MS);
  const to = new Date(candidates[candidates.length - 1].endAt.getTime() + 2 * DAY_MS);
  const { mentors, bookingsByMentor } = await loadSchedule(pool, from, to);
  return candidates.filter(c => pickMentor(mentors, bookingsByMentor, c.startAt, c.endAt));
}

export async function createBooking({ name, email, phone, startLocal, parentTimezone }) {
  const startAt = localWallTimeToDate(startLocal, parentTimezone);
  const endAt = new Date(startAt.getTime() + durationMs);
  if (startAt.getTime() <= Date.now()) throw new ValidationError('Please select a future appointment time.');
  const localHour = Number(timeAtZone(startAt, parentTimezone).slice(0, 2));
  if (localHour < config.bookableFromHour || localHour > config.bookableToHour) {
    throw new ValidationError(`Trial classes start between ${formatHour(config.bookableFromHour)} and ${formatHour(config.bookableToHour)} your local time.`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // One global lock serialises allocation (also across several API instances), so the
    // daily-cap and overlap checks below cannot race with a concurrent booking.
    await client.query('SELECT pg_advisory_xact_lock($1)', [ALLOCATION_LOCK_KEY]);

    const active = await getActiveBookingsByEmail(client, email);
    if (active.some(b => b.start_at < endAt && b.end_at > startAt)) {
      throw new ConflictError('This email already has a trial class at that time.', 'PARENT_OVERLAP');
    }
    if (config.maxActiveTrialsPerParent > 0 && active.length >= config.maxActiveTrialsPerParent) {
      throw new ConflictError(
        'A trial class is already booked with this email address. Use the cancel link in your confirmation email if you would like a different time.',
        'TRIAL_LIMIT_REACHED'
      );
    }

    const { mentors, bookingsByMentor } = await loadSchedule(
      client, new Date(startAt.getTime() - 2 * DAY_MS), new Date(endAt.getTime() + 2 * DAY_MS));
    const mentor = pickMentor(mentors, bookingsByMentor, startAt, endAt);
    if (!mentor) {
      throw new ConflictError('No slots available for this time. Please choose another time slot.', 'NO_MENTOR_AVAILABLE');
    }

    const id = randomUUID();
    await client.query(
      `INSERT INTO bookings (id, mentor_id, parent_name, parent_email, parent_phone, parent_timezone,
                             start_at, end_at, meeting_link, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')`,
      [id, mentor.id, name, email, phone, parentTimezone, startAt, endAt, `${config.meetingBaseUrl}/${id}`]
    );
    const booking = (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows[0];
    await client.query('COMMIT');
    return booking;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* connection already gone */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function getBooking(bookingId) {
  const result = await pool.query(`${BOOKING_SELECT} WHERE b.id = $1`, [bookingId]);
  return result.rows[0] || null;
}

export async function cancelBooking(bookingId) {
  const updated = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
      WHERE id = $1 AND status = 'confirmed' AND start_at > NOW() RETURNING id`,
    [bookingId]
  );
  const existing = await getBooking(bookingId);
  if (!existing) throw new NotFoundError('Booking not found.');
  if (!updated.rowCount) {
    if (existing.status === 'cancelled') throw new ConflictError('This booking is already cancelled.', 'ALREADY_CANCELLED');
    throw new ConflictError('A class that has already started cannot be cancelled.', 'ALREADY_STARTED');
  }
  return existing;
}
