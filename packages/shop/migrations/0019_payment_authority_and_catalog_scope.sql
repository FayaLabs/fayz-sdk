-- ============================================================================
-- Who may declare an order paid, and whose catalogue an anonymous key may read
-- ----------------------------------------------------------------------------
-- Two holes that only matter once a real store is live, and then matter a lot.
--
-- 1. shop_confirm_payment was GRANT EXECUTE TO anon. The publishable key ships
--    inside the browser bundle, so the pair (key, order uuid) — both of which a
--    buyer holds after checking out — was enough to flip their own order to
--    'paid'. The RPC is SECURITY DEFINER, so RLS never got a say. Payment
--    confirmation is an assertion about money that arrived; only the party that
--    can observe the money may make it: the PSP webhook (service_role) or a
--    member of the tenant that owns the order.
--
-- 2. The anon read policies were not tenant-scoped, and the pool holds eight
--    merchants. plg_shop_categories was the worst of them — USING (true),
--    literally every category of every tenant. Worse, each table carries TWO
--    permissive public-read policies (plg_shop_* and shop_*, left over from the
--    0000 rename). Permissive policies OR together, so tightening one of the
--    pair changes nothing; both have to go. That is why this migration drops
--    rather than replaces.
--
-- The replacement gates on tenants.storefront_published, so a merchant being
-- onboarded is invisible until they launch — today every catalogue in the pool
-- is world-readable from the moment the first product is saved.
--
-- Idempotent. No data is destroyed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Payment confirmation authority
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_confirm_payment(
  p_order_id uuid,
  p_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  jsonb;
  v_tenant uuid;
  v_role   text;
  v_now    timestamptz := now();
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.plg_shop_orders WHERE id = p_order_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  -- The role claim PostgREST puts on the request; empty on a direct connection.
  --
  -- No escape hatch for superusers here: inside a SECURITY DEFINER function
  -- current_user is the function OWNER, so testing it would have granted
  -- everyone the owner's authority. Anyone with a direct connection can UPDATE
  -- the row themselves and does not need this RPC.
  v_role := COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    '');

  IF v_role <> 'service_role'
     AND v_tenant NOT IN (SELECT public.user_tenant_ids())
  THEN
    -- Deliberately the same message whether the order exists or not would be
    -- better still, but the not-found branch above already leaked that, and
    -- order ids are not secrets — the payment authority is what had to move.
    RAISE EXCEPTION 'not authorized to confirm payment for this order'
      USING ERRCODE = '42501';
  END IF;

  -- Everything below this line is 0014's body, unchanged. Only the authority
  -- check above is new: an earlier draft of this migration rebuilt the function
  -- from 0006b and silently dropped the ledger close, which the A4 regression
  -- caught. A CREATE OR REPLACE must start from the CURRENT definition.
  UPDATE public.plg_shop_orders
     SET financial_status = 'paid', paid_at = v_now
   WHERE id = p_order_id AND status = 'open' AND financial_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found or not pending' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.transactions
     SET status = 'paid',
         transacted_at = v_now,
         reference = COALESCE(reference, NULLIF(p_reference, '')),
         updated_at = v_now
   WHERE kind = 'shop_payment'
     AND status = 'pending'
     AND (order_id = p_order_id OR metadata->>'shop_order_id' = p_order_id::text);

  SELECT to_jsonb(o) INTO v_order FROM public.plg_shop_orders o WHERE o.id = p_order_id;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.shop_confirm_payment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shop_confirm_payment(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.shop_confirm_payment(uuid, text)
  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 1b. Order history belongs to its owner
--
-- shop_list_orders(p_customer_id) is SECURITY DEFINER and filtered only by the
-- id the caller passes, so holding any customer uuid listed that customer's
-- entire purchase history — addresses and totals included.
--
-- Guest checkout has no auth identity and must keep working, so the rule is:
-- once you ARE signed in, you may only read the customer linked to you. That
-- closes the case where a logged-in shopper probes for other ids, and leaves
-- the guest path exactly as capable as before (the uuid is a bearer secret,
-- like the order link e-mailed after checkout — noted, not solved here).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_list_orders(p_customer_id uuid, p_limit integer DEFAULT 50)
RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.plg_shop_customers c
     WHERE c.id = p_customer_id AND c.auth_user_id = v_uid)
  THEN
    RAISE EXCEPTION 'not authorized to read this order history'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT to_jsonb(o.*) || jsonb_build_object(
    'items',
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(i.*) ORDER BY i.created_at)
         FROM public.plg_shop_order_items i
        WHERE i.order_id = o.id),
      '[]'::jsonb))
    FROM public.plg_shop_orders o
   WHERE o.customer_id = p_customer_id
   ORDER BY o.created_at DESC
   LIMIT LEAST(GREATEST(p_limit, 1), 100);
