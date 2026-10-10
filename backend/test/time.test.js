import test from 'node:test';
import assert from 'node:assert/strict';
import { localWallTimeToDate, formatLocal, formatRange } from '../src/utils/time.js';

test('converts New York wall time to an instant and formats local time', () => {
  const instant = localWallTimeToDate('2026-10-15T10:00:00', 'America/New_York');
  assert.equal(formatLocal(instant, 'America/New_York').includes('10:00 AM'), true);
  assert.equal(formatLocal(instant, 'Asia/Kolkata').includes('7:30 PM'), true);
});

test('rejects invalid time zone', () => {
  assert.throws(() => localWallTimeToDate('2026-10-15T10:00:00', 'Not/AZone'), /Invalid IANA time zone/);
});

test('rejects a nonexistent local time during spring-forward DST', () => {
  assert.throws(
    () => localWallTimeToDate('2026-03-08T02:30:00', 'America/New_York'),
    /does not exist because of a daylight-saving transition/
  );
});

test('rejects an ambiguous local time during fall-back DST', () => {
  assert.throws(
    () => localWallTimeToDate('2026-11-01T01:30:00', 'America/New_York'),
    /occurs twice because of a daylight-saving transition/
  );
});

test('uses friendly zone names and an explicit UTC offset', () => {
  const october = new Date('2026-10-12T12:00:00Z');
  const december = new Date('2026-12-12T12:00:00Z');
  assert.match(formatLocal(october, 'Asia/Kolkata'), /IST \(UTC\+05:30\)$/);
  assert.match(formatLocal(october, 'Europe/London'), /BST \(UTC\+01:00\)$/);
  assert.match(formatLocal(december, 'Europe/London'), /GMT \(UTC\+00:00\)$/);
  assert.match(formatLocal(october, 'America/New_York'), /EDT \(UTC-04:00\)$/);
  assert.match(formatLocal(december, 'America/New_York'), /EST \(UTC-05:00\)$/);
});

test('same wall-clock time maps to a different instant before and after DST ends', () => {
  const before = localWallTimeToDate('2026-10-30T10:00:00', 'America/New_York'); // EDT
  const after = localWallTimeToDate('2026-11-02T10:00:00', 'America/New_York');  // EST
  assert.equal(before.toISOString(), '2026-10-30T14:00:00.000Z');
  assert.equal(after.toISOString(), '2026-11-02T15:00:00.000Z');
});

test('invalid input is a ValidationError (HTTP 400), never a server error', () => {
  for (const bad of ['2026-10-12T25:00', 'tomorrow', '2026-02-30T10:00']) {
    assert.throws(() => localWallTimeToDate(bad, 'America/New_York'), err => err.status === 400);
  }
});

test('a UK parent at 5:30-6:30 PM maps to the matching India time for the mentor', () => {
  const summer = localWallTimeToDate('2026-10-12T17:30:00', 'Europe/London'); // BST, UTC+1
  const summerEnd = new Date(summer.getTime() + 3600000);
  assert.equal(formatRange(summer, summerEnd, 'Europe/London'), 'Mon, Oct 12, 2026, 5:30 PM – 6:30 PM BST (UTC+01:00)');
  assert.equal(formatRange(summer, summerEnd, 'Asia/Kolkata'), 'Mon, Oct 12, 2026, 10:00 PM – 11:00 PM IST (UTC+05:30)');

  const winter = localWallTimeToDate('2026-12-14T17:30:00', 'Europe/London'); // GMT, UTC+0: India is 5.5h ahead
  const winterEnd = new Date(winter.getTime() + 3600000);
  assert.equal(formatRange(winter, winterEnd, 'Asia/Kolkata'), 'Mon, Dec 14, 2026, 11:00 PM – Tue, Dec 15, 12:00 AM IST (UTC+05:30)');
});

test('ranges that cross midnight name both days', () => {
  const start = localWallTimeToDate('2026-12-14T17:30:00', 'Europe/London');
  const text = formatRange(start, new Date(start.getTime() + 3600000), 'Asia/Kolkata');
  assert.match(text, /11:00 PM – Tue, Dec 15, 12:00 AM IST/);
});
