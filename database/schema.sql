-- Install or upgrade: `psql -d codeyoung_booking -f schema.sql -f seed.sql`  (safe to run again)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Upgrade from the earlier version that had parent accounts: those tables cannot be converted
-- (parents no longer have accounts; their details live on each booking), so test data from that
-- version is dropped and the tables are rebuilt below. Databases already on this schema are untouched.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = 'bookings' AND column_name = 'parent_id') THEN
    DROP TABLE bookings;
    DROP TABLE IF EXISTS parents;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  working_start TIME NOT NULL DEFAULT '09:00',
  working_end TIME NOT NULL DEFAULT '21:00',
  workdays SMALLINT[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::SMALLINT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A shift may cross midnight (e.g. 17:00-03:00 IST covers US evenings), so start > end is valid.
  CONSTRAINT mentor_working_hours_valid CHECK (working_start <> working_end)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES mentors(id),
  parent_name VARCHAR(100) NOT NULL,
  parent_email VARCHAR(255) NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,
  parent_timezone VARCHAR(100) NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  meeting_link TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_positive_duration CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS bookings_parent_email_idx
  ON bookings(LOWER(parent_email), start_at) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS bookings_mentor_start_idx
  ON bookings(mentor_id, start_at) WHERE status = 'confirmed';

-- Database-level safety net against two parents getting the same mentor at the same moment.
-- The booking transaction additionally checks every interval overlap and the 2-per-day cap.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_mentor_exact_start_unique
  ON bookings(mentor_id, start_at) WHERE status = 'confirmed';
