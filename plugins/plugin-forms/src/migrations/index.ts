// AUTO-GENERATED from 000_plg_rename.sql, 001_frm_base.sql, 002_document_archetype.sql — regenerate with scripts/embed-migrations.mjs
// SQL files are the source of truth; this inline copy lets the manifest declare
// migrations as data. Do not edit by hand — run the embed script instead.

export const MIGRATION_000_PLG_RENAME = `-- 000_plg_rename.sql — rename legacy forms tables to plg_forms_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when the legacy
-- name exists and the target does not, so fresh pools skip every branch.
-- The core \`documents\` archetype table is NOT renamed — it stays public.documents.
DO $$
BEGIN
  IF to_regclass('public.frm_documents') IS NOT NULL AND to_regclass('public.plg_forms_documents') IS NULL THEN
    ALTER TABLE public.frm_documents RENAME TO plg_forms_documents;
  END IF;
  IF to_regclass('public.frm_templates') IS NOT NULL AND to_regclass('public.plg_forms_templates') IS NULL THEN
    ALTER TABLE public.frm_templates RENAME TO plg_forms_templates;
  END IF;
  IF to_regclass('public.frm_document_files') IS NOT NULL AND to_regclass('public.plg_forms_document_files') IS NULL THEN
    ALTER TABLE public.frm_document_files RENAME TO plg_forms_document_files;
  END IF;
  -- frm_categories: registry-declared (form-template categories); no base-table
  -- DDL ships in this plugin, but rename in place if a pool created one.
  IF to_regclass('public.frm_categories') IS NOT NULL AND to_regclass('public.plg_forms_categories') IS NULL THEN
    ALTER TABLE public.frm_categories RENAME TO plg_forms_categories;
  END IF;
END $$;
`

export const MIGRATION_001_FRM_BASE = `-- ============================================================
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

DROP POLICY IF EXISTS "plg_forms_templates_select" ON public.plg_forms_templates;
CREATE POLICY "plg_forms_templates_select" ON public.plg_forms_templates
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_templates_insert" ON public.plg_forms_templates;
CREATE POLICY "plg_forms_templates_insert" ON public.plg_forms_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_templates_update" ON public.plg_forms_templates;
CREATE POLICY "plg_forms_templates_update" ON public.plg_forms_templates
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_templates_delete" ON public.plg_forms_templates;
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
-- person_id/status only exist in the pre-archetype shape this file creates;
-- converted pools (salon) already carry the archetype extension shape
-- (document_id PK, no person_id) — 002 owns that shape, so guard these.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plg_forms_documents'
      AND column_name = 'person_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_plg_forms_documents_person
      ON public.plg_forms_documents(person_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_plg_forms_documents_status
      ON public.plg_forms_documents(tenant_id, status)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_plg_forms_documents_template
  ON public.plg_forms_documents(template_id);

DROP POLICY IF EXISTS "plg_forms_documents_select" ON public.plg_forms_documents;
CREATE POLICY "plg_forms_documents_select" ON public.plg_forms_documents
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_documents_insert" ON public.plg_forms_documents;
CREATE POLICY "plg_forms_documents_insert" ON public.plg_forms_documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_documents_update" ON public.plg_forms_documents;
CREATE POLICY "plg_forms_documents_update" ON public.plg_forms_documents
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_documents_delete" ON public.plg_forms_documents;
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

DROP POLICY IF EXISTS "plg_forms_document_files_select" ON public.plg_forms_document_files;
CREATE POLICY "plg_forms_document_files_select" ON public.plg_forms_document_files
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_document_files_insert" ON public.plg_forms_document_files;
CREATE POLICY "plg_forms_document_files_insert" ON public.plg_forms_document_files
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_document_files_update" ON public.plg_forms_document_files;
CREATE POLICY "plg_forms_document_files_update" ON public.plg_forms_document_files
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_document_files_delete" ON public.plg_forms_document_files;
CREATE POLICY "plg_forms_document_files_delete" ON public.plg_forms_document_files
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- View: pre-archetype read model (needs person_id; archetype pools get
-- v_documents from 002 instead, which also drops this view when migrating).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plg_forms_documents'
      AND column_name = 'person_id'
  ) THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.v_frm_documents AS
      SELECT
        d.*,
        t.name AS template_name,
        t.category AS template_category,
        p.name AS person_name
      FROM public.plg_forms_documents d
      LEFT JOIN public.plg_forms_templates t ON t.id = d.template_id
      LEFT JOIN public.people p ON p.id = d.person_id
    $v$;
  END IF;
END $$;
`

