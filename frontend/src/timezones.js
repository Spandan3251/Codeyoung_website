// Zones offered in the UI. The browser's own zone is added automatically if it is not listed.
export const ZONES = [
  ['America/New_York', 'US — New York (Eastern)'],
  ['America/Chicago', 'US — Chicago (Central)'],
  ['America/Denver', 'US — Denver (Mountain)'],
  ['America/Phoenix', 'US — Phoenix (no daylight saving)'],
  ['America/Los_Angeles', 'US — Los Angeles (Pacific)'],
  ['America/Toronto', 'Canada — Toronto'],
  ['Europe/London', 'UK — London'],
  ['Europe/Dublin', 'Ireland — Dublin'],
  ['Europe/Paris', 'Europe — Paris / Berlin'],
  ['Asia/Dubai', 'UAE — Dubai'],
  ['Asia/Kolkata', 'India — Kolkata'],
  ['Asia/Singapore', 'Singapore'],
  ['Australia/Sydney', 'Australia — Sydney']
];

export function zoneOptions(current) {
  return ZONES.some(([value]) => value === current) ? ZONES : [[current, current.replaceAll('_', ' ')], ...ZONES];
}

export const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';

export const zoneLabel = (zone) => zoneOptions(zone).find(([v]) => v === zone)?.[1] ?? zone.replaceAll('_', ' ');

// Today's calendar date (YYYY-MM-DD) in the given zone.
export function todayIn(zone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
