-- 009 revoked anon SELECT/EXECUTE but Supabase default privileges also hand
-- anon INSERT/UPDATE/DELETE/... on every table created by postgres. RLS blocks
-- those writes today; make the grant layer agree and stop future tables from
-- being born writable-by-anon.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;
