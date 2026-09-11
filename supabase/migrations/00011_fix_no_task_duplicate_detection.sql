-- Run in the Supabase SQL Editor, after 00010. Adds one index only —
-- touches no existing data. Confirmed with the person running this that
-- no real data exists yet, so there's no pre-existing duplicate risk to
-- check for here (unlike a database already in use, where this should be
-- checked before applying).
--
-- THE ISSUE: the existing UNIQUE constraint on (employee_id, entry_date,
-- project_id, task_id) correctly catches duplicates when a real task is
-- selected, but silently does nothing when task_id is NULL — SQL never
-- considers two blank values "the same," only "both unknown," so two
-- identical no-task entries for the same employee, date, and project
-- pass right through. Proved this directly: two genuinely identical rows
-- (same employee, date, project, both with no task) both inserted
-- successfully with zero complaint from the existing constraint.
--
-- THE FIX: a second, partial rule that applies specifically to rows
-- where task_id IS NULL, comparing just employee+date+project among
-- those rows. The existing constraint is untouched and still handles the
-- with-a-task case exactly as before; this just closes the one gap.

CREATE UNIQUE INDEX timesheet_entries_no_task_unique
  ON timesheet_entries (employee_id, entry_date, project_id)
  WHERE task_id IS NULL;
