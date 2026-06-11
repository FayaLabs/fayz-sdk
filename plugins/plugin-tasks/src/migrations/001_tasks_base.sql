-- Tasks Plugin: Base Tables
-- Prefix: tsk_

-- Label definitions for categorizing tasks
CREATE TABLE IF NOT EXISTS public.tsk_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tsk_labels ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tsk_labels_tenant ON public.tsk_labels(tenant_id);

-- Main tasks table (subtasks via parent_id self-reference)
CREATE TABLE IF NOT EXISTS public.tsk_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  assigned_to_id uuid,
  assigned_to_name text,
  parent_id uuid REFERENCES public.tsk_tasks(id) ON DELETE CASCADE,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_by_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tsk_tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_tenant ON public.tsk_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_status ON public.tsk_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_parent ON public.tsk_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_assigned ON public.tsk_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_due ON public.tsk_tasks(tenant_id, due_date)
  WHERE due_date IS NOT NULL;

-- RLS policies for tsk_tasks
CREATE POLICY tsk_tasks_select ON public.tsk_tasks FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_tasks_insert ON public.tsk_tasks FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_tasks_update ON public.tsk_tasks FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_tasks_delete ON public.tsk_tasks FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tsk_tasks TO authenticated;

-- RLS policies for tsk_labels
CREATE POLICY tsk_labels_select ON public.tsk_labels FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_labels_insert ON public.tsk_labels FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_labels_update ON public.tsk_labels FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_labels_delete ON public.tsk_labels FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tsk_labels TO authenticated;
