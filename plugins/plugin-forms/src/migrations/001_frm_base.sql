-- ============================================================
-- Custom Forms Plugin — Base Tables
-- ============================================================

-- plg_forms_templates: form template definitions (versioned)
CREATE TABLE IF NOT EXISTS public.plg_forms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  parent_id uuid REFERENCES public.plg_forms_templates(id),
  schema jsonb NOT NULL DEFAULT '{"fields":[],"layout":{"columns":12}}',
  specialty text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plg_forms_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_plg_forms_templates_tenant
  ON public.plg_forms_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_forms_templates_parent
  ON public.plg_forms_templates(parent_id);
CREATE INDEX IF NOT EXISTS idx_plg_forms_templates_category
  ON public.plg_forms_templates(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_plg_forms_templates_current
  ON public.plg_forms_templates(tenant_id, is_current, is_active)
  WHERE is_current = true AND is_active = true AND is_deleted = false;

CREATE POLICY "plg_forms_templates_select" ON public.plg_forms_templates
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_templates_insert" ON public.plg_forms_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_templates_update" ON public.plg_forms_templates
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_templates_delete" ON public.plg_forms_templates
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- plg_forms_documents: filled form instances
CREATE TABLE IF NOT EXISTS public.plg_forms_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.plg_forms_templates(id),
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  title text,
  data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  signed_at timestamptz,
  signed_by uuid,
  notes text,
  metadata jsonb DEFAULT '{}',
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plg_forms_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_plg_forms_documents_tenant
  ON public.plg_forms_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_forms_documents_person
  ON public.plg_forms_documents(person_id);
CREATE INDEX IF NOT EXISTS idx_plg_forms_documents_template
  ON public.plg_forms_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_plg_forms_documents_status
  ON public.plg_forms_documents(tenant_id, status);

CREATE POLICY "plg_forms_documents_select" ON public.plg_forms_documents
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_documents_insert" ON public.plg_forms_documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_documents_update" ON public.plg_forms_documents
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_documents_delete" ON public.plg_forms_documents
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- plg_forms_document_files: file attachments for image/gallery/drawing fields
CREATE TABLE IF NOT EXISTS public.plg_forms_document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.plg_forms_documents(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plg_forms_document_files ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_plg_forms_document_files_document
  ON public.plg_forms_document_files(document_id);

CREATE POLICY "plg_forms_document_files_select" ON public.plg_forms_document_files
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_document_files_insert" ON public.plg_forms_document_files
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_document_files_update" ON public.plg_forms_document_files
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY "plg_forms_document_files_delete" ON public.plg_forms_document_files
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- View: plg_forms_documents with template name joined
CREATE OR REPLACE VIEW public.v_frm_documents AS
SELECT
  d.*,
  t.name AS template_name,
  t.category AS template_category,
  p.name AS person_name
FROM public.plg_forms_documents d
LEFT JOIN public.plg_forms_templates t ON t.id = d.template_id
LEFT JOIN public.people p ON p.id = d.person_id;
