-- Run in the Supabase SQL Editor, after 00009. Updates existing rows'
-- status text only (from 'approved' to 'recorded') — no rows are deleted,
-- and every other column is untouched. 'approved' and 'rejected' remain
-- valid values for whenever real approval is actually built.
--
-- THE ISSUE: every entry defaults to a status of 'approved' — but there
-- is no approval step anywhere in the system yet. That word actively
-- implies a manager reviewed and signed off on something that never
-- happened, which would be actively misleading the moment anyone builds
-- a report or screen that displays this field.
--
-- THE DEPENDENCY, worth being explicit about: the default of 'approved'
-- exists today only because the one-day-total trigger (migrations 00005,
-- 00006) and every other current piece of logic don't reference status
-- at all — nothing actually *depends* on entries starting out approved.
-- It was simply the wrong word for "no review has happened," not a
-- behavioral requirement.
--
-- THE FIX: rename that default to 'recorded' — accurate for "this exists
-- in the system," without implying anyone reviewed it. Existing rows
-- that are 'approved' today were never actually approved by anyone
-- (there's no feature that could have set that value on purpose yet), so
-- they get relabeled to match reality. 'submitted', 'approved', and
-- 'rejected' remain valid values, unused for now, clearly reserved for
-- whenever real approval is actually built — deliberately not built
-- here.

ALTER TABLE timesheet_entries DROP CONSTRAINT timesheet_entries_status_check;
ALTER TABLE timesheet_entries ADD CONSTRAINT timesheet_entries_status_check
  CHECK (status IN ('recorded', 'submitted', 'approved', 'rejected'));

UPDATE timesheet_entries SET status = 'recorded' WHERE status = 'approved';

ALTER TABLE timesheet_entries ALTER COLUMN status SET DEFAULT 'recorded';
