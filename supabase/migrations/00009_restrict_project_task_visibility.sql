-- Run in the Supabase SQL Editor, after 00008. Replaces read policies
-- only — touches no existing data.
--
-- THE ISSUE: projects_select_all and tasks_select_all both read
-- USING (true) — meaning anyone, including a request with no login at
-- all, hitting the database's public API directly, can read every
-- project and task name.
--
-- THE FIX: visibility now requires being a currently active employee
-- (current_employee_role() is null for anyone unauthenticated or
-- inactive, after the fix in migration 00004). Within that: active
-- projects/tasks are visible to any active employee (needed to populate
-- a new time entry), while an *inactive* project or task stays visible
-- only to an active admin, or to the specific employee who has a real
-- historical entry referencing it — so someone's own past timesheet
-- entries still display correctly even after a project is retired,
-- without reopening the inactive project list to everyone.

DROP POLICY IF EXISTS "projects_select_all" ON projects;
CREATE POLICY "projects_select_active_or_referenced_or_admin" ON projects
  FOR SELECT USING (
    (is_active = true AND current_employee_role() IS NOT NULL)
    OR current_employee_role() IN ('tl_dc', 'cost_admin')
    OR EXISTS (
      SELECT 1 FROM timesheet_entries te
      WHERE te.project_id = projects.id AND te.employee_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_select_all" ON tasks;
CREATE POLICY "tasks_select_active_or_referenced_or_admin" ON tasks
  FOR SELECT USING (
    (is_active = true AND current_employee_role() IS NOT NULL)
    OR current_employee_role() IN ('tl_dc', 'cost_admin')
    OR EXISTS (
      SELECT 1 FROM timesheet_entries te
      WHERE te.task_id = tasks.id AND te.employee_id = auth.uid()
    )
  );
