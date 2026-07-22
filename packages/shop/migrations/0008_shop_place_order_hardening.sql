-- ============================================================================
-- @fayz-ai/shop — trust hardening for shop_place_order + shop_get_order
-- ----------------------------------------------------------------------------
-- Three defects, all reachable from an anonymous browser:
--
--   1. Duplicate line items double-spent the same stock. The validation loop
--      and the insert loop iterate p_items independently, so two entries with
--      the same product_id each checked `inventory_count >= qty` against the
--      SAME pre-decrement value and both passed. inventory_count could go
--      negative. Fixed by aggregating p_items by (product_id, options_label)
--      once, up front, and driving both phases off that aggregate.
--
--   2. p_customer_id was taken verbatim (0003:30) — only consulted when NULL.
--      An anonymous caller could attach an order to ANY customer uuid, in any
--      tenant. Combined with plg_shop_orders_customer_read, that is a way to
--      push rows into someone else's order history. Now an explicitly supplied
--      customer id must belong to the tenant AND be owned by the caller (either
--      auth.uid() matches, or the row is unlinked and the email matches).
--
--   3. shop_get_order returned to_jsonb(o.*) despite its own comment promising
--      whitelisted columns — leaking tenant_id, customer_id and customer_email
--      to anyone holding the order uuid. Now an explicit column list.
--
-- Behaviour change worth knowing: two cart lines of the SAME product with the
-- same options_label now collapse into ONE order item with the summed quantity
-- (previously two rows). Totals and stock are unchanged; only the item row
-- count differs. Different options_label values still produce separate lines.
--
-- NOT fixed here, on purpose: p_shipping_total is still trusted from the client.
-- Validating it needs server-side shipping rates (flat rate + free-above
-- threshold currently live in each app's TypeScript config, not in the
-- database). That lands with the shipping-zones/tenant-settings migration.
--
-- Idempotent: CREATE OR REPLACE + a NOT VALID check constraint guarded by a
-- catalog lookup, so re-running is safe and pre-existing negative stock (if any)
-- does not block the migration.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.shop_place_order(
  p_tenant_id      uuid,
  p_items          jsonb,
  p_customer_id    uuid    DEFAULT NULL,
  p_customer_name  text    DEFAULT NULL,
  p_customer_email text    DEFAULT NULL,
  p_currency       text    DEFAULT 'BRL',
  p_discount_code  text    DEFAULT NULL,
  p_shipping_total numeric DEFAULT 0,
  p_notes          text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid          := NULL;
  v_order_id    uuid;
  v_lines       jsonb;
  v_line        record;
  v_product     public.plg_shop_products%ROWTYPE;
  v_disc        public.plg_shop_discounts%ROWTYPE;
  v_subtotal    numeric(12,2) := 0;
  v_discount    numeric(12,2) := 0;
  v_shipping    numeric(12,2) := GREATEST(COALESCE(p_shipping_total, 0), 0);
  v_total       numeric(12,2);
  v_applied     text          := NULL;
  v_email       text          := NULLIF(lower(trim(p_customer_email)), '');
  v_now         timestamptz   := now();
  v_owner       uuid;
  v_owner_email text;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'shop_place_order: no items' USING ERRCODE = '22023';
  END IF;

  -- (2) An explicitly supplied customer id must be provable. Anything else is
  -- resolved from the email below, exactly as before.
  IF p_customer_id IS NOT NULL THEN
    SELECT auth_user_id, lower(email) INTO v_owner, v_owner_email
      FROM public.plg_shop_customers
      WHERE id = p_customer_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'shop_place_order: customer does not belong to this store'
        USING ERRCODE = '42501';
    END IF;

    IF v_owner IS NOT NULL AND v_owner IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'shop_place_order: customer belongs to another account'
        USING ERRCODE = '42501';
    END IF;

    IF v_owner IS NULL AND v_email IS NOT NULL AND v_owner_email IS DISTINCT FROM v_email THEN
      RAISE EXCEPTION 'shop_place_order: customer email mismatch'
        USING ERRCODE = '42501';
    END IF;

    v_customer_id := p_customer_id;
  END IF;

  -- Resolve / create the customer (find-or-create by tenant + email), linking
  -- auth.uid when the shopper is authenticated so order reads are RLS-scoped.
  IF v_customer_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_customer_id
      FROM public.plg_shop_customers
      WHERE tenant_id = p_tenant_id AND lower(email) = v_email
      LIMIT 1;
    IF v_customer_id IS NULL THEN
      INSERT INTO public.plg_shop_customers (tenant_id, first_name, last_name, email, auth_user_id)
      VALUES (p_tenant_id, COALESCE(NULLIF(trim(p_customer_name), ''), v_email), '', v_email, auth.uid())
      RETURNING id INTO v_customer_id;
    ELSIF auth.uid() IS NOT NULL THEN
      UPDATE public.plg_shop_customers SET auth_user_id = auth.uid()
        WHERE id = v_customer_id AND auth_user_id IS NULL;
    END IF;
  END IF;

  -- (1) Collapse the payload into one row per (product, options_label) BEFORE
  -- validating, so the stock check and the decrement see the same quantities.
  -- Kept as a jsonb aggregate in a local variable rather than a temp table: a
  -- SECURITY DEFINER function can be called more than once per transaction, and
  -- a session-scoped temp table would collide with itself on the second call.
  SELECT COALESCE(jsonb_agg(line), '[]'::jsonb) INTO v_lines
  FROM (
    SELECT jsonb_build_object(
             'product_id', (value->>'product_id')::uuid,
             'options_label', NULLIF(value->>'options_label', ''),
             'quantity', SUM(GREATEST(COALESCE((value->>'quantity')::int, 0), 0))::int
           ) AS line
    FROM jsonb_array_elements(p_items) AS value
    GROUP BY (value->>'product_id')::uuid, NULLIF(value->>'options_label', '')
    HAVING SUM(GREATEST(COALESCE((value->>'quantity')::int, 0), 0)) > 0
  ) grouped;

  IF jsonb_array_length(v_lines) = 0 THEN
    RAISE EXCEPTION 'shop_place_order: no items with a positive quantity' USING ERRCODE = '22023';
  END IF;

  -- Validate against the total quantity requested per product, across labels.
  FOR v_line IN
    SELECT (l->>'product_id')::uuid AS product_id,
           SUM((l->>'quantity')::int)::int AS quantity
      FROM jsonb_array_elements(v_lines) AS l
     GROUP BY 1
  LOOP
    SELECT * INTO v_product
      FROM public.plg_shop_products
      WHERE id = v_line.product_id AND tenant_id = p_tenant_id
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'shop_place_order: product % not found', v_line.product_id USING ERRCODE = '23503';
    END IF;
    IF v_product.status <> 'active' THEN
      RAISE EXCEPTION 'shop_place_order: product % is not active', v_product.id USING ERRCODE = '22023';
    END IF;
    IF v_product.inventory_count < v_line.quantity THEN
      RAISE EXCEPTION 'shop_place_order: insufficient stock for %', v_product.name USING ERRCODE = '23514';
    END IF;
    v_subtotal := v_subtotal + (v_product.price * v_line.quantity);
  END LOOP;

  v_subtotal := round(v_subtotal, 2);

  -- Validate + apply the discount server-side (also under a row lock).
  IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
    SELECT * INTO v_disc
      FROM public.plg_shop_discounts
      WHERE tenant_id = p_tenant_id AND lower(code) = lower(trim(p_discount_code))
      FOR UPDATE;
    IF FOUND
       AND v_disc.status = 'active'
       AND v_disc.starts_at <= v_now
       AND (v_disc.ends_at IS NULL OR v_disc.ends_at >= v_now)
       AND (v_disc.usage_limit IS NULL OR v_disc.times_used < v_disc.usage_limit)
       AND (NOT v_disc.once_per_customer OR v_customer_id IS NULL OR NOT EXISTS (
             SELECT 1 FROM public.plg_shop_orders o
             WHERE o.tenant_id = p_tenant_id
               AND o.customer_id = v_customer_id
               AND lower(o.discount_code) = lower(v_disc.code)))
    THEN
      v_applied := v_disc.code;
      IF v_disc.type = 'percentage' THEN
        v_discount := round(v_subtotal * v_disc.value / 100.0, 2);
      ELSIF v_disc.type = 'fixed_amount' THEN
        v_discount := LEAST(v_disc.value, v_subtotal);
      ELSIF v_disc.type = 'free_shipping' THEN
        v_shipping := 0;
      END IF;
      -- buy_x_get_y is not supported in v1: code recorded, no monetary effect.
      UPDATE public.plg_shop_discounts SET times_used = times_used + 1 WHERE id = v_disc.id;
    END IF;
  END IF;

  v_discount := LEAST(GREATEST(v_discount, 0), v_subtotal);
  v_total := GREATEST(round(v_subtotal - v_discount + v_shipping, 2), 0);

  INSERT INTO public.plg_shop_orders (
    tenant_id, status, financial_status, fulfillment_status, currency,
    subtotal, tax_total, discount_total, shipping_total, total,
    customer_id, customer_name, customer_email, discount_code, notes
  ) VALUES (
    p_tenant_id, 'open', 'pending', 'unfulfilled', COALESCE(p_currency, 'BRL'),
    v_subtotal, 0, v_discount, v_shipping, v_total,
    v_customer_id, NULLIF(trim(COALESCE(p_customer_name, '')), ''), v_email, v_applied, p_notes
  )
  RETURNING id INTO v_order_id;

  -- One item row per (product, label); one decrement per product.
  FOR v_line IN
    SELECT (l->>'product_id')::uuid AS product_id,
           l->>'options_label'      AS options_label,
           (l->>'quantity')::int    AS quantity
      FROM jsonb_array_elements(v_lines) AS l
  LOOP
    SELECT * INTO v_product
      FROM public.plg_shop_products
      WHERE id = v_line.product_id AND tenant_id = p_tenant_id;

    INSERT INTO public.plg_shop_order_items (order_id, product_id, name, sku, quantity, unit_price, total, image_url)
    VALUES (
      v_order_id,
      v_product.id,
      CASE WHEN v_line.options_label IS NULL
        THEN v_product.name
        ELSE v_product.name || ' (' || v_line.options_label || ')' END,
      v_product.sku,
      v_line.quantity,
      v_product.price,
      round(v_product.price * v_line.quantity, 2),
      (SELECT url FROM public.plg_shop_product_images
         WHERE product_id = v_product.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1)
    );
  END LOOP;

  UPDATE public.plg_shop_products p
     SET inventory_count = p.inventory_count - agg.quantity
    FROM (SELECT (l->>'product_id')::uuid AS product_id,
                 SUM((l->>'quantity')::int)::int AS quantity
            FROM jsonb_array_elements(v_lines) AS l
           GROUP BY 1) agg
   WHERE p.id = agg.product_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shop_place_order(uuid, jsonb, uuid, text, text, text, text, numeric, text)
  TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- (1b) Belt and braces: the database itself refuses negative stock from now on.
-- NOT VALID so any row already negative does not block the migration; new and
-- updated rows are checked.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plg_shop_products_inventory_non_negative'
      AND conrelid = 'public.plg_shop_products'::regclass
  ) THEN
    ALTER TABLE public.plg_shop_products
      ADD CONSTRAINT plg_shop_products_inventory_non_negative
      CHECK (inventory_count >= 0) NOT VALID;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- (3) shop_get_order: the whitelist its comment always claimed.
-- The order uuid remains the capability; what that capability exposes is now
-- limited to what the confirmation page actually renders.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_get_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'financial_status', o.financial_status,
    'fulfillment_status', o.fulfillment_status,
    'currency', o.currency,
    'subtotal', o.subtotal,
    'tax_total', o.tax_total,
    'discount_total', o.discount_total,
    'shipping_total', o.shipping_total,
    'total', o.total,
    'discount_code', o.discount_code,
    'customer_name', o.customer_name,
    'created_at', o.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'product_id', i.product_id,
        'name', i.name,
        'sku', i.sku,
        'quantity', i.quantity,
        'unit_price', i.unit_price,
        'total', i.total,
        'image_url', i.image_url
      ) ORDER BY i.created_at)
      FROM public.plg_shop_order_items i
      WHERE i.order_id = o.id
    ), '[]'::jsonb)
  )
  FROM public.plg_shop_orders o
  WHERE o.id = p_order_id;
$$;

REVOKE ALL ON FUNCTION public.shop_get_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_get_order(uuid) TO anon, authenticated, service_role;
