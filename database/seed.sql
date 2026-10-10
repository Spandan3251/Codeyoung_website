-- 10 mentors in India on three staggered shifts (all times Asia/Kolkata), so parents in the
-- UK and US can find slots at sensible local hours, not just at 2 AM:
--   Mentors 01-03  09:00-21:00  -> India any time, UK ~5 AM-3 PM, US ~11:30 PM-11:30 AM (ET)
--   Mentors 04-06  17:00-03:00  -> UK ~12:30-10:30 PM, US East ~8 AM-5:30 PM  (overnight shift)
--   Mentors 07-10  01:00-11:00  -> US East ~3:30 PM-1:30 AM, US West ~12:30-10:30 PM
INSERT INTO mentors (name, email, timezone, working_start, working_end, workdays, is_active)
VALUES
 ('Mentor 01', 'cs24.santanu.nandi@stcet.ac.in', 'Asia/Kolkata', '09:00', '21:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 02', 'santanu2005nandi@gmail.com', 'Asia/Kolkata', '09:00', '21:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 03', 'santanu26nandi@gmail.com', 'Asia/Kolkata', '09:00', '21:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 04', 'santanunandiedu2005@gmail.com', 'Asia/Kolkata', '17:00', '03:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 05', 'polleyspandan3251@gmail.com', 'Asia/Kolkata', '17:00', '03:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 06', 'cs24.spandan.polley@stcet.ac.in', 'Asia/Kolkata', '17:00', '03:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 07', 'kyahalchal005@gmail.com', 'Asia/Kolkata', '01:00', '11:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 08', 'polleysanjit@gmail.com', 'Asia/Kolkata', '01:00', '11:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 09', 'polleysumana8@gmail.com', 'Asia/Kolkata', '01:00', '11:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE),
 ('Mentor 10', 'prabirmallickyt419@gmail.com', 'Asia/Kolkata', '01:00', '11:00', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], TRUE)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  timezone = EXCLUDED.timezone,
  working_start = EXCLUDED.working_start,
  working_end = EXCLUDED.working_end,
  workdays = EXCLUDED.workdays,
  is_active = TRUE;
