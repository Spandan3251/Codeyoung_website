import pg from 'pg';
import { config } from './config/env.js';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: config.databaseUrl,
  // In production, configure SSL according to your database provider.
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});
