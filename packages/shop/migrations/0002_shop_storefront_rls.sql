-- ============================================================================
-- @fayz-ai/shop — storefront RLS: public catalog reads + customer-scoped orders
-- ----------------------------------------------------------------------------
-- 0001 scopes everything to tenant members (admins). Storefront shoppers are
-- NOT tenant members, so they need:
--   1. anonymous read of the ACTIVE catalog (products/categories/images);
--   2. read of ONLY their own orders, tied to auth.uid via shop_customers;
--   3. a server-side find-or-create that links a customer to auth.uid.
-- There are intentionally NO anon write policies — order placement happens only
-- through the SECURITY DEFINER shop_place_order RPC.
-- ============================================================================

-- Link a customer to an authenticated user (nullable: guests have none).
ALTER TABLE public.shop_customers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS shop_customers_tenant_auth_user_idx
  ON public.shop_customers (tenant_id, auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 1. Public (anonymous + authenticated) read of the ACTIVE catalog only.
--    Never tenant-scoped for anon → no draft/other-tenant leakage. The admin
--    tenant policies from 0001 remain (Postgres ORs permissive policies), so
--    tenant members still see drafts.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS shop_products_public_read ON public.shop_products;
CREATE POLICY shop_products_public_read ON public.shop_products
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS shop_categories_public_read ON public.shop_categories;
CREATE POLICY shop_categories_public_read ON public.shop_categories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS shop_product_images_public_read ON public.shop_product_images;
CREATE POLICY shop_product_images_public_read ON public.shop_product_images
  FOR SELECT TO anon, authenticated
  USING (product_id IN (SELECT id FROM public.shop_products WHERE status = 'active'));

-- ----------------------------------------------------------------------------
-- 2. Customer-scoped reads: a shopper sees only their own customer row + orders.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS shop_customers_self_read ON public.shop_customers;
CREATE POLICY shop_customers_self_read ON public.shop_customers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS shop_orders_customer_read ON public.shop_orders;
CREATE POLICY shop_orders_customer_read ON public.shop_orders
  FOR SELECT TO authenticated
  USING (customer_id IN (
    SELECT id FROM public.shop_customers WHERE auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS shop_order_items_customer_read ON public.shop_order_items;
CREATE POLICY shop_order_items_customer_read ON public.shop_order_items
  FOR SELECT TO authenticated
  USING (order_id IN (
    SELECT o.id FROM public.shop_orders o
    JOIN public.shop_customers c ON c.id = o.customer_id
    WHERE c.auth_user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 3. Find-or-create a customer and link it to auth.uid, server-side. The browser
--    never supplies the auth id; guests (no JWT) get a customer with a NULL link.
--    SECURITY DEFINER so anon shoppers can resolve their customer without a
--    direct INSERT/SELECT grant on shop_customers.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_resolve_customer(
  p_tenant_id uuid,
  p_email     text,
  p_name      text DEFAULT NULL
)
RETURNS public.shop_customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := NULLIF(lower(trim(p_email)), '');
  v_uid   uuid := auth.uid();
  v_row   public.shop_customers;
BEGIN
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'shop_resolve_customer: email required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.shop_customers
    WHERE tenant_id = p_tenant_id AND lower(email) = v_email
    LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.shop_customers (tenant_id, first_name, last_name, email, auth_user_id)
    VALUES (p_tenant_id, COALESCE(NULLIF(trim(p_name), ''), v_email), '', v_email, v_uid)
    RETURNING * INTO v_row;
  ELSIF v_uid IS NOT NULL AND v_row.auth_user_id IS NULL THEN
    UPDATE public.shop_customers SET auth_user_id = v_uid
      WHERE id = v_row.id
      RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shop_resolve_customer(uuid, text, text) TO anon, authenticated;
