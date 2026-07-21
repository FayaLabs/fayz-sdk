-- ============================================================================
-- 012_rename_migration_ledger.sql — rename the migration ledger onto the
-- internal `_`-prefixed baseline name:
--
--   public.fayz_migration_ledger → public._migrations
--
-- Legacy-pool remediation ONLY: 010_migration_ledger.sql now creates `_migrations`
-- directly, so fresh installs never reach a rename branch. The runner's
-- ensureLedger (cli/src/lib/ledger.ts) performs the same guarded rename at the
-- START of every apply, so on a real pool the ledger is already `_migrations`
-- by the time this migration runs — this file is the declarative backstop.
--
-- Fully idempotent + guarded: each RENAME fires only when the old object exists
-- and the new one does not. A table RENAME preserves the rows (the applied-file
-- history MUST survive), plus RLS state, grants and constraints; re-assert the
-- deny-all grants afterwards to keep the baseline explicit.
-- ============================================================================

DO $$
BEGIN
  -- Table (carries the applied-migration history — never drop + recreate).
  IF to_regclass('public.fayz_migration_ledger') IS NOT NULL
     AND to_regclass('public._migrations') IS NULL THEN
    ALTER TABLE public.fayz_migration_ledger RENAME TO _migrations;
  END IF;

  -- bigserial owns fayz_migration_ledger_id_seq — a table rename does not move it.
  IF to_regclass('public.fayz_migration_ledger_id_seq') IS NOT NULL
     AND to_regclass('public._migrations_id_seq') IS NULL THEN
    ALTER SEQUENCE public.fayz_migration_ledger_id_seq RENAME TO _migrations_id_seq;
  END IF;

  -- Named constraints are auto-named after the old table; rename for parity with
  -- a fresh install. Guard on the new table existing so this is safe pre-rename.
  IF to_regclass('public._migrations') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_constraint
               WHERE conname = 'fayz_migration_ledger_pkey'
                 AND conrelid = 'public._migrations'::regclass) THEN
      ALTER TABLE public._migrations RENAME CONSTRAINT fayz_migration_ledger_pkey TO _migrations_pkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint
               WHERE conname = 'fayz_migration_ledger_plugin_id_file_name_key'
                 AND conrelid = 'public._migrations'::regclass) THEN
      ALTER TABLE public._migrations
        RENAME CONSTRAINT fayz_migration_ledger_plugin_id_file_name_key
        TO _migrations_plugin_id_file_name_key;
    END IF;
  END IF;
END $$;

-- Re-assert the deny-all posture (idempotent; RLS/grants survive a rename but the
-- baseline keeps this explicit so a manually-created ledger converges too).
DO $$
BEGIN
  IF to_regclass('public._migrations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public._migrations FROM anon, authenticated';
    EXECUTE 'GRANT ALL ON public._migrations TO service_role';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public._migrations_id_seq TO service_role';
  END IF;
END $$;
