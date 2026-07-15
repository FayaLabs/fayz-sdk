-- 000_plg_rename.sql — rename legacy forms tables to plg_forms_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when the legacy
-- name exists and the target does not, so fresh pools skip every branch.
-- The core `documents` archetype table is NOT renamed — it stays public.documents.
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
