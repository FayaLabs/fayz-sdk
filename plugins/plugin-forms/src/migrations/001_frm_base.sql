-- ============================================================
-- Custom Forms Plugin — Base Tables
-- ============================================================

-- frm_templates: form template definitions (versioned)
CREATE TABLE IF NOT EXISTS public.frm_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  parent_id uuid REFERENCES public.frm_templates(id),
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

ALTER TABLE public.frm_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_frm_templates_tenant
  ON public.frm_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_frm_templates_parent
  ON public.frm_templates(parent_id);
CREATE INDEX IF NOT EXISTS idx_frm_templates_category
  ON public.frm_templates(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_frm_templates_current
  ON public.frm_templates(tenant_id, is_current, is_active)
  WHERE is_current = true AND is_active = true AND is_deleted = false;

CREATE POLICY "frm_templates_select" ON public.frm_templates
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_templates_insert" ON public.frm_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_templates_update" ON public.frm_templates
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_templates_delete" ON public.frm_templates
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));

-- frm_documents: filled form instances
CREATE TABLE IF NOT EXISTS public.frm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.frm_templates(id),
  person_id uuid REFERENCES saas_core.persons(id) ON DELETE SET NULL,
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

ALTER TABLE public.frm_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_frm_documents_tenant
  ON public.frm_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_frm_documents_person
  ON public.frm_documents(person_id);
CREATE INDEX IF NOT EXISTS idx_frm_documents_template
  ON public.frm_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_frm_documents_status
  ON public.frm_documents(tenant_id, status);

CREATE POLICY "frm_documents_select" ON public.frm_documents
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_documents_insert" ON public.frm_documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_documents_update" ON public.frm_documents
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_documents_delete" ON public.frm_documents
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));

-- frm_document_files: file attachments for image/gallery/drawing fields
CREATE TABLE IF NOT EXISTS public.frm_document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.frm_documents(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.frm_document_files ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_frm_document_files_document
  ON public.frm_document_files(document_id);

CREATE POLICY "frm_document_files_select" ON public.frm_document_files
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_document_files_insert" ON public.frm_document_files
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_document_files_update" ON public.frm_document_files
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "frm_document_files_delete" ON public.frm_document_files
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));

-- View: frm_documents with template name joined
CREATE OR REPLACE VIEW public.v_frm_documents AS
SELECT
  d.*,
  t.name AS template_name,
  t.category AS template_category,
  p.name AS person_name
FROM public.frm_documents d
LEFT JOIN public.frm_templates t ON t.id = d.template_id
LEFT JOIN saas_core.persons p ON p.id = d.person_id;
