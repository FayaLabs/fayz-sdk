-- ============================================================================
-- @fayz-ai/shop — the server decides the shipping cost
-- ----------------------------------------------------------------------------
-- shop_place_order has always taken p_shipping_total from the client and only
-- clamped it to >= 0. Every other money input is recomputed server-side —
-- prices, discounts, totals — and this one was the hole left open, documented
-- in 0008 as "needs a rates table first".
--
-- It is not theoretical. In the QA tenant a probe sending an inflated freight
-- produced 14 orders worth R$ 13,999,986 of invented shipping, which then
-- flowed into the SaaS revenue figures — the same path a real buyer could use
-- to send shipping = 0 and make the merchant absorb the freight.
--
-- Rates live in public.shipping_settings (core, tenant-scoped) because a store's
-- delivery policy is not a plugin's private data: fulfilment, financial and the
-- storefront all need to agree on it.
--
-- The client value is now IGNORED, not validated: accepting it "when it matches"
-- would keep a code path where the client's number wins.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipping_settings (
  tenant_id   uuid PRIMARY KEY,
  flat_rate   numeric(12,2) NOT NULL DEFAULT 0,
  -- Order subtotal (after discount) at or above which delivery is free.
  free_above  numeric(12,2),
  currency    text NOT NULL DEFAULT 'BRL',
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_settings_member_all ON public.shipping_settings;
CREATE POLICY shipping_settings_member_all ON public.shipping_settings
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- The storefront needs to SHOW the rate before checkout, so anon may read it.
-- There is nothing sensitive here: it is the same policy printed on the site.
DROP POLICY IF EXISTS shipping_settings_public_read ON public.shipping_settings;
CREATE POLICY shipping_settings_public_read ON public.shipping_settings
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.shipping_settings TO anon, authenticated;
GRANT ALL ON public.shipping_settings TO authenticated, service_role;

-- Seed from what each storefront config already declares, so behaviour does not
-- change on the day this ships. A tenant with no row keeps free shipping, which
-- is the safe default: charging a freight nobody configured would be worse.
INSERT INTO public.shipping_settings (tenant_id, flat_rate, free_above) VALUES
  ('10000000-0000-4000-8000-000000000104', 8.00, 150.00),    -- Artorius Steakhouse
  ('10000000-0000-4000-8000-0000000001ff', 8.00, 150.00),    -- Artorius QA
  ('10000000-0000-4000-8000-000000000102', 29.90, 500.00),   -- PULSE
  ('10000000-0000-4000-8000-0000000002ff', 29.90, 500.00)    -- PULSE QA
