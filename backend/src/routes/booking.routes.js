import { Router } from 'express';
import { z } from 'zod';
import { isValidTimeZone, formatRange, formatSlotTime } from '../utils/time.js';
import { config } from '../config/env.js';
import { cancelBooking, createBooking, getBooking, listAvailability } from '../services/booking.service.js';
import { emailMode, sendBookingNotifications } from '../utils/email.js';

const router = Router();

const timezoneSchema = z.string().min(1).refine(isValidTimeZone, 'Please choose a valid time zone.');
const idSchema = z.string().uuid('Invalid booking id.');

// Phone numbers must include the country code. Spaces, dashes and brackets are ignored.
const phoneSchema = z.string()
  .transform(v => v.replace(/[\s().-]/g, ''))
  .pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, 'Enter a phone number with its country code, e.g. +44 7700 900123.'));

const bookingSchema = z.object({
  name: z.string().trim().min(2, 'Please enter the parent’s full name.').max(100),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(255),
  phone: phoneSchema,
  startLocal: z.string(),
  parentTimezone: timezoneSchema
});

// A booking is shown in the parent's zone and in the mentor's zone. Contact details are never returned.
function toDto(b) {
  const start = new Date(b.start_at);
  const end = new Date(b.end_at);
  return {
    id: b.id,
    status: b.status,
    startAt: b.start_at,
    endAt: b.end_at,
    meetingLink: b.meeting_link,
    parentName: b.parent_name,
    parentTimezone: b.parent_timezone,
    parentLocalTime: formatRange(start, end, b.parent_timezone),
    mentorLocalTime: formatRange(start, end, b.mentor_timezone),
    mentor: { name: b.mentor_name, timezone: b.mentor_timezone }
  };
}

const notify = (kind, booking) =>
  sendBookingNotifications(kind, booking).catch(err => console.error('Notification error:', err.message));

router.get('/availability', async (req, res, next) => {
  try {
    const { date, timezone } = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid date.'),
      timezone: timezoneSchema
    }).parse(req.query);

    const slots = await listAvailability({ date, timezone });
    res.json({
      date,
      timezone,
      durationMinutes: config.classDurationMinutes,
      slots: slots.map(s => ({
        startLocal: s.startLocal,
        startAt: s.startAt.toISOString(),
        displayTime: formatSlotTime(s.startAt, timezone)
      }))
    });
  } catch (err) { next(err); }
});

router.post('/bookings', async (req, res, next) => {
  try {
    const input = bookingSchema.parse(req.body);
    const booking = await createBooking(input);
    notify('confirmed', booking);
    res.status(201).json({
      booking: toDto(booking),
      notification: { emailedTo: input.email, mode: emailMode() }
    });
  } catch (err) { next(err); }
});

// The booking id is an unguessable UUID, so the confirmation page can be reopened from the email link.
router.get('/bookings/:id', async (req, res, next) => {
  try {
    const booking = await getBooking(idSchema.parse(req.params.id));
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ booking: toDto(booking) });
  } catch (err) { next(err); }
});

router.post('/bookings/:id/cancel', async (req, res, next) => {
  try {
    const booking = await cancelBooking(idSchema.parse(req.params.id));
    notify('cancelled', booking);
    res.json({ booking: toDto({ ...booking, status: 'cancelled' }) });
  } catch (err) { next(err); }
});

export default router;
