import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';
import { isValid, addMinutes } from 'date-fns';
import { ValidationError } from './errors.js';

export function isValidTimeZone(zone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

// Input is a local wall-clock value without a Z/offset, e.g. 2026-10-15T10:00:00.
// The supplied IANA zone defines the intended instant.
export function localWallTimeToDate(localDateTime, timeZone) {
  if (typeof localDateTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(localDateTime)) {
    throw new ValidationError('startLocal must look like YYYY-MM-DDTHH:mm:ss without a UTC offset.');
  }
  if (!isValidTimeZone(timeZone)) throw new ValidationError('Invalid IANA time zone.');

  const normalizedInput = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
  const wallAsUtc = new Date(`${normalizedInput}Z`);
  if (!isValid(wallAsUtc) || wallAsUtc.toISOString().slice(0, 19) !== normalizedInput) {
    throw new ValidationError('Invalid local date and time.');
  }

  // Gather the time-zone offsets around the requested wall time. Testing each
  // possible offset lets us distinguish normal times from DST gaps and repeats.
  const offsets = new Set();
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    offsets.add(getTimezoneOffset(timeZone, new Date(wallAsUtc.getTime() + hours * 60 * 60 * 1000)));
  }

  const matches = [...offsets]
    .map(offset => new Date(wallAsUtc.getTime() - offset))
    .filter(candidate => formatInTimeZone(candidate, timeZone, "yyyy-MM-dd'T'HH:mm:ss") === normalizedInput);

  if (matches.length === 0) {
    throw new ValidationError('This local time does not exist because of a daylight-saving transition. Please choose another time.');
  }
  if (matches.length > 1) {
    throw new ValidationError('This local time occurs twice because of a daylight-saving transition. Please choose another time.');
  }
  return matches[0];
}

export function addDuration(start, minutes) {
  return addMinutes(start, minutes);
}

// Short zone names that read naturally to the people using the app:
// IST for India, BST/GMT for the UK, EDT/PST for the US (plain "GMT+5:30" otherwise).
function localeFor(zone) {
  if (zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return 'en-IN';
  if (zone.startsWith('Europe/')) return 'en-GB';
  return 'en-US';
}

export function zoneAbbreviation(instant, zone) {
  const parts = new Intl.DateTimeFormat(localeFor(zone), { timeZone: zone, timeZoneName: 'short' }).formatToParts(instant);
  return parts.find(p => p.type === 'timeZoneName')?.value ?? zone;
}

// "Mon, Oct 12, 2026 at 10:00 AM EDT (UTC-04:00)": the explicit offset removes any doubt.
export function formatLocal(instant, zone) {
  const when = formatInTimeZone(instant, zone, "EEE, MMM d, yyyy 'at' h:mm a");
  return `${when} ${zoneAbbreviation(instant, zone)} (UTC${formatInTimeZone(instant, zone, 'xxx')})`;
}

// "Mon, Oct 12, 2026, 5:30 PM – 6:30 PM BST (UTC+01:00)": the whole session in ONE person's zone.
export function formatRange(start, end, zone) {
  const sameDay = formatInTimeZone(start, zone, 'yyyy-MM-dd') === formatInTimeZone(end, zone, 'yyyy-MM-dd');
  const from = formatInTimeZone(start, zone, 'EEE, MMM d, yyyy, h:mm a');
  const to = formatInTimeZone(end, zone, sameDay ? 'h:mm a' : 'EEE, MMM d, h:mm a');
  return `${from} – ${to} ${zoneAbbreviation(start, zone)} (UTC${formatInTimeZone(start, zone, 'xxx')})`;
}

// "10:00 AM EDT": used on slot buttons.
export function formatSlotTime(instant, zone) {
  return `${formatInTimeZone(instant, zone, 'h:mm a')} ${zoneAbbreviation(instant, zone)}`;
}

export function dateAtZone(instant, zone) {
  return formatInTimeZone(instant, zone, 'yyyy-MM-dd');
}

export function timeAtZone(instant, zone) {
  return formatInTimeZone(instant, zone, 'HH:mm');
}

export function weekdayAtZone(instant, zone) {
  // JS Sunday=0 through Saturday=6
  return Number(formatInTimeZone(instant, zone, 'i')) % 7;
}
