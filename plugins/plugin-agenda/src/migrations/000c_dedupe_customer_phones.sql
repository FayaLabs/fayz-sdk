-- 001 needs the customer-phone upsert key UNIQUE(tenant_id, phone). Converted
-- pools can carry duplicates (found live on salon: 9 dogfood test records all
-- sharing the founder's phone). Non-destructive dedupe: per (tenant_id, phone)
-- customer group keep the row with most appointments (tie: oldest), NULL the
-- phone on the rest and stash the original in metadata->'dedupedPhone'.
-- Idempotent: reruns find no groups > 1.

DO $dedupe$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.people') IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT p.id, p.phone
    FROM public.people p
    JOIN LATERAL (
      SELECT count(*) AS appts
      FROM public.appointments a WHERE a.party_id = p.id
    ) ac ON true
    WHERE p.kind = 'customer' AND p.phone IS NOT NULL
      AND p.id NOT IN (
        SELECT DISTINCT ON (p2.tenant_id, p2.phone) p2.id
        FROM public.people p2
        WHERE p2.kind = 'customer' AND p2.phone IS NOT NULL
        ORDER BY p2.tenant_id, p2.phone,
          (SELECT count(*) FROM public.appointments a2 WHERE a2.party_id = p2.id) DESC,
          p2.created_at ASC
      )
      AND (p.tenant_id, p.phone) IN (
        SELECT tenant_id, phone FROM public.people
        WHERE kind = 'customer' AND phone IS NOT NULL
        GROUP BY tenant_id, phone HAVING count(*) > 1
      )
  LOOP
    UPDATE public.people
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('dedupedPhone', r.phone),
        phone = NULL
    WHERE id = r.id;
  END LOOP;
END $dedupe$;
