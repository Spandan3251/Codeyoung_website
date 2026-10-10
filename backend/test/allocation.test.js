import test from 'node:test';
import assert from 'node:assert/strict';
import { isWithinWorkingHours, pickMentor, MAX_CLASSES_PER_MENTOR_PER_DAY } from '../src/services/allocation.js';
import { localWallTimeToDate } from '../src/utils/time.js';

const ist = (local) => localWallTimeToDate(local, 'Asia/Kolkata');
const hour = (d) => new Date(d.getTime() + 60 * 60 * 1000);
const mentor = (id, start = '09:00', end = '21:00', workdays = [0, 1, 2, 3, 4, 5, 6]) =>
  ({ id, name: id, timezone: 'Asia/Kolkata', working_start: start, working_end: end, workdays });
const fits = (m, local) => { const s = ist(local); return isWithinWorkingHours(s, hour(s), m); };

test('day shift: a class must finish by the end of the shift', () => {
  const m = mentor('a');
  assert.equal(fits(m, '2026-10-20T09:00'), true);
  assert.equal(fits(m, '2026-10-20T20:00'), true);
  assert.equal(fits(m, '2026-10-20T20:30'), false);
  assert.equal(fits(m, '2026-10-20T08:00'), false);
});

test('overnight shift (17:00-03:00) works across midnight', () => {
  const m = mentor('b', '17:00', '03:00');
  assert.equal(fits(m, '2026-10-20T17:00'), true);
  assert.equal(fits(m, '2026-10-20T23:00'), true);
  assert.equal(fits(m, '2026-10-21T02:00'), true);
  assert.equal(fits(m, '2026-10-21T02:30'), false);
  assert.equal(fits(m, '2026-10-20T16:00'), false);
  assert.equal(fits(m, '2026-10-20T12:00'), false);
});

test('mentors only work on their configured weekdays', () => {
  const weekdaysOnly = mentor('c', '09:00', '21:00', [1, 2, 3, 4, 5]);
  assert.equal(fits(weekdaysOnly, '2026-10-19T10:00'), true);  // Monday
  assert.equal(fits(weekdaysOnly, '2026-10-18T10:00'), false); // Sunday
});

test('10 mentors x 2 classes: 20 parents succeed, the 21st gets no mentor', () => {
  const mentors = Array.from({ length: 10 }, (_, i) => mentor(`m${String(i + 1).padStart(2, '0')}`));
  const bookingsByMentor = new Map();
  const book = (local) => {
    const start = ist(local);
    const end = hour(start);
    const picked = pickMentor(mentors, bookingsByMentor, start, end);
    if (picked) bookingsByMentor.set(picked.id, [...(bookingsByMentor.get(picked.id) ?? []), { mentor_id: picked.id, start_at: start, end_at: end }]);
    return picked;
  };

  const firstTen = Array.from({ length: 10 }, () => book('2026-10-20T10:00'));
  assert.equal(new Set(firstTen.map(m => m.id)).size, 10, 'load is spread across all mentors, not piled on Mentor 01');

  const nextTen = Array.from({ length: 10 }, () => book('2026-10-20T11:00'));
  assert.ok(nextTen.every(Boolean));
  assert.equal(book('2026-10-20T12:00'), null, 'every mentor already has the daily maximum');
  for (const list of bookingsByMentor.values()) assert.equal(list.length, MAX_CLASSES_PER_MENTOR_PER_DAY);
});

test('a mentor cannot be double-booked for overlapping times', () => {
  const only = [mentor('solo')];
  const bookings = new Map();
  const start = ist('2026-10-20T10:00');
  bookings.set('solo', [{ mentor_id: 'solo', start_at: start, end_at: hour(start) }]);
  assert.equal(pickMentor(only, bookings, start, hour(start)), null);
  const later = ist('2026-10-20T11:00');
  assert.equal(pickMentor(only, bookings, later, hour(later)).id, 'solo');
});

test('the daily cap resets on the next mentor-local day', () => {
  const only = [mentor('solo')];
  const day1a = ist('2026-10-20T10:00'), day1b = ist('2026-10-20T12:00');
  const bookings = new Map([['solo', [day1a, day1b].map(s => ({ mentor_id: 'solo', start_at: s, end_at: hour(s) }))]]);
  const sameDay = ist('2026-10-20T15:00');
  const nextDay = ist('2026-10-21T10:00');
  assert.equal(pickMentor(only, bookings, sameDay, hour(sameDay)), null);
  assert.equal(pickMentor(only, bookings, nextDay, hour(nextDay)).id, 'solo');
});

test('an overnight-shift mentor never gets more than 2 classes in one shift (no 4 across midnight)', () => {
  const only = [mentor('night', '17:00', '03:00')];
  const bookings = new Map();
  const book = (local) => {
    const start = ist(local);
    const picked = pickMentor(only, bookings, start, hour(start));
    if (picked) bookings.set('night', [...(bookings.get('night') ?? []), { mentor_id: 'night', start_at: start, end_at: hour(start) }]);
    return picked;
  };
  assert.ok(book('2026-10-20T18:00'));
  assert.ok(book('2026-10-20T19:00'));
  assert.equal(book('2026-10-20T23:00'), null);
  assert.equal(book('2026-10-21T01:00'), null, 'after midnight is still the same shift');
  assert.ok(book('2026-10-21T18:00'), 'next shift starts fresh');
});
