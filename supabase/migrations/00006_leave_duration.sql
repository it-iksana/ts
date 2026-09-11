-- Run in the Supabase SQL Editor, after 00005. Adds a column with a
-- default that correctly backfills existing rows — does not delete or
-- otherwise touch any existing data.
--
-- THE ISSUE: leave has no duration of its own — it's always treated as a
-- full day, both in the table itself and in the one-day-total trigger.
-- Half-day leave plus half-day work has no way to be represented.
--
-- THE FIX: add `duration`, matching the same 0–1 fractional pattern
-- already used for timesheet_entries.day_fraction, for consistency.
--
-- EXISTING DATA: every leave row that already exists was created back
-- when full-day was the *only* possible meaning — there was no other
-- option, so a full day is not an assumption here, it's what those rows
-- actually represent. DEFAULT 1 on the ADD COLUMN step backfills existing
-- rows to exactly that value as part of this same migration.

ALTER TABLE leave_entries
  ADD COLUMN duration numeric(3, 2) NOT NULL DEFAULT 1 CHECK (duration > 0 AND duration <= 1);

-- The one-day-total trigger currently treats any leave row as a full day
-- regardless of its actual duration — update it to sum the real value.
CREATE OR REPLACE FUNCTION check_daily_total_within_one_day()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_employee uuid := NEW.employee_id;
  target_date date := NEW.entry_date;
  work_total numeric;
  leave_total numeric;
  combined_total numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_employee::text || target_date::text, 0));

  SELECT COALESCE(SUM(day_fraction), 0) INTO work_total
  FROM timesheet_entries
  WHERE employee_id = target_employee AND entry_date = target_date;

  SELECT COALESCE(SUM(duration), 0) INTO leave_total
  FROM leave_entries
  WHERE employee_id = target_employee AND entry_date = target_date;

  combined_total := work_total + leave_total;

  IF combined_total > 1 THEN
    RAISE EXCEPTION
      'Total logged for % would be % day(s) — cannot exceed 1 combined day of work and leave.',
      target_date, combined_total;
  END IF;

  RETURN NEW;
END;
$$;
