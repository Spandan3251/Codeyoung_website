# Codeyoung Trial-Class Booking

Parents land on a scrolling home page (hero, courses, about, newsletter, parent reviews, doubt box) and book a free trial class **without creating an account**. The nav bar has Home, Courses, About, Contact, Help (Contact and Help are placeholders) and a **Book a Trial Class** button that opens the form at `/book`.

The booking journey:

1. **Details page** – name, email, phone (with country code) and time zone → **Book a Trial Class**.
2. **Date & time page** – pick a date on the calendar (left) and a time slot (right). If every mentor is full the right side shows **No Slots Available**; otherwise it shows how many time slots are free that day.
3. **Confirmation page** – the booked time, the mentor's name and the dummy class link.

The system then assigns a free mentor automatically and emails **both** people:
- the **parent**: the class time in *their* local time, the mentor's name and the join link;
- the **mentor**: the *same* class in *their own* local time (India), the parent's name and the join link.

Example: a UK parent booking 5:30–6:30 PM (BST) is shown to the mentor as 10:00–11:00 PM IST (UTC+05:30). In winter, when the UK is on GMT, the same wall-clock time is 11:00 PM–12:00 AM IST. Conversions use IANA time zones, so daylight saving is always correct.

Stack: React + Vite · Node.js + Express · PostgreSQL.

## Run it

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
# 1. Database
createdb codeyoung_booking
psql -d codeyoung_booking -f database/schema.sql -f database/seed.sql

# 2. API  (http://localhost:8090)
cd backend
cp .env.example .env        # set DATABASE_URL (user/password) for your PostgreSQL
npm install
npm run dev

# 3. Web app  (http://localhost:5173), in a second terminal
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 and book a class. Until SMTP is configured, both emails are printed in the **API terminal** (look for `SIMULATED EMAIL`).

> Upgrading from the earlier version that had parent accounts? Just run the `psql … -f database/schema.sql -f database/seed.sql` line again: it detects the old tables and rebuilds them (old test bookings are discarded). If the API says "Database is not ready", this is the fix.

### Mentors' names and emails
The 10 mentors live in the `mentors` table (`database/seed.sql`). Their emails are placeholders (`mentor01@codeyoung.example`). To send to real inboxes:

```sql
UPDATE mentors SET name = 'Asha Verma', email = 'asha@gmail.com' WHERE email = 'mentor01@codeyoung.example';
```

### Sending real emails (e.g. Gmail)
Set these in `backend/.env` and restart the API. For Gmail, create an *App password* (Google Account → Security → 2-Step Verification → App passwords):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.address@gmail.com
SMTP_PASS=<16-character app password>
EMAIL_FROM=Codeyoung Trial Classes <your.address@gmail.com>
```

### Tests
```bash
cd backend  && npm test    # unit tests always run; API+database tests need TEST_DATABASE_URL
cd frontend && npm test    # full parent journey, calendar, validation, "No Slots Available"
```
For the database tests create an empty database (`createdb codeyoung_test`) and set `TEST_DATABASE_URL` in `backend/.env`. They rebuild the tables of that database, so never point it at real data.

## How the requirements are met

| Requirement | Implementation |
|---|---|
| 10 mentors | Seeded in `database/seed.sql` with name and email. |
| 20 slots per day | 10 mentors × 2 classes = 20. When all are taken the day shows **No Slots Available**. Tested. |
| Max 2 classes / mentor / day | Counted on the **mentor's local calendar day AND per shift** (so an overnight shift cannot be split into two days), inside a transaction with a Postgres advisory lock, so parallel bookings cannot oversubscribe a mentor (tested with 15 simultaneous requests). |
| Automatic mentor assignment | The free mentor with the fewest classes that day is chosen. |
| Local times everywhere | Times are stored in UTC. The parent sees their chosen zone; the mentor's email uses the mentor's zone. Every time carries the zone name and UTC offset. |
| Daylight saving | IANA zones via `date-fns-tz`. Times that do not exist (spring forward) or occur twice (fall back) are never offered and are rejected by the API. |
| Dummy links | A unique link per booking, shown on the confirmation page and in both emails. |
| No mentor available | The slot list shows **No Slots Available**; if someone takes a slot a moment earlier, the parent gets a clear message and the list refreshes. |

### Mentor shifts
All mentors are in India, so shifts are staggered (shifts may cross midnight) to give US/UK parents sensible hours. All times Asia/Kolkata:

| Mentors | Shift | Covers well |
|---|---|---|
| 01–03 | 09:00–21:00 | India, UK mornings |
| 04–06 | 17:00–03:00 | UK afternoon/evening, US mornings |
| 07–10 | 01:00–11:00 | US afternoon/evening |

Parents can choose class start times between 07:00 and 21:00 their local time (`BOOKABLE_FROM_HOUR` / `BOOKABLE_TO_HOUR`).

### Behaviour worth knowing
- **One upcoming trial class per email address** (`MAX_ACTIVE_TRIALS_PER_PARENT`, `0` = unlimited), so one family cannot hold many of the 20 daily slots.
- **Cancelling** is possible from the confirmation page; the parent's email contains that link. Cancelling frees the mentor and emails both sides.
- Contact details (email/phone) are never returned by the API; booking ids are unguessable UUIDs.
- Booking requests are rate-limited per IP.

## Project layout

```
backend/src
  routes/booking.routes.js     validation (zod) + response shaping
  services/booking.service.js  transaction, limits, queries
  services/allocation.js       pure rules: working hours (incl. overnight), daily cap, mentor choice
  utils/time.js                time-zone / DST maths and formatting
  utils/email.js               SMTP, or console output when SMTP is not configured
database/schema.sql, seed.sql
frontend/src
  pages/DetailsPage, SchedulePage, ConfirmationPage
  components/Calendar.jsx
```

## API
| Method | Path | |
|---|---|---|
| GET | `/api/availability?date=YYYY-MM-DD&timezone=Europe/London` | free start times for that parent-local date |
| POST | `/api/bookings` | `{ name, email, phone: "+44 7700900123", startLocal: "2026-10-12T17:00", parentTimezone }` |
| GET | `/api/bookings/:id` | |
| POST | `/api/bookings/:id/cancel` | |
| GET | `/api/health` | |

Errors return `{ message, code }` (e.g. `NO_MENTOR_AVAILABLE`, `TRIAL_LIMIT_REACHED`, `VALIDATION_ERROR`).

## AI usage
Built with AI assistance. The full prompts and responses are in `TRANSCRIPT.md`.
