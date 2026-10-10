// Country calling codes for the phone field: [ISO code, name, dial code].
export const COUNTRIES = [
  ['GB', 'United Kingdom', '+44'],
  ['US', 'United States', '+1'],
  ['CA', 'Canada', '+1'],
  ['IN', 'India', '+91'],
  ['IE', 'Ireland', '+353'],
  ['AU', 'Australia', '+61'],
  ['NZ', 'New Zealand', '+64'],
  ['AE', 'United Arab Emirates', '+971'],
  ['SA', 'Saudi Arabia', '+966'],
  ['QA', 'Qatar', '+974'],
  ['SG', 'Singapore', '+65'],
  ['MY', 'Malaysia', '+60'],
  ['DE', 'Germany', '+49'],
  ['FR', 'France', '+33'],
  ['ZA', 'South Africa', '+27']
];

// A sensible default country for the chosen time zone.
export function defaultCountryFor(zone) {
  if (zone === 'Europe/London') return 'GB';
  if (zone === 'Europe/Dublin') return 'IE';
  if (zone === 'America/Toronto') return 'CA';
  if (zone.startsWith('America/')) return 'US';
  if (zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return 'IN';
  if (zone === 'Asia/Dubai') return 'AE';
  if (zone === 'Asia/Singapore') return 'SG';
  if (zone.startsWith('Australia/')) return 'AU';
  if (zone === 'Europe/Paris' || zone === 'Europe/Berlin') return 'DE';
  return 'GB';
}

export const dialCodeOf = (iso) => COUNTRIES.find(([code]) => code === iso)?.[2] ?? '+44';