ON CONFLICT (tenant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.shop_shipping_for(p_tenant_id uuid, p_subtotal numeric)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
           WHEN s.free_above IS NOT NULL AND p_subtotal >= s.free_above THEN 0::numeric
           ELSE COALESCE(s.flat_rate, 0)
         END
    FROM public.shipping_settings s
   WHERE s.tenant_id = p_tenant_id;
$$;

GRANT EXECUTE ON FUNCTION public.shop_shipping_for(uuid, numeric) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- shop_place_order re-emitted with server-side shipping. Full body rather than
-- a patch, for the reason stated in 0014.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_place_order(
  p_tenant_id        uuid,
  p_items            jsonb,
  p_customer_id      uuid    DEFAULT NULL,
  p_customer_name    text    DEFAULT NULL,
  p_customer_email   text    DEFAULT NULL,
  p_currency         text    DEFAULT 'BRL',
  p_discount_code    text    DEFAULT NULL,
  p_shipping_total   numeric DEFAULT 0,
  p_notes            text    DEFAULT NULL,
  p_shipping_address jsonb   DEFAULT NULL,
  p_payment_method   text    DEFAULT NULL
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
  -- p_shipping_total is accepted for signature compatibility and DELIBERATELY
  -- ignored: the rate comes from shipping_settings. See 0015.
  v_shipping    numeric(12,2) := 0;
  v_total       numeric(12,2);
  v_applied     text          := NULL;
  v_email       text          := NULLIF(lower(trim(p_customer_email)), '');
  v_now         timestamptz   := now();
  v_owner       uuid;
  v_owner_email text;
  v_addr_id     uuid          := NULL;
  v_method      text          := NULLIF(lower(trim(p_payment_method)), '');
  v_free_shipping boolean     := false;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'shop_place_order: no items' USING ERRCODE = '22023';
  END IF;

  IF v_method IS NOT NULL
     AND v_method NOT IN ('pix','credit_card','debit_card','boleto','cash','other') THEN
    RAISE EXCEPTION 'shop_place_order: unknown payment method %', v_method USING ERRCODE = '22023';
  END IF;

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
        v_free_shipping := true;
      END IF;
      UPDATE public.plg_shop_discounts SET times_used = times_used + 1 WHERE id = v_disc.id;
    END IF;
  END IF;

  v_discount := LEAST(GREATEST(v_discount, 0), v_subtotal);

  -- Shipping is computed here, from the store's own settings, against the
  -- post-discount subtotal — a coupon that drops the order below the
  -- free-delivery threshold must not keep free delivery.
  -- A free_shipping discount still wins (it set v_free_shipping above).
  IF NOT v_free_shipping THEN
    v_shipping := COALESCE(public.shop_shipping_for(p_tenant_id, v_subtotal - v_discount), 0);
  END IF;

  v_total := GREATEST(round(v_subtotal - v_discount + v_shipping, 2), 0);

  -- Address book: only for an identified customer, and only when the payload
  -- carries the minimum a courier needs. Deduplicated so repeat orders to the
  -- same place reuse the row instead of stacking copies.
  IF v_customer_id IS NOT NULL
     AND p_shipping_address IS NOT NULL
     AND COALESCE(p_shipping_address->>'postal_code','') <> ''
     AND COALESCE(p_shipping_address->>'street','') <> '' THEN

    SELECT id INTO v_addr_id
      FROM public.addresses
     WHERE owner_type = 'shop_customer' AND owner_id = v_customer_id
       AND postal_code = p_shipping_address->>'postal_code'
       AND COALESCE(number, '') = COALESCE(p_shipping_address->>'number', '')
       AND COALESCE(complement, '') = COALESCE(p_shipping_address->>'complement', '')
     LIMIT 1;

    IF v_addr_id IS NULL THEN
      INSERT INTO public.addresses (
        tenant_id, owner_type, owner_id, label, recipient, phone, postal_code, street,
        number, complement, district, city, state, country, is_default
      ) VALUES (
        p_tenant_id, 'shop_customer', v_customer_id,
        NULLIF(p_shipping_address->>'label',''),
        NULLIF(p_shipping_address->>'recipient',''),
        NULLIF(p_shipping_address->>'phone',''),
        p_shipping_address->>'postal_code',
        p_shipping_address->>'street',
        NULLIF(p_shipping_address->>'number',''),
        NULLIF(p_shipping_address->>'complement',''),
        NULLIF(p_shipping_address->>'district',''),
        COALESCE(NULLIF(p_shipping_address->>'city',''), '—'),
        COALESCE(NULLIF(p_shipping_address->>'state',''), '—'),
        COALESCE(NULLIF(p_shipping_address->>'country',''), 'BR'),
        -- First address on file becomes the default.
        NOT EXISTS (SELECT 1 FROM public.addresses
                     WHERE owner_type = 'shop_customer' AND owner_id = v_customer_id)
      )
      RETURNING id INTO v_addr_id;
    END IF;
  END IF;

  INSERT INTO public.plg_shop_orders (
    tenant_id, status, financial_status, fulfillment_status, currency,
    subtotal, tax_total, discount_total, shipping_total, total,
    customer_id, customer_name, customer_email, discount_code, notes,
    shipping_address_id, shipping_address, payment_method_kind
  ) VALUES (
    p_tenant_id, 'open', 'pending', 'unfulfilled', COALESCE(p_currency, 'BRL'),
    v_subtotal, 0, v_discount, v_shipping, v_total,
    v_customer_id, NULLIF(trim(COALESCE(p_customer_name, '')), ''), v_email, v_applied, p_notes,
    v_addr_id, p_shipping_address, v_method
  )
  RETURNING id INTO v_order_id;

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

  -- Open the payment ledger entry. It is `pending` until a gateway (or the dev
  -- confirm path) settles it — that transition is shop_confirm_payment's job.
  -- Ledger row in the CORE transactions table (kind='shop_payment'), not in a
  -- plugin copy of it. order_id stays null until plg_shop_orders is folded into
  -- public.orders — the FK points at core orders, which this row is not yet.
  IF v_method IS NOT NULL THEN
    INSERT INTO public.transactions (
      tenant_id, kind, order_id, amount, currency, payment_method, status, metadata
    ) VALUES (
      p_tenant_id, 'shop_payment',
      -- Only link when the core order exists. A tenant skipped by 0013 (no
      -- `tenants` row) has none, and the FK would otherwise abort the checkout.
      (SELECT o.id FROM public.orders o WHERE o.id = v_order_id),
      v_total, COALESCE(p_currency, 'BRL'), v_method, 'pending',
      jsonb_build_object('shop_order_id', v_order_id)
    );
  END IF;

  RETURN v_order_id;
END;
$$;


GRANT EXECUTE ON FUNCTION public.shop_place_order(uuid, jsonb, uuid, text, text, text, text, numeric, text, jsonb, text)
  TO anon, authenticated;
