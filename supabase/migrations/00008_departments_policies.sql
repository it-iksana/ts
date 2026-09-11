-- Run in the Supabase SQL Editor, after 00007. Adds policies only —
-- touches no existing data.
--
-- THE ISSUE: departments has Row Level Security switched on (correctly,
-- by the automatic trigger from migration 00001) but was never actually
-- given any policies — I built the write side into projects and tasks at
-- the time but genuinely forgot this table. A table with RLS on and zero
-- policies is fully inaccessible to everyone via the API, which is why
-- the department dropdown loads empty for every user, always — not
-- because there are no departments, but because nobody is allowed to
-- read the table at all.
--
-- THE FIX: same pattern already used for projects/tasks — any active
-- employee can read the list (needed to populate the dropdown), only
-- TL/DC and Cost Admin can create or edit departments.

CREATE POLICY "departments_select_active_employees" ON departments
  FOR SELECT USING (current_employee_role() IS NOT NULL);

CREATE POLICY "departments_write_admin_only" ON departments
  FOR INSERT WITH CHECK (current_employee_role() IN ('tl_dc', 'cost_admin'));
CREATE POLICY "departments_update_admin_only" ON departments
  FOR UPDATE USING (current_employee_role() IN ('tl_dc', 'cost_admin'));
CREATE POLICY "departments_delete_admin_only" ON departments
  FOR DELETE USING (current_employee_role() IN ('tl_dc', 'cost_admin'));