export const MIGRATION_002_DOCUMENT_ARCHETYPE = `-- ============================================================
-- Document Archetype — public.documents
-- A document is any record associated with a person (or standalone):
-- forms, images, attachments, prescriptions, contracts, etc.
-- The \`kind\` column discriminates the type.
--
-- DATA SAFETY (converted pools): plg_forms_documents may already hold REAL
-- rows in its PRE-archetype shape (its own \`id\` PK, no \`document_id\` column —
-- see 001_frm_base.sql). This migration MIGRATES those rows into the new
-- document archetype instead of dropping them:
--   * pre-archetype + rows   -> copy each legacy row into public.documents
--                               (reusing its id) + into the new extension
--                               table, migrate its files, then drop legacy.
--   * pre-archetype + empty  -> plain drop + create (fresh shape).
--   * already new shape      -> no-op.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'attachment',
  -- kind: 'form', 'image', 'attachment', 'prescription', 'contract', etc.
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
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

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_documents_person ON public.documents(person_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(tenant_id, status);

DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "documents_update" ON public.documents;
CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- ============================================================
-- Reconcile plg_forms_documents / plg_forms_document_files with the archetype.
-- ============================================================

-- Step 1: if a PRE-archetype plg_forms_documents is present (no document_id
-- column), rename it (and its files table + dependent view) out of the way so
-- the new archetype-shaped tables can be created and — when it holds rows —
-- its data copied across. Fully guarded, so already-migrated pools skip this.
DO $$
BEGIN
  IF to_regclass('public.plg_forms_documents') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'plg_forms_documents'
         AND column_name = 'document_id'
     ) THEN
    DROP VIEW IF EXISTS public.v_frm_documents;
    ALTER TABLE public.plg_forms_documents RENAME TO plg_forms_documents_legacy;
    IF to_regclass('public.plg_forms_document_files') IS NOT NULL THEN
      ALTER TABLE public.plg_forms_document_files RENAME TO plg_forms_document_files_legacy;
    END IF;
  END IF;
END $$;

-- Step 2: create the new archetype-shaped extension tables. IF NOT EXISTS makes
-- this a no-op on pools already migrated to the new shape; after Step 1 the
-- names are free on pre-archetype pools.

-- plg_forms_documents: extension table for form-type documents
CREATE TABLE IF NOT EXISTS public.plg_forms_documents (
  document_id uuid PRIMARY KEY REFERENCES public.documents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.plg_forms_templates(id),
  data jsonb NOT NULL DEFAULT '{}',
  signed_at timestamptz,
  signed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plg_forms_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_plg_forms_documents_template ON public.plg_forms_documents(template_id);

DROP POLICY IF EXISTS "plg_forms_documents_select" ON public.plg_forms_documents;
CREATE POLICY "plg_forms_documents_select" ON public.plg_forms_documents
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_documents_insert" ON public.plg_forms_documents;
CREATE POLICY "plg_forms_documents_insert" ON public.plg_forms_documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_documents_update" ON public.plg_forms_documents;
CREATE POLICY "plg_forms_documents_update" ON public.plg_forms_documents
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_documents_delete" ON public.plg_forms_documents;
CREATE POLICY "plg_forms_documents_delete" ON public.plg_forms_documents
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- plg_forms_document_files: file attachments for form fields
CREATE TABLE IF NOT EXISTS public.plg_forms_document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_plg_forms_document_files_document ON public.plg_forms_document_files(document_id);

DROP POLICY IF EXISTS "plg_forms_document_files_select" ON public.plg_forms_document_files;
CREATE POLICY "plg_forms_document_files_select" ON public.plg_forms_document_files
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_document_files_insert" ON public.plg_forms_document_files;
CREATE POLICY "plg_forms_document_files_insert" ON public.plg_forms_document_files
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_document_files_update" ON public.plg_forms_document_files;
CREATE POLICY "plg_forms_document_files_update" ON public.plg_forms_document_files
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));
DROP POLICY IF EXISTS "plg_forms_document_files_delete" ON public.plg_forms_document_files;
CREATE POLICY "plg_forms_document_files_delete" ON public.plg_forms_document_files
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- Step 3: if legacy rows exist, migrate them, then drop the quarantined legacy
-- tables. Reusing each legacy id as the documents.id keeps every legacy file's
-- document_id FK valid after the copy. ON CONFLICT DO NOTHING makes a partial
-- re-run safe.
DO $$
BEGIN
  IF to_regclass('public.plg_forms_documents_legacy') IS NOT NULL THEN
    -- 3a. base document (one per legacy form document; is_active mirrors NOT is_deleted)
    INSERT INTO public.documents (
      id, tenant_id, kind, person_id, title, status, notes, metadata,
      is_active, created_by, updated_by, created_at, updated_at
    )
    SELECT
      id, tenant_id, 'form', person_id, title, status, notes, metadata,
      NOT COALESCE(is_deleted, false), created_by, updated_by, created_at, updated_at
    FROM public.plg_forms_documents_legacy
    ON CONFLICT (id) DO NOTHING;

    -- 3b. form extension row (keyed by the reused document id)
    INSERT INTO public.plg_forms_documents (
      document_id, tenant_id, template_id, data, signed_at, signed_by, created_at, updated_at
    )
    SELECT
      id, tenant_id, template_id, data, signed_at, signed_by, created_at, updated_at
    FROM public.plg_forms_documents_legacy
    ON CONFLICT (document_id) DO NOTHING;

    -- 3c. file attachments (document_id already points at the reused id)
    IF to_regclass('public.plg_forms_document_files_legacy') IS NOT NULL THEN
      INSERT INTO public.plg_forms_document_files (
        id, tenant_id, document_id, field_key, file_url, file_name,
        file_size, mime_type, sort_order, metadata, created_at
      )
      SELECT
        id, tenant_id, document_id, field_key, file_url, file_name,
        file_size, mime_type, sort_order, metadata, created_at
      FROM public.plg_forms_document_files_legacy
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  -- Drop legacy remnants now that any data has been copied across.
  DROP TABLE IF EXISTS public.plg_forms_document_files_legacy;
  DROP TABLE IF EXISTS public.plg_forms_documents_legacy;
END $$;

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
FROM public.documents d
LEFT JOIN public.plg_forms_documents f ON f.document_id = d.id
LEFT JOIN public.plg_forms_templates t ON t.id = f.template_id
LEFT JOIN public.people p ON p.id = d.person_id;
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000_plg_rename", sql: MIGRATION_000_PLG_RENAME },
  { id: "001_frm_base", sql: MIGRATION_001_FRM_BASE },
  { id: "002_document_archetype", sql: MIGRATION_002_DOCUMENT_ARCHETYPE },
]
