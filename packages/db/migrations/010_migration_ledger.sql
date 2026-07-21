-- ============================================================================
-- 010_migration_ledger.sql — per-pool applied-migration ledger.
--
-- The Runner v2 executor records every applied SQL file here (plugin_id +
-- file_name + checksum) so re-applies are detected and checksum drift on an
-- already-applied file is a HARD STOP.
--
-- service_role only: no anon/authenticated grants, RLS enabled with NO
-- policies, so PostgREST (anon/authenticated) is deny-all. Only the service
-- role (which bypasses RLS) — i.e. the runner — can read/write it.
--
-- Naming: the ledger is an internal, non-API table, so it uses the `_`-prefixed
-- `public._migrations` name (excluded from the project_rls auto-policy pass by
-- the `NOT LIKE '\_%'` filter). Legacy pools provisioned as `fayz_migration_ledger`
-- are migrated by 012_rename_migration_ledger.sql (and by the runner's
-- ensureLedger guard); fresh installs are born as `_migrations` here.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public._migrations (
  id bigserial PRIMARY KEY,
  plugin_id text NOT NULL,
  file_name text NOT NULL,
  checksum text NOT NULL,
  plugin_version text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text,
  UNIQUE(plugin_id, file_name)
);

ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;

-- Deny-all through PostgREST: revoke any inherited grants, grant to nobody but
-- service_role (which bypasses RLS anyway). No policies = no anon/authenticated access.
REVOKE ALL ON public._migrations FROM anon, authenticated;
GRANT ALL ON public._migrations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public._migrations_id_seq TO service_role;
