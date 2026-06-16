-- ============================================================================
-- @fayz-ai/shop — server-trust order placement
-- ----------------------------------------------------------------------------
-- shop_place_order(...) is the ONLY trusted path to create a storefront order.
-- In a single transaction it: re-reads product price + stock from the catalog
-- (never trusts a client-supplied price), validates the discount, computes the
-- totals, inserts the order + items, decrements inventory, and increments
-- discount usage. SECURITY DEFINER so anonymous shoppers can check out without
-- any direct INSERT grant on the shop tables (there is intentionally no anon
-- write policy — placement only happens through this function).
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
  v_customer_id uuid          := p_customer_id;
  v_order_id    uuid;
  v_item        jsonb;
  v_product     public.shop_products%ROWTYPE;
  v_disc        public.shop_discounts%ROWTYPE;
  v_qty         integer;
  v_label       text;
  v_name        text;
  v_subtotal    numeric(12,2) := 0;
  v_discount    numeric(12,2) := 0;
  v_shipping    numeric(12,2) := GREATEST(COALESCE(p_shipping_total, 0), 0);
  v_total       numeric(12,2);
  v_applied     text          := NULL;
  v_email       text          := NULLIF(lower(trim(p_customer_email)), '');
  v_now         timestamptz   := now();
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'shop_place_order: no items' USING ERRCODE = '22023';
  END IF;

  -- Resolve / create the customer (find-or-create by tenant + email), linking
  -- auth.uid when the shopper is authenticated so order reads are RLS-scoped.
  IF v_customer_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_customer_id
      FROM public.shop_customers
      WHERE tenant_id = p_tenant_id AND lower(email) = v_email
      LIMIT 1;
    IF v_customer_id IS NULL THEN
      INSERT INTO public.shop_customers (tenant_id, first_name, last_name, email, auth_user_id)
      VALUES (p_tenant_id, COALESCE(NULLIF(trim(p_customer_name), ''), v_email), '', v_email, auth.uid())
      RETURNING id INTO v_customer_id;
    ELSIF auth.uid() IS NOT NULL THEN
      UPDATE public.shop_customers SET auth_user_id = auth.uid()
        WHERE id = v_customer_id AND auth_user_id IS NULL;
    END IF;
  END IF;

  -- Items: re-read price + stock under a row lock (held until commit).
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS value
  LOOP
    v_qty := GREATEST(COALESCE((v_item->>'quantity')::int, 0), 0);
    CONTINUE WHEN v_qty = 0;

    SELECT * INTO v_product
      FROM public.shop_products
      WHERE id = (v_item->>'product_id')::uuid AND tenant_id = p_tenant_id
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'shop_place_order: product % not found', v_item->>'product_id' USING ERRCODE = '23503';
    END IF;
    IF v_product.status <> 'active' THEN
      RAISE EXCEPTION 'shop_place_order: product % is not active', v_product.id USING ERRCODE = '22023';
    END IF;
    IF v_product.inventory_count < v_qty THEN
      RAISE EXCEPTION 'shop_place_order: insufficient stock for %', v_product.name USING ERRCODE = '23514';
    END IF;
    v_subtotal := v_subtotal + (v_product.price * v_qty);
  END LOOP;

  v_subtotal := round(v_subtotal, 2);

  -- Validate + apply the discount server-side (also under a row lock).
  IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
    SELECT * INTO v_disc
      FROM public.shop_discounts
      WHERE tenant_id = p_tenant_id AND lower(code) = lower(trim(p_discount_code))
      FOR UPDATE;
    IF FOUND
       AND v_disc.status = 'active'
       AND v_disc.starts_at <= v_now
       AND (v_disc.ends_at IS NULL OR v_disc.ends_at >= v_now)
       AND (v_disc.usage_limit IS NULL OR v_disc.times_used < v_disc.usage_limit)
       AND (NOT v_disc.once_per_customer OR v_customer_id IS NULL OR NOT EXISTS (
             SELECT 1 FROM public.shop_orders o
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
      UPDATE public.shop_discounts SET times_used = times_used + 1 WHERE id = v_disc.id;
    END IF;
  END IF;

  v_discount := LEAST(GREATEST(v_discount, 0), v_subtotal);
  v_total := GREATEST(round(v_subtotal - v_discount + v_shipping, 2), 0);

  -- Create the order (financial_status pending until payment confirms).
  INSERT INTO public.shop_orders (
    tenant_id, status, financial_status, fulfillment_status, currency,
    subtotal, tax_total, discount_total, shipping_total, total,
    customer_id, customer_name, customer_email, discount_code, notes
  ) VALUES (
    p_tenant_id, 'open', 'pending', 'unfulfilled', COALESCE(p_currency, 'BRL'),
    v_subtotal, 0, v_discount, v_shipping, v_total,
    v_customer_id, NULLIF(trim(COALESCE(p_customer_name, '')), ''), v_email, v_applied, p_notes
  )
  RETURNING id INTO v_order_id;

  -- Insert items at server prices + decrement inventory.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS value
  LOOP
    v_qty := GREATEST(COALESCE((v_item->>'quantity')::int, 0), 0);
    CONTINUE WHEN v_qty = 0;

    SELECT * INTO v_product
      FROM public.shop_products
      WHERE id = (v_item->>'product_id')::uuid AND tenant_id = p_tenant_id;
    v_label := NULLIF(v_item->>'options_label', '');
    v_name := CASE WHEN v_label IS NULL THEN v_product.name ELSE v_product.name || ' (' || v_label || ')' END;

    INSERT INTO public.shop_order_items (order_id, product_id, name, sku, quantity, unit_price, total, image_url)
    VALUES (
      v_order_id, v_product.id, v_name, v_product.sku, v_qty, v_product.price, round(v_product.price * v_qty, 2),
      (SELECT url FROM public.shop_product_images
         WHERE product_id = v_product.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1)
    );

    UPDATE public.shop_products
      SET inventory_count = inventory_count - v_qty
      WHERE id = v_product.id;
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- Guest checkout: anonymous and authenticated shoppers may place orders only
-- through this function (which enforces all trust rules). They still have no
-- direct INSERT/UPDATE grant on the shop tables.
GRANT EXECUTE ON FUNCTION public.shop_place_order(uuid, jsonb, uuid, text, text, text, text, numeric, text)
  TO anon, authenticated;
