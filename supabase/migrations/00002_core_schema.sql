-- Run this in the Supabase SQL Editor, after 00001_enable_automatic_rls.sql.
-- Every table created below gets RLS switched on automatically by that
-- trigger — the policies here are what then actually govern access.

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
  id bigint generated always as identity primary key,
  name text NOT NULL UNIQUE
);

-- ============================================================
-- EMPLOYEES
-- One row per person with a login, linked 1:1 with Supabase's own
-- auth.users. Deliberately holds no cost/salary data at all — that lives
-- in its own locked-down table below, never mixed in here.
-- ============================================================
CREATE TABLE employees (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'tl_dc', 'cost_admin')),
  department_id bigint REFERENCES departments(id),
  date_of_joining date NOT NULL,
  date_of_leaving date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Looks up the calling user's own role. SECURITY DEFINER is required here:
-- without it, this query would itself be subject to the RLS policy it's
-- being used to write, which can't work — a regular employee's own SELECT
-- policy on `employees` would block them from reading even their own role.
CREATE OR REPLACE FUNCTION current_employee_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM employees WHERE id = auth.uid();
$$;

-- Everyone can see their own row. TL/DC and Cost Admin can see everyone's.
CREATE POLICY "employees_select_own_or_admin" ON employees
  FOR SELECT USING (
    id = auth.uid() OR current_employee_role() IN ('tl_dc', 'cost_admin')
  );

-- Only TL/DC and Cost Admin can add or change employee records — nobody
-- self-edits their own profile in v1 (avoids, among other things, anyone
-- ever being able to edit their own role).
CREATE POLICY "employees_write_admin_only" ON employees
  FOR ALL USING (current_employee_role() IN ('tl_dc', 'cost_admin'))
  WITH CHECK (current_employee_role() IN ('tl_dc', 'cost_admin'));

-- ============================================================
-- EMPLOYEE COST RATES
-- Deliberately its own table, not a column on `employees` — Row Level
-- Security is row-level, not column-level, so hiding a sensitive column on
-- a table everyone can partly read isn't possible directly. A separate
-- table that only Cost Admin can touch at all sidesteps that entirely.
--
-- Effective-dated rather than a single mutable value: if someone's rate
-- changes mid-year, past months' cost figures should still reflect what
-- they were paid *then*, not silently shift when the rate is updated.
-- ============================================================
CREATE TABLE employee_cost_rates (
  id bigint generated always as identity primary key,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  monthly_cost numeric(12, 2) NOT NULL CHECK (monthly_cost >= 0),
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, effective_from)
);

-- Cost Admin only. Not TL/DC, not the employee themselves, nobody else.
CREATE POLICY "cost_rates_admin_only" ON employee_cost_rates
  FOR ALL USING (current_employee_role() = 'cost_admin')
  WITH CHECK (current_employee_role() = 'cost_admin');

