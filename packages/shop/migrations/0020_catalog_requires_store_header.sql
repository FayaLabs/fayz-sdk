-- ============================================================================
-- An anonymous catalogue read must say WHICH store it is for
-- ----------------------------------------------------------------------------
-- 0019 stopped an unpublished merchant from being readable, but it did not stop
-- enumeration: one request with the publishable key still returned every active
-- product of all seven live tenants at once. Tenant isolation was still being
-- done in the browser (the SDK appends tenant_id=eq.<store>), which is not
-- isolation — it is a convention the client can simply omit.
--
-- RLS cannot force a client to include a WHERE clause, so the store id moves
-- into a request header the policy can actually read. PostgREST exposes the
-- request headers as a GUC, so the rule becomes: rows are visible only when the
-- caller declared this store. Bulk enumeration stops being expressible.
--
-- ROLLOUT — this is why the rule is per-tenant and defaults to OFF:
--   a storefront running an older @fayz-ai/sdk build does not send the header,
--   and switching every tenant on at once would empty the catalogue of every
--   store that has not been redeployed. Enabling it is therefore an explicit
--   act, done per store once its build is known to send the header.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS storefront_strict_scope boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.storefront_strict_scope IS
  'Anonymous catalogue reads for this tenant must carry the x-fayz-store header '
  'naming it. Turn on only after the storefront build that sends the header is '
  'deployed, otherwise the catalogue reads as empty.';

CREATE OR REPLACE FUNCTION public.storefront_strict_tenants()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.tenants WHERE storefront_strict_scope;
$$;

GRANT EXECUTE ON FUNCTION public.storefront_strict_tenants() TO anon, authenticated, service_role;

-- The store the caller declared, or NULL when it declared none. Wrapped in a
-- function so the (slightly awkward) GUC parse lives in one place and the three
-- policies below stay readable.
CREATE OR REPLACE FUNCTION public.storefront_requested_store()
RETURNS uuid
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v text;
BEGIN
  v := NULLIF(current_setting('request.headers', true), '')::json ->> 'x-fayz-store';
  RETURN NULLIF(v, '')::uuid;
EXCEPTION WHEN OTHERS THEN
  -- A malformed header must read as "declared nothing", never as an error that
  -- would surface to the shopper as a broken catalogue.
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.storefront_requested_store() TO anon, authenticated, service_role;

-- `scoped` is the whole rule: a tenant that opted in is visible only to a caller
-- that named it; a tenant that has not opted in behaves exactly as it did after
-- 0019, so no live store changes behaviour until it is switched on.
DROP POLICY IF EXISTS storefront_public_read ON public.plg_shop_products;
CREATE POLICY storefront_public_read ON public.plg_shop_products
  FOR SELECT TO anon, authenticated
  USING (status = 'active'
         AND tenant_id IN (SELECT public.storefront_published_tenants())
         AND (tenant_id NOT IN (SELECT public.storefront_strict_tenants())
              OR tenant_id = public.storefront_requested_store()));

DROP POLICY IF EXISTS storefront_public_read ON public.plg_shop_categories;
CREATE POLICY storefront_public_read ON public.plg_shop_categories
  FOR SELECT TO anon, authenticated
  USING (tenant_id IN (SELECT public.storefront_published_tenants())
         AND (tenant_id NOT IN (SELECT public.storefront_strict_tenants())
              OR tenant_id = public.storefront_requested_store()));

DROP POLICY IF EXISTS storefront_public_read ON public.plg_shop_product_images;
CREATE POLICY storefront_public_read ON public.plg_shop_product_images
  FOR SELECT TO anon, authenticated
  USING (product_id IN (
    SELECT p.id FROM public.plg_shop_products p
     WHERE p.status = 'active'
       AND p.tenant_id IN (SELECT public.storefront_published_tenants())
       AND (p.tenant_id NOT IN (SELECT public.storefront_strict_tenants())
            OR p.tenant_id = public.storefront_requested_store())));
