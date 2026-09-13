-- Run in the Supabase SQL Editor, after 00017. Adds one table only --
-- touches no existing data.
--
-- Fixes the "no holiday calendar exists yet" limitation that's been
-- disclosed on every cost report so far -- working days were counted
-- as Mon-Fri only, meaning company holidays were silently treated as
-- working days, understating the actual daily rate for that month.
--
-- Holidays are stored as real dates, added as needed -- not as
-- recurring rules. Deliberate: some holidays fall on the same calendar
-- date every year (Jan 1, Aug 15, Oct 2), but others shift (Diwali,
-- Eid), so a recurrence rule would only handle half of them correctly.
-- Storing actual dates handles both uniformly, at the cost of needing
-- to add each year's dates once a year.
--
-- Read access is open to any active employee (holidays are useful,
-- non-sensitive context for everyone, same reasoning as projects/tasks)
-- -- only TL/DC and Cost Admin can add or remove one, matching the
-- exact pattern already used for departments.

CREATE TABLE holidays (
  id bigint generated always as identity primary key,
  holiday_date date NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE POLICY "holidays_select_active_employees" ON holidays
  FOR SELECT USING (current_employee_role() IS NOT NULL);

CREATE POLICY "holidays_write_admin_only" ON holidays
  FOR INSERT WITH CHECK (current_employee_role() IN ('tl_dc', 'cost_admin'));
CREATE POLICY "holidays_delete_admin_only" ON holidays
  FOR DELETE USING (current_employee_role() IN ('tl_dc', 'cost_admin'));
