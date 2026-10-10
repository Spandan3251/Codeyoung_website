import 'dotenv/config';

if (!process.env.DATABASE_URL) throw new Error('Missing required environment variable: DATABASE_URL');

const int = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: int(process.env.PORT, 8090),
  databaseUrl: process.env.DATABASE_URL,
  // First entry is used for links in emails. Several origins may be given, comma-separated.
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim()).filter(Boolean),
  isProduction: process.env.NODE_ENV === 'production',
  classDurationMinutes: int(process.env.CLASS_DURATION_MINUTES, 60),
  meetingBaseUrl: process.env.MEETING_BASE_URL || 'https://demo.codeyoung.example/class',
  // Parents can only pick class start times inside this local-time window (hours 0-23, inclusive).
  bookableFromHour: int(process.env.BOOKABLE_FROM_HOUR, 7),
  bookableToHour: int(process.env.BOOKABLE_TO_HOUR, 21),
  // Upcoming trial classes allowed per email address. 0 = unlimited.
  maxActiveTrialsPerParent: int(process.env.MAX_ACTIVE_TRIALS_PER_PARENT, 1),
  // Booking/cancel requests allowed per IP per 15 minutes.
  bookingRateLimit: int(process.env.BOOKING_RATE_LIMIT, 40),
  smtp: {
    host: process.env.SMTP_HOST,
    port: int(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
    enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM)
  }
};

config.frontendOrigin = config.frontendOrigins[0];
