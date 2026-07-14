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
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fayz_migration_ledger (
  id bigserial PRIMARY KEY,
  plugin_id text NOT NULL,
  file_name text NOT NULL,
  checksum text NOT NULL,
  plugin_version text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text,
  UNIQUE(plugin_id, file_name)
);

ALTER TABLE public.fayz_migration_ledger ENABLE ROW LEVEL SECURITY;

-- Deny-all through PostgREST: revoke any inherited grants, grant to nobody but
-- service_role (which bypasses RLS anyway). No policies = no anon/authenticated access.
REVOKE ALL ON public.fayz_migration_ledger FROM anon, authenticated;
GRANT ALL ON public.fayz_migration_ledger TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fayz_migration_ledger_id_seq TO service_role;
