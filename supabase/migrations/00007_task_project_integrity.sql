-- Run in the Supabase SQL Editor, after 00006. Adds constraints only —
-- does not touch existing data. If any existing row already has a
-- mismatched task/project pairing, this migration will fail to apply
-- (rather than silently allow it) — see the note at the bottom for how
-- to check beforehand.
--
-- THE ISSUE: task_id and project_id on timesheet_entries are two
-- independent foreign keys with no relationship enforced between them —
-- nothing stops logging time against Project A while attaching a task
-- that actually belongs to Project B.
--
-- THE FIX: the standard Postgres technique for "these two columns must
-- correspond." tasks gets an additional unique constraint on
-- (id, project_id) — harmless alongside its existing primary key, just
-- makes that pairing something a foreign key can reference — and
-- timesheet_entries' foreign key on task_id is replaced with a composite
-- one on (task_id, project_id) referencing that pairing. Postgres foreign
-- keys are automatically skipped when any column in them is NULL, so a
-- NULL task_id (a simple, non-detailed project) is completely unaffected.

ALTER TABLE tasks
  ADD CONSTRAINT tasks_id_project_unique UNIQUE (id, project_id);

ALTER TABLE timesheet_entries
  DROP CONSTRAINT timesheet_entries_task_id_fkey,
  ADD CONSTRAINT timesheet_entries_task_project_fkey
    FOREIGN KEY (task_id, project_id) REFERENCES tasks(id, project_id);

-- If this migration fails with a foreign key violation, it means a
-- mismatched row already exists. Find it first with:
--   SELECT te.id, te.project_id AS entry_project, t.project_id AS task_project
--   FROM timesheet_entries te JOIN tasks t ON t.id = te.task_id
--   WHERE te.project_id != t.project_id;
