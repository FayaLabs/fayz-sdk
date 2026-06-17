-- CRM plugin — companion SQL (functions/views/RLS Drizzle doesn't diff).
-- Tables come from the Drizzle schema (src/schema/); this is everything else the
-- plugin's data provider depends on: RLS policies + grants + the read-views.
-- Idempotent. Canonical RLS form: tenant_id IN (SELECT public.user_tenant_ids()).

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pipelines','pipeline_stages','lead_sources','crm_tags',
    'deal_extensions','crm_activity_types','crm_activities'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_select') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_select', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_insert') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_insert', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_update') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_update', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_delete') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_delete', t);
    END IF;
  END LOOP;
END $$;

-- v_leads: saas_core.persons (kind='lead')
CREATE OR REPLACE VIEW public.v_leads WITH (security_invoker=true) AS
SELECT
  p.id, p.tenant_id, p.name, p.email, p.phone, p.notes, p.tags, p.is_active,
  p.metadata->>'company'       AS company,
  p.metadata->>'sourceId'      AS source_id,
  p.metadata->>'sourceName'    AS source_name,
  COALESCE(p.metadata->>'status','new') AS lead_status,
  p.metadata->>'value'         AS lead_value,
  p.metadata->>'assignedToId'  AS assigned_to_id,
  p.created_at, p.updated_at
FROM saas_core.persons p
WHERE p.kind = 'lead';
GRANT SELECT ON public.v_leads TO authenticated;

-- v_deals: saas_core.orders (kind='deal') JOIN deal_extensions JOIN pipeline_stages
CREATE OR REPLACE VIEW public.v_deals WITH (security_invoker=true) AS
SELECT
  o.id, o.tenant_id, o.status,
  o.total AS value, o.notes AS title,
  o.party_id AS contact_id, o.assignee_id AS assigned_to_id, o.tags,
  o.metadata->>'contactName' AS contact_name,
  o.created_at, o.updated_at,
  de.pipeline_id, de.stage_id, de.probability, de.expected_close_date,
  de.lead_id, de.lost_reason,
  ps.name AS stage_name, ps.color AS stage_color, ps."order" AS stage_order
FROM saas_core.orders o
LEFT JOIN public.deal_extensions de ON de.order_id = o.id
LEFT JOIN public.pipeline_stages ps ON ps.id = de.stage_id
WHERE o.kind = 'deal';
GRANT SELECT ON public.v_deals TO authenticated;
