-- Run in the Supabase SQL Editor, after 00004. Does not delete or modify
-- any existing rows — only adds a trigger that validates future changes.
-- If any existing data already exceeds one day for some employee/date
-- combination, this migration will not touch it, but any *further* change
-- to that same employee/date will be validated going forward.
--
-- THE ISSUE: day_fraction is correctly bounded to at most 1 per row, but
-- nothing stops several rows for the same employee and date from adding
-- up to more than one day between them — a CHECK constraint only ever
-- sees a single row, it can't sum across others.
--
-- THE FIX: a trigger that, on every insert/update to either
-- timesheet_entries or leave_entries, recomputes the true combined total
-- for that employee+date (all timesheet fractions, plus a full day if a
-- leave entry exists — leave has no fraction of its own yet, that's a
-- separate item) and rejects the change if it would exceed one day.
--
-- CONCURRENCY: a naive "read the current total, then decide" check has a
-- real race — two simultaneous submissions can each read the total
-- *before* either commits, both see room, and both proceed, together
-- exceeding the limit. This uses a transaction-scoped advisory lock keyed
-- to (employee, date) so two simultaneous attempts for the same
-- employee+date are forced to run one after the other, never both
-- reading the same stale snapshot. Different employees or different
-- dates never contend with each other at all.

CREATE OR REPLACE FUNCTION check_daily_total_within_one_day()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_employee uuid := NEW.employee_id;
  target_date date := NEW.entry_date;
  work_total numeric;
  has_leave boolean;
  combined_total numeric;
BEGIN
  -- Serialize any concurrent attempt for this exact employee+date. Held
  -- until the transaction ends, so a second simultaneous submission
  -- genuinely waits for the first to finish rather than racing it.
  PERFORM pg_advisory_xact_lock(hashtextextended(target_employee::text || target_date::text, 0));

  SELECT COALESCE(SUM(day_fraction), 0) INTO work_total
  FROM timesheet_entries
  WHERE employee_id = target_employee AND entry_date = target_date;

  SELECT EXISTS(
    SELECT 1 FROM leave_entries
    WHERE employee_id = target_employee AND entry_date = target_date
  ) INTO has_leave;

  -- Leave has no fraction column yet (a separate item covers adding one),
  -- so for now a leave entry counts as a full day.
  combined_total := work_total + (CASE WHEN has_leave THEN 1 ELSE 0 END);

  IF combined_total > 1 THEN
    RAISE EXCEPTION
      'Total logged for % would be % day(s) — cannot exceed 1 combined day of work and leave.',
      target_date, combined_total;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_daily_total_timesheet ON timesheet_entries;
CREATE TRIGGER trigger_check_daily_total_timesheet
  AFTER INSERT OR UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION check_daily_total_within_one_day();

DROP TRIGGER IF EXISTS trigger_check_daily_total_leave ON leave_entries;
CREATE TRIGGER trigger_check_daily_total_leave
  AFTER INSERT OR UPDATE ON leave_entries
  FOR EACH ROW EXECUTE FUNCTION check_daily_total_within_one_day();
