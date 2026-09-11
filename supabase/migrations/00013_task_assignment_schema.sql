-- Run in the Supabase SQL Editor, after 00012. Adds columns with safe
-- defaults (every existing task becomes assigned_to NULL / status
-- 'not_started') and replaces one read policy — touches no existing rows'
-- meaning, purely additive.
--
-- STEP 1 of 4 for the Task Module: schema + visibility only. No UI yet —
-- this just makes assignment possible to represent and correctly
-- enforced, before anything can actually create an assignment.
--
-- DESIGN, stated plainly: assignment is optional, layered on top of the
-- existing self-serve model, not a replacement for it. An UNASSIGNED
-- task (assigned_to IS NULL — every task today, and every task on a
-- project nobody ever assigns) behaves exactly as before: any active
-- employee can see and log time against it. An ASSIGNED task becomes
-- visible only to that specific person (plus admins, plus anyone with
-- genuine historical entries against it, matching the same "preserve
-- history" principle used for inactive projects). This is a deliberate
-- coexistence design, not a hard cutover — nothing already working
-- breaks.

ALTER TABLE tasks
  ADD COLUMN assigned_to uuid REFERENCES employees(id),
  ADD COLUMN status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'done'));

DROP POLICY IF EXISTS "tasks_select_active_or_referenced_or_admin" ON tasks;
CREATE POLICY "tasks_select_unassigned_or_own_or_referenced_or_admin" ON tasks
  FOR SELECT USING (
    -- Unassigned + active: unchanged self-serve behavior, visible to any
    -- active employee.
    (assigned_to IS NULL AND is_active = true AND current_employee_role() IS NOT NULL)
    -- Assigned directly to the caller. Still requires the caller to
    -- currently be active — being assigned a task doesn't create an
    -- exception to the "inactive means fully locked out" rule
    -- established in the earlier security review.
    OR (assigned_to = auth.uid() AND current_employee_is_active())
    -- Admins always see everything.
    OR current_employee_role() IN ('tl_dc', 'cost_admin')
    -- Historical reference — someone with real past entries against this
    -- task keeps seeing it, same principle as inactive projects.
    OR EXISTS (
      SELECT 1 FROM timesheet_entries te
      WHERE te.task_id = tasks.id AND te.employee_id = auth.uid()
    )
  );

-- Assigning/reassigning a task, and updating its own status, are both
-- UPDATE operations — the existing tasks_update_admin_only policy
-- (admin-only) already covers assignment correctly. Status updates by
-- the assignee themselves are a separate, later step (04) once the UI
-- for it exists — not added here, to keep this step purely about
-- visibility.
