import { app } from './app.js';
import { config } from './config/env.js';
import { pool } from './db.js';

// Fail early with a plain-English message if the database was not set up (or is on an old schema),
// instead of showing parents "unexpected error" later.
async function checkDatabase() {
  try {
    await pool.query('SELECT parent_name, parent_email, parent_phone FROM bookings LIMIT 0');
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM mentors WHERE is_active');
    if (rows[0].n === 0) {
      console.warn('WARNING: there are no active mentors, so every day will show "No Slots Available".\n' +
        'Load them with: psql -d <your database> -f database/seed.sql');
    }
  } catch (err) {
    console.error(`\nDatabase is not ready: ${err.message}\n\n` +
      'Set it up (or upgrade it) from the project folder, then restart the API:\n' +
      '  psql -U postgres -d codeyoung_booking -f database/schema.sql -f database/seed.sql\n');
    await pool.end();
    process.exit(1);
  }
}

await checkDatabase();
const server = app.listen(config.port, () => {
  console.log(`Codeyoung booking API listening on http://localhost:${config.port}`);
});

async function shutdown() {
  console.log('Shutting down server...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
