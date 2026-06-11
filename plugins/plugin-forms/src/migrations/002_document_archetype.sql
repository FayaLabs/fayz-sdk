-- ============================================================
-- Document Archetype — saas_core.documents
-- A document is any record associated with a person (or standalone):
-- forms, images, attachments, prescriptions, contracts, etc.
-- The `kind` column discriminates the type.
-- ============================================================

CREATE TABLE IF NOT EXISTS saas_core.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'attachment',
  -- kind: 'form', 'image', 'attachment', 'prescription', 'contract', etc.
  person_id uuid REFERENCES saas_core.persons(id) ON DELETE SET NULL,
  title text,
  description text,
  status text NOT NULL DEFAULT 'draft',
  -- status: 'draft', 'completed', 'signed', 'archived'
  file_url text,
  file_name text,
  file_size integer,
  mime_type text,
  tags text[] DEFAULT '{}',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saas_core.documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON saas_core.documents(tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_documents_person ON saas_core.documents(person_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON saas_core.documents(tenant_id, status);

CREATE POLICY "documents_select" ON saas_core.documents
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "documents_insert" ON saas_core.documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "documents_update" ON saas_core.documents
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "documents_delete" ON saas_core.documents
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM saas_core.tenant_members WHERE user_id = auth.uid()));

-- ============================================================
-- Alter frm_documents to become extension table for 'form' kind
-- ============================================================

-- Drop old frm_documents and recreate as extension
DROP VIEW IF EXISTS public.v_frm_documents;
DROP TABLE IF EXISTS public.frm_document_files;
DROP TABLE IF EXISTS public.frm_documents;

-- frm_documents: extension table for form-type documents
CREATE TABLE public.frm_documents (
  document_id uuid PRIMARY KEY REFERENCES saas_core.documents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.frm_templates(id),
  data jsonb NOT NULL DEFAULT '{}',
  signed_at timestamptz,
  signed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.frm_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_frm_documents_template ON public.frm_documents(template_id);

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

-- frm_document_files: file attachments for form fields
CREATE TABLE public.frm_document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES saas_core.documents(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_frm_document_files_document ON public.frm_document_files(document_id);

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

-- View: all documents for a person with form data joined when applicable
CREATE OR REPLACE VIEW public.v_documents AS
SELECT
  d.*,
  f.template_id,
  f.data AS form_data,
  f.signed_at,
  f.signed_by,
  t.name AS template_name,
  t.category AS template_category,
  p.name AS person_name
FROM saas_core.documents d
LEFT JOIN public.frm_documents f ON f.document_id = d.id
LEFT JOIN public.frm_templates t ON t.id = f.template_id
LEFT JOIN saas_core.persons p ON p.id = d.person_id;
