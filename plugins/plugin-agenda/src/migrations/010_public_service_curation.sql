-- plugin-agenda 010: curate what the PUBLIC booking page sells.
--
-- v_public_services published every active service, so the website catalog was
-- "whatever exists in the system". That conflates two different questions:
--
--   • is this service usable at all?          → services.is_active / status
--   • should a stranger be able to book it?   → this flag
--
-- Without the split, hiding something from the site means deactivating it —
-- which also removes it from the internal agenda and orphans its history. The
-- case that forced this: a school whose public page listed 7 services when it
-- sells 3, and one of the 4 extras already had real bookings attached.
--
-- OPT-OUT on purpose: a service is public unless explicitly marked otherwise.
-- Opt-in would silently empty every live catalog the moment this ships.

CREATE OR REPLACE VIEW public.v_public_services AS
SELECT id,
    tenant_id,
    name,
    description,
    price,
    currency,
    COALESCE(duration_minutes, 30) AS duration_minutes,
    image_url,
    COALESCE(((metadata ->> 'sort_order'::text))::integer, 0) AS sort_order
   FROM services s
  WHERE is_active
    AND status = 'active'::text
    -- absent → public (back-compat). Only an explicit false hides it.
    AND COALESCE((metadata ->> 'bookableOnline'::text)::boolean, true);
