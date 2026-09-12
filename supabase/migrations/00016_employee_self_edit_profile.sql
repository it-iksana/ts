-- Run in the Supabase SQL Editor, after 00015. Adds two nullable columns,
-- widens an existing constraint, and adds one policy + one trigger --
-- touches no existing data (every existing row's full_name stays exactly
-- as it is; address and personal_email start out empty for everyone).
--
-- THE ASK: admin creates an employee with just what the system actually
-- needs to function (code, password, role, department, join date) --
-- personal details (name, address, a real contact email, as opposed to
-- the internal login address) are things the employee fills in
-- themselves once they're in. full_name becomes optional at creation
-- time rather than required, since an admin may genuinely not want to
-- type it if the employee is about to set it themselves anyway.
--
-- DISPLAY FALLBACK, handled in the application code (not this
-- migration): anywhere full_name would show as blank before someone's
-- set it, the app falls back to showing their employee_code instead, so
-- nothing looks broken in the meantime.
--
-- THE REAL CARE HERE, same pattern as the task-status trigger: a plain
-- "id = auth.uid()" UPDATE policy would let someone change ANY column on
-- their own employee row, not just their personal details -- including
-- their own role, department, or active status. A trigger checks the
-- real OLD-vs-NEW values and only allows full_name, address, and
-- personal_email to differ; anything else in the same update is
-- rejected outright, all-or-nothing.

ALTER TABLE employees
  ALTER COLUMN full_name DROP NOT NULL,
  ADD COLUMN address text,
  ADD COLUMN personal_email text;

CREATE POLICY "employees_update_own_profile" ON employees
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION restrict_employee_self_edit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Same reasoning as restrict_assignee_task_updates: only the specific
  -- case of a plain employee editing their own row gets restricted here.
  -- Admin edits (via employees_write_cost_admin /
  -- employees_write_tldc_non_cost_admin) already have their row-level
  -- access correctly decided by RLS before this trigger runs, so they
  -- aren't touched by this check at all.
  IF current_employee_role() = 'employee' AND OLD.id = auth.uid() THEN
    IF NEW.employee_code != OLD.employee_code
       OR NEW.role != OLD.role
       OR NEW.department_id IS DISTINCT FROM OLD.department_id
       OR NEW.date_of_joining != OLD.date_of_joining
       OR NEW.date_of_leaving IS DISTINCT FROM OLD.date_of_leaving
       OR NEW.is_active != OLD.is_active THEN
      RAISE EXCEPTION 'You can only update your name, address, and email.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_restrict_employee_self_edit ON employees;
CREATE TRIGGER trigger_restrict_employee_self_edit
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION restrict_employee_self_edit();
