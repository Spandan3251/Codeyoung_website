// Integration tests: real Express app + real PostgreSQL.
// They run against TEST_DATABASE_URL only (never your dev data) and are skipped when it is not set.
import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import request from 'supertest';

const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : 'set TEST_DATABASE_URL to run integration tests';

const isoDay = (daysAhead) => new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
let app, pool, createBooking, counter = 0;

const parent = (overrides = {}) => ({
  name: 'Test Parent',
  email: `parent${Date.now()}${counter++}@test.example`,
  phone: '+44 7700 900123',
  ...overrides
});

describe('booking API (no accounts)', { skip }, () => {
  before(async () => {
    process.env.DATABASE_URL = testUrl;
    process.env.BOOKING_RATE_LIMIT = '10000';
    process.env.MAX_ACTIVE_TRIALS_PER_PARENT = '1';
    ({ app } = await import('../src/app.js'));
    ({ pool } = await import('../src/db.js'));
    ({ createBooking } = await import('../src/services/booking.service.js'));
    await pool.query('DROP TABLE IF EXISTS bookings, parents, mentors CASCADE');
    await pool.query(readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8'));
    await pool.query(readFileSync(new URL('../../database/seed.sql', import.meta.url), 'utf8'));
  });
  after(async () => { await pool?.end(); });

  it('needs no login: slots are public, and unknown routes are 404', async () => {
    const res = await request(app).get(`/api/availability?date=${isoDay(10)}&timezone=Europe/London`);
    assert.equal(res.status, 200);
    assert.ok(res.body.slots.length > 0);
    assert.equal((await request(app).get('/api/does-not-exist')).status, 404);
  });

  it('accepts browsers on any local dev port (e.g. 127.0.0.1:5199) but not strangers', async () => {
    const local = await request(app).get('/api/health').set('Origin', 'http://127.0.0.1:5199');
    assert.equal(local.headers['access-control-allow-origin'], 'http://127.0.0.1:5199');
    const evil = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(evil.headers['access-control-allow-origin'], undefined);
  });

  it('books with name/email/phone and gives each side their own local time', async () => {
    const res = await request(app).post('/api/bookings')
      .send({ ...parent(), startLocal: `${isoDay(10)}T17:00`, parentTimezone: 'Europe/London' });
    assert.equal(res.status, 201);
    const b = res.body.booking;
    assert.match(b.parentLocalTime, /5:00 PM – 6:00 PM (BST|GMT) \(UTC\+0[01]:00\)/);
    assert.match(b.mentorLocalTime, /IST \(UTC\+05:30\)/);
    assert.notEqual(b.parentLocalTime, b.mentorLocalTime);
    assert.match(b.meetingLink, /^https:\/\//);
    assert.ok(b.mentor.name.startsWith('Mentor'));
    assert.equal(b.parentEmail, undefined, 'contact details are never returned');
    assert.equal(res.body.notification.emailedTo.endsWith('@test.example'), true);
  });

  it('validates the parent details', async () => {
    const base = { startLocal: `${isoDay(10)}T10:00`, parentTimezone: 'America/New_York' };
    const post = (extra) => request(app).post('/api/bookings').send({ ...parent(), ...base, ...extra });
    assert.equal((await post({ phone: '7700900123' })).status, 400);   // no country code
    assert.equal((await post({ phone: '+44 12' })).status, 400);       // too short
    assert.equal((await post({ email: 'not-an-email' })).status, 400);
    assert.equal((await post({ name: ' ' })).status, 400);
    assert.equal((await post({ startLocal: `${isoDay(10)}T25:00` })).status, 400);
    assert.equal((await post({ parentTimezone: 'Mars/Base' })).status, 400);
    assert.equal((await post({ startLocal: `${isoDay(10)}T03:00` })).status, 400); // outside 7 AM-9 PM
  });

  it('allows one upcoming trial per email, and cancelling frees it up', async () => {
    const p = parent();
    const body = { ...p, startLocal: `${isoDay(12)}T10:00`, parentTimezone: 'America/New_York' };
    const first = await request(app).post('/api/bookings').send(body);
    assert.equal(first.status, 201);

    const again = await request(app).post('/api/bookings').send({ ...body, email: p.email.toUpperCase(), startLocal: `${isoDay(12)}T15:00` });
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'TRIAL_LIMIT_REACHED');

    const id = first.body.booking.id;
    assert.equal((await request(app).get(`/api/bookings/${id}`)).status, 200);
    const cancelled = await request(app).post(`/api/bookings/${id}/cancel`);
    assert.equal(cancelled.body.booking.status, 'cancelled');
    assert.equal((await request(app).post(`/api/bookings/${id}/cancel`)).status, 409);
    assert.equal((await request(app).post('/api/bookings').send(body)).status, 201);
  });

  it('unknown booking ids are 404, malformed ids are 400', async () => {
    assert.equal((await request(app).get('/api/bookings/00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await request(app).get('/api/bookings/nope')).status, 400);
  });

  it('never exceeds 2 classes per mentor per day, then reports no slots', async () => {
    await pool.query('TRUNCATE bookings');
    const day = isoDay(20);
    const outcomes = [];
    for (let i = 0; i < 30; i++) {
      const h = String(7 + (i % 15)).padStart(2, '0'); // 07:00-21:00 IST
      try { await createBooking({ ...parent(), startLocal: `${day}T${h}:00`, parentTimezone: 'Asia/Kolkata' }); outcomes.push('ok'); }
      catch (e) { outcomes.push(e.code); }
    }
    const ok = outcomes.filter(o => o === 'ok').length;
    assert.ok(ok > 0 && ok <= 20, `booked ${ok}`);
    assert.ok(outcomes.filter(o => o !== 'ok').every(c => c === 'NO_MENTOR_AVAILABLE'));
    const perMentor = await pool.query(
      `SELECT COUNT(*)::int AS n FROM bookings GROUP BY mentor_id, (start_at AT TIME ZONE 'Asia/Kolkata')::date`);
    assert.ok(perMentor.rows.every(r => r.n <= 2));
  });

  it('shows no slots at all once every mentor is full for the day', async () => {
    await pool.query('TRUNCATE bookings');
    // Fill all 10 mentors x 2 classes with 20 different parents on one India-time day.
    const day = isoDay(22);
    let booked = 0;
    for (let h = 7; h <= 21 && booked < 20; h++) {
      for (let k = 0; k < 10 && booked < 20; k++) {
        try { await createBooking({ ...parent(), startLocal: `${day}T${String(h).padStart(2, '0')}:00`, parentTimezone: 'Asia/Kolkata' }); booked++; }
        catch { break; }
      }
    }
    assert.equal(booked, 20, 'capacity is exactly 10 mentors x 2 classes');
    const res = await request(app).get(`/api/availability?date=${day}&timezone=Asia/Kolkata`);
    assert.deepEqual(res.body.slots, []);
    const extra = await request(app).post('/api/bookings')
      .send({ ...parent(), startLocal: `${day}T12:00`, parentTimezone: 'Asia/Kolkata' });
    assert.equal(extra.status, 409);
    assert.equal(extra.body.code, 'NO_MENTOR_AVAILABLE');
  });

  it('is safe under concurrency: 15 parents racing for one slot get exactly the eligible mentors', async () => {
    await pool.query('TRUNCATE bookings');
    const results = await Promise.allSettled(Array.from({ length: 15 }, () =>
      createBooking({ ...parent(), startLocal: `${isoDay(21)}T18:00`, parentTimezone: 'Asia/Kolkata' })));
    // 18:00 IST is inside the day shift (Mentors 01-03) and the overnight shift (Mentors 04-06).
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 6);
    assert.ok(results.filter(r => r.status === 'rejected').every(r => r.reason.code === 'NO_MENTOR_AVAILABLE'));
  });
});
