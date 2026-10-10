// Pure allocation rules: no database access, so they are easy to unit-test.
import { dateAtZone, timeAtZone, weekdayAtZone } from '../utils/time.js';

export const MAX_CLASSES_PER_MENTOR_PER_DAY = 2;

const MINUTES_PER_DAY = 1440;
const toMinutes = (time) => {
  const [h, m] = String(time).split(':');
  return Number(h) * 60 + Number(m);
};

// A shift may cross midnight (e.g. 17:00-03:00 in the mentor's own zone), which is how
// mentors in India cover US evenings. We measure "minutes since the shift began".
export function isWithinWorkingHours(startAt, endAt, mentor) {
  if (!mentor.workdays.includes(weekdayAtZone(startAt, mentor.timezone))) return false;
  const shiftStart = toMinutes(mentor.working_start);
  const shiftEnd = toMinutes(mentor.working_end);
  const shiftLength = ((shiftEnd - shiftStart + MINUTES_PER_DAY) % MINUTES_PER_DAY) || MINUTES_PER_DAY;
  const sinceShiftStart =
    (toMinutes(timeAtZone(startAt, mentor.timezone)) - shiftStart + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const classLength = (endAt.getTime() - startAt.getTime()) / 60000;
  return sinceShiftStart + classLength <= shiftLength;
}

// "A day" is the mentor's own local calendar day.
export function classesOnMentorLocalDay(mentor, bookings, instant) {
  const day = dateAtZone(instant, mentor.timezone);
  return bookings.filter(b => dateAtZone(b.start_at, mentor.timezone) === day).length;
}

// The "shift day" a class belongs to: the local date on which that shift STARTED.
// For an overnight shift (17:00-03:00) a 01:00 class belongs to the previous evening's shift,
// so one shift can never be split into two "days" that each allow 2 classes (which gave 4).
export function shiftDay(mentor, instant) {
  return dateAtZone(new Date(instant.getTime() - toMinutes(mentor.working_start) * 60000), mentor.timezone);
}

export function classesOnMentorShiftDay(mentor, bookings, instant) {
  const day = shiftDay(mentor, instant);
  return bookings.filter(b => shiftDay(mentor, b.start_at) === day).length;
}

// Daily load = the stricter of the two counts, so BOTH the calendar-day and the shift limits hold.
export function mentorDailyLoad(mentor, bookings, instant) {
  return Math.max(
    classesOnMentorLocalDay(mentor, bookings, instant),
    classesOnMentorShiftDay(mentor, bookings, instant)
  );
}

export function overlaps(bookings, startAt, endAt) {
  return bookings.some(b => b.start_at < endAt && b.end_at > startAt);
}

export function groupByMentor(bookingRows) {
  const map = new Map();
  for (const row of bookingRows) {
    if (!map.has(row.mentor_id)) map.set(row.mentor_id, []);
    map.get(row.mentor_id).push(row);
  }
  return map;
}

// Picks the eligible mentor with the fewest classes that day (ties: first by name),
// so work is spread evenly instead of always filling Mentor 01 first.
export function pickMentor(mentors, bookingsByMentor, startAt, endAt) {
  let best = null;
  let bestLoad = Infinity;
  for (const mentor of mentors) {
    const bookings = bookingsByMentor.get(mentor.id) ?? [];
    if (!isWithinWorkingHours(startAt, endAt, mentor)) continue;
    const load = mentorDailyLoad(mentor, bookings, startAt);
    if (load >= MAX_CLASSES_PER_MENTOR_PER_DAY) continue;
    if (overlaps(bookings, startAt, endAt)) continue;
    if (load < bestLoad) { best = mentor; bestLoad = load; }
  }
  return best;
}
