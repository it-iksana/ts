-- Run in the Supabase SQL Editor, after 00014. Adds one nullable column
-- and updates the assignee-restriction trigger — touches no existing
-- data.
--
-- THE ASK: TL/DC sets a deadline when assigning a task; it shows up
-- wherever the employee interacts with that task (My Tasks, and the
-- task picker in Log Time). Purely informational — it doesn't restrict
-- how much time gets logged against the task on any given day, or force
-- any particular split between it and other work. The existing
-- flexibility (full day, half day, split across several things, or
-- something else entirely) is completely unchanged.
--
-- IMPORTANT FIX INCLUDED HERE: the trigger from migration 00014 (which
-- restricts a plain-employee assignee to only changing their task's
-- status) did not know about due_date at all, since that column didn't
-- exist yet. Without updating it, an assignee could quietly push their
-- own deadline back — only TL/DC and Cost Admin should ever set or
-- change it. Fixed as part of this same migration, not left as a gap.

ALTER TABLE tasks ADD COLUMN due_date date;

CREATE OR REPLACE FUNCTION restrict_assignee_task_updates()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_employee_role() = 'employee' AND OLD.assigned_to = auth.uid() THEN
    IF NEW.name != OLD.name
       OR NEW.project_id != OLD.project_id
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.is_active != OLD.is_active
       OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      RAISE EXCEPTION 'You can only update the status of a task assigned to you.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
