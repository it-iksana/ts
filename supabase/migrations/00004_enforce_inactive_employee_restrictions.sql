-- Run in the Supabase SQL Editor, after 00003. Does not delete or modify
-- any existing rows — only changes how access is checked. Deactivating
-- someone remains just setting employees.is_active = false; this migration
-- is what makes that flag actually mean something.
--
-- THE ISSUE: is_active exists as a column but was never checked anywhere —
-- not in current_employee_role() (the function every admin-tier policy
-- relies on), not in any self-access policy, not in the application code.
-- An inactive employee, TL/DC, or Cost Admin kept full access to
-- everything for as long as their session remained valid.
--
-- THE FIX: current_employee_role() now only returns a role for an active
-- employee — this single change cascades correctly to every policy that
-- calls it (projects, tasks, cost rates, all the employee write policies,
-- and the admin-oversight half of timesheet/leave access), without
-- needing to touch each of those individually. Separately, every
-- "own record" policy (self-access, not going through that function) now
-- also requires the caller to currently be active. Admin visibility into
-- historical data for inactive people is untouched — an active admin's
-- access was never gated on the *target* row's active status, only on
-- their own.

-- ============================================================
-- The central fix — cascades to every admin-tier check automatically.
-- ============================================================
CREATE OR REPLACE FUNCTION current_employee_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM employees WHERE id = auth.uid() AND is_active = true;
$$;

-- Used by the self-access policies below — returns false (not null) for
-- someone with no employee row at all, so it behaves safely either way.
CREATE OR REPLACE FUNCTION current_employee_is_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_active FROM employees WHERE id = auth.uid()), false);
$$;

-- ============================================================
-- EMPLOYEES — self-access now requires being active too.
-- ============================================================
DROP POLICY IF EXISTS "employees_select_own_or_admin" ON employees;
CREATE POLICY "employees_select_own_or_admin" ON employees
  FOR SELECT USING (
    (id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() IN ('tl_dc', 'cost_admin')
  );

-- ============================================================
-- TIMESHEET ENTRIES — same pattern: self-access requires active.
-- ============================================================
DROP POLICY IF EXISTS "timesheet_select_own_or_admin" ON timesheet_entries;
CREATE POLICY "timesheet_select_own_or_admin" ON timesheet_entries
  FOR SELECT USING (
    (employee_id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() IN ('tl_dc', 'cost_admin')
  );

DROP POLICY IF EXISTS "timesheet_write_own_or_cost_admin" ON timesheet_entries;
CREATE POLICY "timesheet_write_own_or_cost_admin" ON timesheet_entries
  FOR INSERT WITH CHECK (
    (employee_id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() = 'cost_admin'
  );

DROP POLICY IF EXISTS "timesheet_update_own_or_cost_admin" ON timesheet_entries;
CREATE POLICY "timesheet_update_own_or_cost_admin" ON timesheet_entries
  FOR UPDATE USING (
    (employee_id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() = 'cost_admin'
  );

DROP POLICY IF EXISTS "timesheet_delete_own_or_cost_admin" ON timesheet_entries;
CREATE POLICY "timesheet_delete_own_or_cost_admin" ON timesheet_entries
  FOR DELETE USING (
    (employee_id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() = 'cost_admin'
  );

-- ============================================================
-- LEAVE ENTRIES — same pattern again.
-- ============================================================
DROP POLICY IF EXISTS "leave_select_own_or_admin" ON leave_entries;
CREATE POLICY "leave_select_own_or_admin" ON leave_entries
  FOR SELECT USING (
    (employee_id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() IN ('tl_dc', 'cost_admin')
  );

DROP POLICY IF EXISTS "leave_write_own_or_cost_admin" ON leave_entries;
CREATE POLICY "leave_write_own_or_cost_admin" ON leave_entries
  FOR INSERT WITH CHECK (
    (employee_id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() = 'cost_admin'
  );

DROP POLICY IF EXISTS "leave_update_own_or_cost_admin" ON leave_entries;
CREATE POLICY "leave_update_own_or_cost_admin" ON leave_entries
  FOR UPDATE USING (
    (employee_id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() = 'cost_admin'
  );

DROP POLICY IF EXISTS "leave_delete_own_or_cost_admin" ON leave_entries;
CREATE POLICY "leave_delete_own_or_cost_admin" ON leave_entries
  FOR DELETE USING (
    (employee_id = auth.uid() AND current_employee_is_active())
    OR current_employee_role() = 'cost_admin'
  );
