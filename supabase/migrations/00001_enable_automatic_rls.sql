-- Run this once in the Supabase SQL Editor, before creating any other tables.
--
-- Ensures every new table in the public schema has Row Level Security
-- switched on automatically the moment it's created — never an afterthought,
-- never a table someone forgot to lock down. A table with RLS on and no
-- policies yet is fully inaccessible via the API until policies are added,
-- which is exactly the safe default we want.

CREATE OR REPLACE FUNCTION enable_rls_on_new_tables()
RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF obj.command_tag = 'CREATE TABLE' AND obj.schema_name = 'public' THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP EVENT TRIGGER IF EXISTS trigger_enable_rls_on_new_tables;

CREATE EVENT TRIGGER trigger_enable_rls_on_new_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION enable_rls_on_new_tables();
