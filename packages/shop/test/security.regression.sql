-- ============================================================================
-- 0019 — payment authority + tenant-scoped anonymous catalogue reads
--
-- Self-contained: builds its own tenants/products/order so it does not depend
-- on what the earlier regression files left behind (running them out of order
-- has bitten this bench twice).
--
-- The interesting assertions run under SET ROLE, because RLS and function
-- grants do not apply to the superuser the bench connects as. A test of a
-- security boundary that runs as postgres proves nothing.
-- ============================================================================
\set ON_ERROR_STOP off
\pset pager off

\echo === security (0019) ===

BEGIN;

-- A published merchant and an unpublished one, so the gate has both sides.
INSERT INTO public.tenants (id, name, slug, storefront_published) VALUES
  ('50000000-0000-4000-8000-000000000001', 'Loja Publicada',    'sec-live',  true),
  ('50000000-0000-4000-8000-000000000002', 'Loja Em Onboarding', 'sec-draft', false)
ON CONFLICT (id) DO UPDATE SET storefront_published = EXCLUDED.storefront_published;

INSERT INTO public.plg_shop_categories (id, tenant_id, name, slug) VALUES
  ('50000000-0000-4000-8000-0000000000c1', '50000000-0000-4000-8000-000000000001', 'Cat Live',  'sec-cat-live'),
  ('50000000-0000-4000-8000-0000000000c2', '50000000-0000-4000-8000-000000000002', 'Cat Draft', 'sec-cat-draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plg_shop_products (id, tenant_id, name, slug, price, currency, status, inventory_count) VALUES
  ('50000000-0000-4000-8000-0000000000f1', '50000000-0000-4000-8000-000000000001', 'Produto Live',  'sec-prod-live',  10, 'BRL', 'active', 5),
  ('50000000-0000-4000-8000-0000000000f2', '50000000-0000-4000-8000-000000000002', 'Produto Draft', 'sec-prod-draft', 10, 'BRL', 'active', 5)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- S1 — anon lost EXECUTE on shop_confirm_payment
-- ---------------------------------------------------------------------------
\echo --- S1 anon cannot execute shop_confirm_payment
SELECT CASE WHEN has_function_privilege('anon', 'public.shop_confirm_payment(uuid, text)', 'EXECUTE')
            THEN 'FAIL S1: anon still holds EXECUTE'
            ELSE 'PASS S1: anon has no EXECUTE' END;

\echo --- S1b the legitimate callers kept it
SELECT CASE WHEN has_function_privilege('service_role', 'public.shop_confirm_payment(uuid, text)', 'EXECUTE')
             AND has_function_privilege('authenticated', 'public.shop_confirm_payment(uuid, text)', 'EXECUTE')
            THEN 'PASS S1b: service_role and authenticated kept EXECUTE'
            ELSE 'FAIL S1b: a legitimate caller lost EXECUTE' END;

-- ---------------------------------------------------------------------------
-- S2 — a non-member cannot confirm someone else's order
-- ---------------------------------------------------------------------------
BEGIN;
INSERT INTO public.plg_shop_orders (id, tenant_id, status, financial_status, subtotal, total, currency)
VALUES ('50000000-0000-4000-8000-0000000000a1', '50000000-0000-4000-8000-000000000001',
        'open', 'pending', 10, 10, 'BRL')
ON CONFLICT (id) DO UPDATE SET status = 'open', financial_status = 'pending';
COMMIT;

\echo --- S2 outsider is refused
-- Caught rather than allowed to surface: the refusal IS the expected result, so
-- letting psql print ERROR would make a passing run look like a broken one (the
-- runner greps for ERROR). Catching it also lets the test assert the SQLSTATE —
-- a refusal for the right reason, not an incidental crash.
DO $$
DECLARE v_state text; v_after text;
BEGIN
  -- app.tenant drives the user_tenant_ids() stub: a member of a DIFFERENT tenant.
  PERFORM set_config('app.tenant', '50000000-0000-4000-8000-000000000002', true);
  BEGIN
    PERFORM public.shop_confirm_payment('50000000-0000-4000-8000-0000000000a1');
    v_state := 'no-error';
  EXCEPTION WHEN insufficient_privilege THEN
    v_state := SQLSTATE;
  END;

  SELECT financial_status INTO v_after
    FROM public.plg_shop_orders WHERE id = '50000000-0000-4000-8000-0000000000a1';

  IF v_state = '42501' AND v_after = 'pending' THEN
    RAISE NOTICE 'PASS S2: outsider refused with 42501, order still pending';
  ELSE
    RAISE NOTICE 'FAIL S2: sqlstate=% status=%', v_state, v_after;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- S3 — a member of the owning tenant CAN confirm
-- ---------------------------------------------------------------------------
\echo --- S3 tenant member is allowed
SET app.tenant = '50000000-0000-4000-8000-000000000001';
SELECT public.shop_confirm_payment('50000000-0000-4000-8000-0000000000a1') IS NOT NULL AS confirmed;
SELECT CASE WHEN financial_status = 'paid'
            THEN 'PASS S3: member confirmed the payment'
            ELSE 'FAIL S3: member could not confirm, status is ' || financial_status END
  FROM public.plg_shop_orders WHERE id = '50000000-0000-4000-8000-0000000000a1';
RESET app.tenant;

-- ---------------------------------------------------------------------------
-- S4 — anon sees only published tenants' products
-- ---------------------------------------------------------------------------
\echo --- S4 unpublished catalogue is invisible to anon
SET ROLE anon;
SELECT CASE WHEN count(*) FILTER (WHERE slug = 'sec-prod-live')  = 1
             AND count(*) FILTER (WHERE slug = 'sec-prod-draft') = 0
            THEN 'PASS S4: published visible, unpublished hidden'
            ELSE 'FAIL S4: live=' || count(*) FILTER (WHERE slug = 'sec-prod-live')
                 || ' draft=' || count(*) FILTER (WHERE slug = 'sec-prod-draft') END
  FROM public.plg_shop_products WHERE slug IN ('sec-prod-live', 'sec-prod-draft');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- S5 — categories are no longer world-readable (they were USING (true))
-- ---------------------------------------------------------------------------
\echo --- S5 categories are tenant-gated
SET ROLE anon;
SELECT CASE WHEN count(*) FILTER (WHERE slug = 'sec-cat-live')  = 1
             AND count(*) FILTER (WHERE slug = 'sec-cat-draft') = 0
            THEN 'PASS S5: only the published tenant''s categories are readable'
            ELSE 'FAIL S5: live=' || count(*) FILTER (WHERE slug = 'sec-cat-live')
                 || ' draft=' || count(*) FILTER (WHERE slug = 'sec-cat-draft') END
  FROM public.plg_shop_categories WHERE slug IN ('sec-cat-live', 'sec-cat-draft');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- S6 — no duplicate permissive public-read policy survived
--
-- This is the one that would silently undo the whole migration: permissive
-- policies OR together, so one forgotten leftover re-opens the catalogue.
-- ---------------------------------------------------------------------------
\echo --- S6 exactly one anon read policy per catalogue table
SELECT CASE WHEN count(*) = 3
            THEN 'PASS S6: one anon SELECT policy per catalogue table'
            ELSE 'FAIL S6: expected 3 anon SELECT policies, found ' || count(*)
                 || ' (' || string_agg(tablename || '.' || policyname, ', ') || ')' END
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('plg_shop_products', 'plg_shop_categories', 'plg_shop_product_images')
   AND cmd = 'SELECT'
   AND roles::text LIKE '%anon%';

-- ---------------------------------------------------------------------------
-- S7 — a signed-in shopper cannot read another customer's order history
-- ---------------------------------------------------------------------------
\echo --- S7 order history is scoped to the signed-in shopper
DO $$
DECLARE
  v_mine  uuid := '50000000-0000-4000-8000-0000000000d1';
  v_other uuid := '50000000-0000-4000-8000-0000000000d2';
  v_uid   uuid := '50000000-0000-4000-8000-0000000000e1';
  v_state text; v_guest int; v_own int;
BEGIN
  INSERT INTO public.plg_shop_customers (id, tenant_id, first_name, last_name, email, auth_user_id)
  VALUES (v_mine,  '50000000-0000-4000-8000-000000000001', 'Dono',    '', 'dono@sec.test',    v_uid),
         (v_other, '50000000-0000-4000-8000-000000000001', 'Terceiro','', 'outro@sec.test',   NULL)
  ON CONFLICT (id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;

  -- Guest (no auth.uid) keeps the old capability-by-uuid behaviour.
  PERFORM set_config('app.uid', '', true);
  SELECT count(*) INTO v_guest FROM public.shop_list_orders(v_other);

  -- Signed in as v_uid, reading someone else's history must be refused...
  PERFORM set_config('app.uid', v_uid::text, true);
  BEGIN
    PERFORM public.shop_list_orders(v_other);
    v_state := 'no-error';
  EXCEPTION WHEN insufficient_privilege THEN
    v_state := SQLSTATE;
  END;

  -- ...while their own still works.
  SELECT count(*) INTO v_own FROM public.shop_list_orders(v_mine);
  PERFORM set_config('app.uid', '', true);

  IF v_state = '42501' AND v_guest >= 0 AND v_own >= 0 THEN
    RAISE NOTICE 'PASS S7: outsider refused (42501), own history readable, guest path intact';
  ELSE
    RAISE NOTICE 'FAIL S7: sqlstate=% guest=% own=%', v_state, v_guest, v_own;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- S8/S9 (0020) — an anonymous catalogue read must declare its store
-- ---------------------------------------------------------------------------
\echo --- S8 opted-in tenant is invisible to a caller that declares nothing
UPDATE public.tenants SET storefront_strict_scope = true
 WHERE id = '50000000-0000-4000-8000-000000000001';

SET ROLE anon;
SET request.headers = '{}';
SELECT CASE WHEN count(*) = 0
            THEN 'PASS S8: undeclared caller sees no scoped product'
            ELSE 'FAIL S8: undeclared caller still read ' || count(*) || ' row(s)' END
  FROM public.plg_shop_products WHERE slug = 'sec-prod-live';
RESET ROLE;

\echo --- S9 declaring the store brings it back, and only it
SET ROLE anon;
SET request.headers = '{"x-fayz-store":"50000000-0000-4000-8000-000000000001"}';
SELECT CASE WHEN count(*) = 1
            THEN 'PASS S9: declared store is readable again'
            ELSE 'FAIL S9: declared store returned ' || count(*) || ' row(s)' END
  FROM public.plg_shop_products WHERE slug = 'sec-prod-live';
RESET ROLE;

\echo --- S9b declaring SOMEONE ELSE does not grant access
SET ROLE anon;
SET request.headers = '{"x-fayz-store":"50000000-0000-4000-8000-000000000002"}';
SELECT CASE WHEN count(*) = 0
            THEN 'PASS S9b: declaring another store grants nothing'
            ELSE 'FAIL S9b: cross-store read returned ' || count(*) || ' row(s)' END
  FROM public.plg_shop_products WHERE slug = 'sec-prod-live';
RESET ROLE;
RESET request.headers;
