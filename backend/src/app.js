import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import bookingRoutes from './routes/booking.routes.js';
import { notFound, errorHandler } from './middleware/errors.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
// In development any localhost / 127.0.0.1 port is accepted (Vite moves to 5174 if 5173 is busy,
// and http://127.0.0.1:5173 is a different "origin" from http://localhost:5173). In production only
// the origins listed in FRONTEND_ORIGIN are allowed.
const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({
  origin: (origin, callback) => {
    const allowed = !origin || config.frontendOrigins.includes(origin) || (!config.isProduction && localDevOrigin.test(origin));
    callback(null, allowed);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Only writes are limited, so browsing slots is never throttled.
app.use('/api/bookings', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.bookingRateLimit,
  skip: (req) => req.method !== 'POST',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many booking attempts. Please try again in a few minutes.', code: 'RATE_LIMITED' }
}));
app.use('/api', bookingRoutes);
app.use(notFound);
app.use(errorHandler);
