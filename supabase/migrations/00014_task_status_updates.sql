-- Run in the Supabase SQL Editor, after 00013. Adds one policy and one
-- trigger — touches no existing data.
--
-- STEP 4 of 4 for the Task Module: the assignee can update their own
-- task's status (Not Started / In Progress / Done). Deliberately no
-- restricted progression between statuses — free movement between all
-- three, matching the "lightweight, not a full PM suite" scope already
-- settled on.
--
-- THE REAL CARE HERE: a plain "assigned_to = auth.uid()" UPDATE policy
-- would let an assignee change ANY column on their task, not just
-- status — including renaming it, reassigning it to someone else, or
-- moving it to a different project. RLS policies don't have column-level
-- granularity on their own. A trigger is what actually enforces "only
-- status may change" for a non-admin, checked against the row's real
-- OLD values, not trusted from application code.

CREATE POLICY "tasks_update_own_status" ON tasks
  FOR UPDATE USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE OR REPLACE FUNCTION restrict_assignee_task_updates()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the specific case of a plain employee updating their own
  -- assigned task gets restricted here. Every other case — an admin, or
  -- any backend/service-role operation with no recognized employee
  -- role at all — has already had its row-level access correctly
  -- gated by RLS before this trigger ever runs; re-deciding
  -- authorization here too would be redundant, and (as tested) actively
  -- wrong for contexts RLS already handles correctly, like a superuser
  -- or service-role update with no employee session attached.
  IF current_employee_role() = 'employee' AND OLD.assigned_to = auth.uid() THEN
    IF NEW.name != OLD.name
       OR NEW.project_id != OLD.project_id
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.is_active != OLD.is_active THEN
      RAISE EXCEPTION 'You can only update the status of a task assigned to you.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_restrict_assignee_task_updates ON tasks;
CREATE TRIGGER trigger_restrict_assignee_task_updates
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION restrict_assignee_task_updates();
