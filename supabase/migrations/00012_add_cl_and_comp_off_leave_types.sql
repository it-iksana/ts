-- Run in the Supabase SQL Editor, after 00011. Widens an existing CHECK
-- constraint only — touches no existing data.
--
-- Adds Casual Leave (CL) and Comp-off (CO) alongside the existing Leave
-- (L) and Sick Leave (SL) markers. Comp-off here is deliberately the same
-- simple marker as the others — no balance or credit tracking yet. Real
-- earned/credited comp-off tracking is future work, not built here.

ALTER TABLE leave_entries DROP CONSTRAINT leave_entries_leave_type_check;
ALTER TABLE leave_entries ADD CONSTRAINT leave_entries_leave_type_check
  CHECK (leave_type IN ('L', 'SL', 'CL', 'CO'));
