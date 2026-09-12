-- Run in the Supabase SQL Editor, after 00016. Adds one view only --
-- touches no existing data.
--
-- employee_cost_rates is effective-dated (a real ledger, not a single
-- mutable value) so rate changes over time are preserved. This view
-- picks out, for each employee, whichever rate is currently in effect
-- (the one with the latest effective_from that isn't in the future) --
-- used both by the Employees page display and by the cost reports, so
-- "what's someone's current rate" is computed in exactly one place.
--
-- Views in Postgres do NOT automatically evaluate RLS against the
-- querying user by default — that needs security_invoker = true,
-- explicitly set below. Without it, a view's RLS check uses the view
-- owner's identity instead, which is not what we want here.

-- security_invoker = true is the critical part — without it, a view
-- evaluates RLS using the VIEW OWNER's identity, not the actual
-- querying user's. Tested this the wrong way first and got a real
-- security bug: every role saw the same data, because the view's
-- owner effectively bypasses RLS, and that bypass silently applied to
-- everyone querying through the view. This setting is what makes RLS
-- evaluate against the real caller instead.
CREATE OR REPLACE VIEW current_employee_cost_rates
WITH (security_invoker = true) AS
SELECT DISTINCT ON (employee_id)
  employee_id,
  monthly_cost,
  effective_from
FROM employee_cost_rates
WHERE effective_from <= CURRENT_DATE
ORDER BY employee_id, effective_from DESC;

-- Views need their own explicit grant — they don't automatically inherit
-- one from the underlying table just because RLS does. Without this,
-- even a legitimate Cost Admin query gets a flat "permission denied"
-- before RLS ever gets a chance to run. RLS remains the real access
-- control here; this grant only makes the view reachable at all.
GRANT SELECT ON current_employee_cost_rates TO authenticated;