END;
$$;

REVOKE ALL ON FUNCTION public.shop_list_orders(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_list_orders(uuid, integer)
  TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Storefront publication gate
-- ----------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS storefront_published boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.storefront_published IS
  'Anonymous (storefront) reads of this tenant''s catalogue are allowed. False '
  'while a merchant is being onboarded, so an unfinished catalogue is not '
  'world-readable through the publishable key.';

-- Backfill: anyone already selling stays selling. This migration must not take
-- a live storefront down, so publication is inferred from having shipped at
-- least one active product.
UPDATE public.tenants t
   SET storefront_published = true
 WHERE NOT t.storefront_published
   AND EXISTS (
     SELECT 1 FROM public.plg_shop_products p
      WHERE p.tenant_id = t.id AND p.status = 'active');

-- A tenant row is not guaranteed for every shop tenant (see 0009: the pool has
-- plg_shop_* rows whose tenant_id has no tenants row). Such a tenant has no way
-- to be published, and that is the correct default — it is not a real merchant.
CREATE OR REPLACE FUNCTION public.storefront_published_tenants()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.tenants WHERE storefront_published;
$$;

GRANT EXECUTE ON FUNCTION public.storefront_published_tenants() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Tenant-scoped anonymous catalogue reads
--
-- Both members of each duplicated pair are dropped and a single policy takes
-- their place, so the next person to read pg_policies sees one rule per concern
-- instead of guessing which of two is in force.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS plg_shop_products_public_read       ON public.plg_shop_products;
DROP POLICY IF EXISTS shop_products_public_read           ON public.plg_shop_products;
DROP POLICY IF EXISTS plg_shop_categories_public_read     ON public.plg_shop_categories;
DROP POLICY IF EXISTS shop_categories_public_read         ON public.plg_shop_categories;
DROP POLICY IF EXISTS plg_shop_product_images_public_read ON public.plg_shop_product_images;
DROP POLICY IF EXISTS shop_product_images_public_read     ON public.plg_shop_product_images;

-- …including the replacement itself, so replaying this file on a pool that has
-- already run it re-creates the rule instead of erroring on "already exists".
DROP POLICY IF EXISTS storefront_public_read ON public.plg_shop_products;
DROP POLICY IF EXISTS storefront_public_read ON public.plg_shop_categories;
DROP POLICY IF EXISTS storefront_public_read ON public.plg_shop_product_images;

CREATE POLICY storefront_public_read ON public.plg_shop_products
  FOR SELECT TO anon, authenticated
  USING (status = 'active'
         AND tenant_id IN (SELECT public.storefront_published_tenants()));

-- Categories were USING (true). A category is only public through the shop that
-- owns it, and only for a published one.
CREATE POLICY storefront_public_read ON public.plg_shop_categories
  FOR SELECT TO anon, authenticated
  USING (tenant_id IN (SELECT public.storefront_published_tenants()));

-- Images reach visibility through their product, which now carries the gate, so
-- this stays a join and cannot drift from the product rule.
CREATE POLICY storefront_public_read ON public.plg_shop_product_images
  FOR SELECT TO anon, authenticated
  USING (product_id IN (
    SELECT p.id FROM public.plg_shop_products p
     WHERE p.status = 'active'
       AND p.tenant_id IN (SELECT public.storefront_published_tenants())));