-- ============================================================
-- PROJECTS
-- is_detailed decides which entry form an employee sees for this project —
-- a property of the project, not of the person logging time against it.
-- ============================================================
CREATE TABLE projects (
  id bigint generated always as identity primary key,
  name text NOT NULL UNIQUE,
  is_detailed boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Every logged-in employee can see active projects, to populate their own
-- entry form — but only TL/DC and Cost Admin can create or change them.
CREATE POLICY "projects_select_all" ON projects
  FOR SELECT USING (true);

CREATE POLICY "projects_write_admin_only" ON projects
  FOR INSERT WITH CHECK (current_employee_role() IN ('tl_dc', 'cost_admin'));
CREATE POLICY "projects_update_admin_only" ON projects
  FOR UPDATE USING (current_employee_role() IN ('tl_dc', 'cost_admin'));
CREATE POLICY "projects_delete_admin_only" ON projects
  FOR DELETE USING (current_employee_role() IN ('tl_dc', 'cost_admin'));

-- ============================================================
-- TASKS
-- Only meaningful for projects flagged is_detailed, enforced in the app
-- layer rather than the database — a task existing under a project that
-- later gets un-flagged isn't a data integrity problem worth a constraint.
-- ============================================================
CREATE TABLE tasks (
  id bigint generated always as identity primary key,
  project_id bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE POLICY "tasks_select_all" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "tasks_write_admin_only" ON tasks
  FOR INSERT WITH CHECK (current_employee_role() IN ('tl_dc', 'cost_admin'));
CREATE POLICY "tasks_update_admin_only" ON tasks
  FOR UPDATE USING (current_employee_role() IN ('tl_dc', 'cost_admin'));
CREATE POLICY "tasks_delete_admin_only" ON tasks
  FOR DELETE USING (current_employee_role() IN ('tl_dc', 'cost_admin'));

-- ============================================================
-- TIMESHEET ENTRIES
-- One row per employee, per day, per project (and task, if the project is
-- detailed) — day_fraction lets a single day split across multiple
-- projects, matching the real Excel this is replacing.
-- ============================================================
CREATE TABLE timesheet_entries (
  id bigint generated always as identity primary key,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  project_id bigint NOT NULL REFERENCES projects(id),
  task_id bigint REFERENCES tasks(id),
  day_fraction numeric(3, 2) NOT NULL CHECK (day_fraction > 0 AND day_fraction <= 1),
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('submitted', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, entry_date, project_id, task_id)
);

-- Employees manage only their own entries. Cost Admin can see and correct
-- anyone's, matching the admin-override pattern used throughout IAF. TL/DC
-- can see everyone's for oversight of the people they manage, but — unlike
-- Cost Admin — cannot edit someone else's entries directly in v1.
-- (Flagging this one clearly: worth confirming TL/DC's exact edit rights
-- here, since it wasn't explicitly settled.)
CREATE POLICY "timesheet_select_own_or_admin" ON timesheet_entries
  FOR SELECT USING (
    employee_id = auth.uid() OR current_employee_role() IN ('tl_dc', 'cost_admin')
  );

CREATE POLICY "timesheet_write_own_or_cost_admin" ON timesheet_entries
  FOR INSERT WITH CHECK (
    employee_id = auth.uid() OR current_employee_role() = 'cost_admin'
  );
CREATE POLICY "timesheet_update_own_or_cost_admin" ON timesheet_entries
  FOR UPDATE USING (
    employee_id = auth.uid() OR current_employee_role() = 'cost_admin'
  );
CREATE POLICY "timesheet_delete_own_or_cost_admin" ON timesheet_entries
  FOR DELETE USING (
    employee_id = auth.uid() OR current_employee_role() = 'cost_admin'
  );

-- ============================================================
-- LEAVE ENTRIES
-- Simple day-marker leave, matching the deliberately lightweight v1 scope
-- (no accrual, no balance ledger yet — that's real future Attendance
-- Portal work). One row per employee per day; a day is either a normal
-- work day (rows in timesheet_entries) or a leave day, not both.
-- ============================================================
CREATE TABLE leave_entries (
  id bigint generated always as identity primary key,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('L', 'SL')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, entry_date)
);

CREATE POLICY "leave_select_own_or_admin" ON leave_entries
  FOR SELECT USING (
    employee_id = auth.uid() OR current_employee_role() IN ('tl_dc', 'cost_admin')
  );

CREATE POLICY "leave_write_own_or_cost_admin" ON leave_entries
  FOR INSERT WITH CHECK (
    employee_id = auth.uid() OR current_employee_role() = 'cost_admin'
  );
CREATE POLICY "leave_update_own_or_cost_admin" ON leave_entries
  FOR UPDATE USING (
    employee_id = auth.uid() OR current_employee_role() = 'cost_admin'
  );
CREATE POLICY "leave_delete_own_or_cost_admin" ON leave_entries
  FOR DELETE USING (
    employee_id = auth.uid() OR current_employee_role() = 'cost_admin'
  );
