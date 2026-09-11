-- Run in the Supabase SQL Editor. Does not delete or modify any existing
-- data — only replaces the write policy on `employees` with two narrower
-- ones. Safe to run even with real employee records already in place.
--
-- THE ISSUE: the previous policy only checked "is the caller an admin of
-- some kind" — it never checked which role value they were writing. A
-- TL/DC passed that check exactly as easily whether creating a plain
-- employee or setting role = 'cost_admin', including on their own record
-- via a direct API call that never goes through the app's form at all.
--
-- THE FIX: split into two policies. Cost Admin keeps full, unrestricted
-- access. TL/DC's access now explicitly excludes any row where the role
-- is — or would become — 'cost_admin', for both the existing row (USING)
-- and the row being written (WITH CHECK), covering INSERT, UPDATE, and
-- DELETE alike.

DROP POLICY IF EXISTS "employees_write_admin_only" ON employees;

CREATE POLICY "employees_write_cost_admin" ON employees
  FOR ALL USING (current_employee_role() = 'cost_admin')
  WITH CHECK (current_employee_role() = 'cost_admin');

CREATE POLICY "employees_write_tldc_non_cost_admin" ON employees
  FOR ALL USING (current_employee_role() = 'tl_dc' AND role != 'cost_admin')
  WITH CHECK (current_employee_role() = 'tl_dc' AND role != 'cost_admin');
