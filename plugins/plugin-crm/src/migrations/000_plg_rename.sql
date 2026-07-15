-- 000_plg_rename.sql — rename legacy CRM tables to the plg_crm_* convention for
-- pools provisioned before the industry-pool rename. Guarded: only fires when the
-- legacy name exists and the target does not, so fresh pools skip every branch and
-- the create-table migrations below build clean.
DO $$
BEGIN
  IF to_regclass('public.crm_activities') IS NOT NULL AND to_regclass('public.plg_crm_activities') IS NULL THEN
    ALTER TABLE public.crm_activities RENAME TO plg_crm_activities;
  END IF;
  IF to_regclass('public.crm_tags') IS NOT NULL AND to_regclass('public.plg_crm_tags') IS NULL THEN
    ALTER TABLE public.crm_tags RENAME TO plg_crm_tags;
  END IF;
  IF to_regclass('public.crm_activity_types') IS NOT NULL AND to_regclass('public.plg_crm_activity_types') IS NULL THEN
    ALTER TABLE public.crm_activity_types RENAME TO plg_crm_activity_types;
  END IF;
  IF to_regclass('public.pipelines') IS NOT NULL AND to_regclass('public.plg_crm_pipelines') IS NULL THEN
    ALTER TABLE public.pipelines RENAME TO plg_crm_pipelines;
  END IF;
  IF to_regclass('public.pipeline_stages') IS NOT NULL AND to_regclass('public.plg_crm_pipeline_stages') IS NULL THEN
    ALTER TABLE public.pipeline_stages RENAME TO plg_crm_pipeline_stages;
  END IF;
  IF to_regclass('public.deal_extensions') IS NOT NULL AND to_regclass('public.plg_crm_deal_extensions') IS NULL THEN
    ALTER TABLE public.deal_extensions RENAME TO plg_crm_deal_extensions;
  END IF;
  IF to_regclass('public.lead_sources') IS NOT NULL AND to_regclass('public.plg_crm_lead_sources') IS NULL THEN
    ALTER TABLE public.lead_sources RENAME TO plg_crm_lead_sources;
  END IF;
END $$;
