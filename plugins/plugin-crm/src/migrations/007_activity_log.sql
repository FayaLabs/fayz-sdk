-- CRM plugin — activity log foundation.
-- Activity types become tenant-editable (icon column) and upsertable by the
-- provider's lazy per-tenant seed (unique tenant+name). System timeline events
-- (lead_created, stage_changed, quote_*…) are written by the data provider
-- into plg_crm_activities with completed_at = now(); they are product-defined
-- and do NOT live in the types catalog.
-- Idempotent / replay-safe.

ALTER TABLE public.plg_crm_activity_types ADD COLUMN IF NOT EXISTS icon text;

-- Guarded: a pre-existing pool could hold duplicate names; skip rather than fail.
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_plg_crm_activity_types_tenant_name
    ON public.plg_crm_activity_types(tenant_id, name);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skipping uq_plg_crm_activity_types_tenant_name: %', SQLERRM;
END $$;

-- Backfill: records created BEFORE auto-logging existed get their timeline
-- events retroactively (stamped at the record's created_at), so the Activities
-- view isn't empty on day one. Idempotent via NOT EXISTS per record+type.
INSERT INTO public.plg_crm_activities
  (tenant_id, lead_id, contact_name, activity_type, title, completed_at, created_at)
SELECT p.tenant_id, p.id, p.name, 'lead_created', p.name, p.created_at, p.created_at
FROM public.people p
WHERE p.kind = 'lead'
  AND NOT EXISTS (
    SELECT 1 FROM public.plg_crm_activities a
    WHERE a.lead_id = p.id AND a.activity_type = 'lead_created'
  );

INSERT INTO public.plg_crm_activities
  (tenant_id, deal_id, contact_name, activity_type, title, completed_at, created_at)
SELECT o.tenant_id, o.id, o.metadata->>'contactName', 'deal_created',
       COALESCE(NULLIF(o.notes, ''), 'Deal'), o.created_at, o.created_at
FROM public.orders o
WHERE o.kind = 'deal'
  AND NOT EXISTS (
    SELECT 1 FROM public.plg_crm_activities a
    WHERE a.deal_id = o.id AND a.activity_type = 'deal_created'
  );

INSERT INTO public.plg_crm_activities
  (tenant_id, contact_name, activity_type, title, description, completed_at, created_at)
SELECT o.tenant_id, o.metadata->>'contactName', 'quote_created',
       COALESCE(o.reference_number, 'Quote'), o.metadata->>'contactName',
       o.created_at, o.created_at
FROM public.orders o
WHERE o.kind = 'quote'
  AND NOT EXISTS (
    SELECT 1 FROM public.plg_crm_activities a
    WHERE a.activity_type = 'quote_created' AND a.title = COALESCE(o.reference_number, 'Quote')
      AND a.tenant_id = o.tenant_id
  );
