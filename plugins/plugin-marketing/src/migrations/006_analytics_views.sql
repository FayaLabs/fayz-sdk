-- Marketing Plugin: analytics read views.
-- v_marketing_channels / v_marketing_campaigns — bridge views for the surface
-- and the agent's data primitives.
-- v_marketing_attribution — GENERIC, spine-only attribution event stream
-- (people/appointments/orders metadata). `channel_raw` is the unnormalized
-- origin string; the provider matches it against the app's channel set
-- (id or label, case/punctuation-insensitive).
-- Apps whose origin lives in an app-local extension table (e.g. beauty's
-- clients.origin) may CREATE OR REPLACE this view in their own incubator
-- migration, KEEPING the column contract:
--   (tenant_id uuid, kind text, source text, channel_raw text,
--    occurred_at timestamptz, value numeric)

CREATE OR REPLACE VIEW public.v_marketing_channels WITH (security_invoker=true) AS
SELECT c.id, c.tenant_id, c.channel_key, c.label, c.icon, c.kind,
       c.is_active, c.monthly_spend, c.created_at, c.updated_at
FROM public.plg_marketing_channels c;
GRANT SELECT ON public.v_marketing_channels TO authenticated;

CREATE OR REPLACE VIEW public.v_marketing_campaigns WITH (security_invoker=true) AS
SELECT g.id, g.tenant_id, g.name, g.channel_key, ch.label AS channel_label,
       g.status, g.starts_at, g.ends_at, g.spend, g.created_at, g.updated_at
FROM public.plg_marketing_campaigns g
LEFT JOIN public.plg_marketing_channels ch
  ON ch.tenant_id = g.tenant_id AND ch.channel_key = g.channel_key;
GRANT SELECT ON public.v_marketing_campaigns TO authenticated;

CREATE OR REPLACE VIEW public.v_marketing_attribution WITH (security_invoker=true) AS
-- lead events (CRM leads; sourceId aligns with lead-sources/channel ids)
SELECT p.tenant_id,
       'lead'::text AS kind,
       'crm'::text AS source,
       COALESCE(p.metadata->>'sourceId', p.metadata->>'sourceName', p.metadata->>'origin') AS channel_raw,
       p.created_at AS occurred_at,
       NULLIF(p.metadata->>'value', '')::numeric AS value
FROM public.people p
WHERE p.kind = 'lead'
UNION ALL
-- booking conversions (agenda verticals)
SELECT b.tenant_id, 'conversion', 'agenda',
       COALESCE(b.metadata->>'origin', pc.metadata->>'origin', pc.metadata->>'sourceId', pc.metadata->>'sourceName'),
       b.starts_at,
       o.total
FROM public.appointments b
LEFT JOIN public.people pc ON pc.id = b.party_id
LEFT JOIN public.orders o ON o.id = b.order_id
WHERE b.status NOT IN ('cancelled', 'no_show')
UNION ALL
-- order conversions (commerce verticals)
SELECT o.tenant_id, 'conversion', 'orders',
       COALESCE(o.metadata->>'origin', pp.metadata->>'origin', pp.metadata->>'sourceId'),
       o.created_at,
       o.total
FROM public.orders o
LEFT JOIN public.people pp ON pp.id = o.party_id
WHERE o.kind NOT IN ('appointment', 'deal')
  AND o.status NOT IN ('cancelled', 'draft')
UNION ALL
-- won-deal conversions (CRM verticals)
SELECT o.tenant_id, 'conversion', 'crm',
       COALESCE(pp.metadata->>'sourceId', pp.metadata->>'sourceName', o.metadata->>'origin'),
       o.updated_at,
       o.total
FROM public.orders o
LEFT JOIN public.people pp ON pp.id = o.party_id
WHERE o.kind = 'deal' AND o.status = 'won';

GRANT SELECT ON public.v_marketing_attribution TO authenticated;
