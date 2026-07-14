// AUTO-GENERATED from 000_plg_rename.sql, 001_tasks_base.sql — regenerate with scripts/embed-migrations.mjs
// SQL files are the source of truth; this inline copy lets the manifest declare
// migrations as data. Do not edit by hand — run the embed script instead.

export const MIGRATION_000_PLG_RENAME = `-- 000_plg_rename.sql — rename legacy tasks tables to plg_tasks_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when legacy
-- name exists and target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.tsk_tasks') IS NOT NULL AND to_regclass('public.plg_tasks_tasks') IS NULL THEN
    ALTER TABLE public.tsk_tasks RENAME TO plg_tasks_tasks;
  END IF;
  IF to_regclass('public.tsk_labels') IS NOT NULL AND to_regclass('public.plg_tasks_labels') IS NULL THEN
    ALTER TABLE public.tsk_labels RENAME TO plg_tasks_labels;
  END IF;
END $$;
`

export const MIGRATION_001_TASKS_BASE = `-- Tasks Plugin: Base Tables
-- Prefix: plg_tasks_

-- Label definitions for categorizing tasks
CREATE TABLE IF NOT EXISTS public.plg_tasks_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_tasks_labels ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_tasks_labels_tenant ON public.plg_tasks_labels(tenant_id);

-- Main tasks table (subtasks via parent_id self-reference)
CREATE TABLE IF NOT EXISTS public.plg_tasks_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  assigned_to_id uuid,
  assigned_to_name text,
  parent_id uuid REFERENCES public.plg_tasks_tasks(id) ON DELETE CASCADE,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_by_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_tasks_tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_tasks_tasks_tenant ON public.plg_tasks_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_tasks_tasks_status ON public.plg_tasks_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_plg_tasks_tasks_parent ON public.plg_tasks_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_plg_tasks_tasks_assigned ON public.plg_tasks_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_plg_tasks_tasks_due ON public.plg_tasks_tasks(tenant_id, due_date)
  WHERE due_date IS NOT NULL;

-- RLS policies for plg_tasks_tasks (idempotent — DROP IF EXISTS before CREATE)
DROP POLICY IF EXISTS plg_tasks_tasks_select ON public.plg_tasks_tasks;
CREATE POLICY plg_tasks_tasks_select ON public.plg_tasks_tasks FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS plg_tasks_tasks_insert ON public.plg_tasks_tasks;
CREATE POLICY plg_tasks_tasks_insert ON public.plg_tasks_tasks FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS plg_tasks_tasks_update ON public.plg_tasks_tasks;
CREATE POLICY plg_tasks_tasks_update ON public.plg_tasks_tasks FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS plg_tasks_tasks_delete ON public.plg_tasks_tasks;
CREATE POLICY plg_tasks_tasks_delete ON public.plg_tasks_tasks FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_tasks_tasks TO authenticated;

-- RLS policies for plg_tasks_labels (idempotent)
DROP POLICY IF EXISTS plg_tasks_labels_select ON public.plg_tasks_labels;
CREATE POLICY plg_tasks_labels_select ON public.plg_tasks_labels FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS plg_tasks_labels_insert ON public.plg_tasks_labels;
CREATE POLICY plg_tasks_labels_insert ON public.plg_tasks_labels FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS plg_tasks_labels_update ON public.plg_tasks_labels;
CREATE POLICY plg_tasks_labels_update ON public.plg_tasks_labels FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS plg_tasks_labels_delete ON public.plg_tasks_labels;
CREATE POLICY plg_tasks_labels_delete ON public.plg_tasks_labels FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_tasks_labels TO authenticated;
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000_plg_rename", sql: MIGRATION_000_PLG_RENAME },
  { id: "001_tasks_base", sql: MIGRATION_001_TASKS_BASE },
]
