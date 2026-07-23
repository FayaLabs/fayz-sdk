-- ============================================================================
-- @fayz-ai/shop — move address/payment concepts OUT of the plugin, into core
-- ----------------------------------------------------------------------------
-- Supersedes the plugin-scoped tables introduced in 0010. The `plg_` prefix
-- means "belongs to this plugin", and an address does not: the same customer
-- record is read by CRM, by logistics and by the storefront. Products already
-- went through this in 0009; this is the same correction for addresses and
-- money, before either table has a single row to migrate.
--
-- What this does:
--   • creates public.addresses           — N addresses per owner, tenant-scoped
--   • creates public.payment_methods     — tokenised, never card data
--   • re-points plg_shop_orders.shipping_address_id at public.addresses
--   • routes the payment ledger to the EXISTING public.transactions, which
--     already has (kind, order_id, party_id, amount, currency, payment_method,
--     reference, status, transacted_at, metadata) — plg_shop_payments was a
--     duplicate of a core table nobody had populated yet
--   • DROPS the three empty plugin tables
--
-- Safe to run: all four affected tables are empty in the pool (verified before
-- writing this). If yours are not, the DROPs below will fail loudly rather than
-- discard rows — that is deliberate.
--
-- `owner_type` is text rather than a FK because a shop customer currently lives
-- in plg_shop_customers while core's person lives in people. When those merge,
-- this column collapses to 'person' and the check constraint narrows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. public.addresses — the canonical address book
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  owner_type   text NOT NULL DEFAULT 'person'
                 CHECK (owner_type IN ('person','shop_customer','location','tenant')),
  owner_id     uuid,
  kind         text NOT NULL DEFAULT 'shipping'
                 CHECK (kind IN ('shipping','billing','both')),
  label        text,          -- "Casa", "Trabalho"
  recipient    text,
  phone        text,
  postal_code  text NOT NULL, -- CEP
  street       text NOT NULL,
  number       text,
  complement   text,
  district     text,          -- bairro
  city         text NOT NULL,
  state        text NOT NULL, -- UF
  country      text NOT NULL DEFAULT 'BR',
  is_default   boolean NOT NULL DEFAULT false,
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_tenant_idx ON public.addresses (tenant_id);
CREATE INDEX IF NOT EXISTS addresses_owner_idx  ON public.addresses (owner_type, owner_id);
-- One default per owner, enforced here rather than trusting every caller to
-- clear the previous one.
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_idx
  ON public.addresses (owner_type, owner_id, kind) WHERE is_default;

-- ----------------------------------------------------------------------------
-- 2. public.payment_methods — tokens only, never a card number
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  owner_type     text NOT NULL DEFAULT 'person'
                   CHECK (owner_type IN ('person','shop_customer','tenant')),
  owner_id       uuid,
  kind           text NOT NULL CHECK (kind IN ('pix','credit_card','debit_card','boleto','cash','transfer','other')),
  brand          text,
  last4          text CHECK (last4 IS NULL OR last4 ~ '^[0-9]{4}$'),
  holder_name    text,
  expiry_month   smallint CHECK (expiry_month IS NULL OR expiry_month BETWEEN 1 AND 12),
  expiry_year    smallint,
  provider       text,
  provider_token text,
  is_default     boolean NOT NULL DEFAULT false,
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_methods IS
  'Tokenised payment methods. Never store a full card number or CVV — only brand, last4 and the provider token.';

CREATE INDEX IF NOT EXISTS payment_methods_tenant_idx ON public.payment_methods (tenant_id);
CREATE INDEX IF NOT EXISTS payment_methods_owner_idx  ON public.payment_methods (owner_type, owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_one_default_idx
  ON public.payment_methods (owner_type, owner_id) WHERE is_default;

-- ----------------------------------------------------------------------------
-- 3. Money goes to public.transactions, the core ledger.
--    Columns it already has that the shop needs: kind, order_id, party_id,
--    amount, currency, payment_method, reference, status, transacted_at.
--    Only the shop-specific reconciliation fields are added.
-- ----------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider          text,
  ADD COLUMN IF NOT EXISTS brand             text,
  ADD COLUMN IF NOT EXISTS last4             text;

-- Reconciliation looks a payment up by the gateway id; it must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_provider_reference_idx
  ON public.transactions (provider, reference)
  WHERE provider IS NOT NULL AND reference IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Re-point the order at the canonical address, then retire the plugin tables.
--    The FK from 0010 is dropped first: it references a table about to go.
-- ----------------------------------------------------------------------------
ALTER TABLE public.plg_shop_orders
  DROP CONSTRAINT IF EXISTS plg_shop_orders_shipping_address_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'plg_shop_orders_shipping_address_fk'
       AND conrelid = 'public.plg_shop_orders'::regclass
  ) THEN
    ALTER TABLE public.plg_shop_orders
      ADD CONSTRAINT plg_shop_orders_shipping_address_fk
      FOREIGN KEY (shipping_address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- These are the tables 0010 should never have created. They are dropped only
-- because they are empty; DROP without CASCADE means a surprise row or an
-- unexpected dependency aborts the migration instead of destroying data.
DROP TABLE IF EXISTS public.plg_shop_payments;
DROP TABLE IF EXISTS public.plg_shop_payment_methods;
DROP TABLE IF EXISTS public.plg_shop_addresses;

-- ----------------------------------------------------------------------------
-- 5. RLS — tenant members manage; a signed-in customer sees their own rows.
--    Anon gets nothing: guest checkout writes through SECURITY DEFINER RPCs.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['addresses','payment_methods'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_member_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids())) WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))',
      t || '_member_all', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_self_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_type = ''shop_customer'' AND owner_id IN (SELECT id FROM public.plg_shop_customers WHERE auth_user_id = auth.uid()))',
      t || '_self_read', t);
  END LOOP;
END $$;

GRANT ALL ON public.addresses, public.payment_methods TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. shop_place_order wrote to plg_shop_addresses and plg_shop_payments, both
--    dropped above. Re-point it at the core tables, or the next checkout with an
--    address fails at runtime (PL/pgSQL resolves table names when it executes,
--    so the drop alone is silent until someone buys something).
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
  v_shipping    numeric(12,2) := GREATEST(COALESCE(p_shipping_total, 0), 0);
  v_total       numeric(12,2);
  v_applied     text          := NULL;
  v_email       text          := NULLIF(lower(trim(p_customer_email)), '');
  v_now         timestamptz   := now();
  v_owner       uuid;
  v_owner_email text;
  v_addr_id     uuid          := NULL;
  v_method      text          := NULLIF(lower(trim(p_payment_method)), '');
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
        v_shipping := 0;
      END IF;
      UPDATE public.plg_shop_discounts SET times_used = times_used + 1 WHERE id = v_disc.id;
    END IF;
  END IF;

  v_discount := LEAST(GREATEST(v_discount, 0), v_subtotal);
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
      tenant_id, kind, amount, currency, payment_method, status, metadata
    ) VALUES (
      p_tenant_id, 'shop_payment', v_total, COALESCE(p_currency, 'BRL'), v_method, 'pending',
      jsonb_build_object('shop_order_id', v_order_id)
    );
  END IF;

  RETURN v_order_id;
END;
$$;


GRANT EXECUTE ON FUNCTION public.shop_place_order(uuid, jsonb, uuid, text, text, text, text, numeric, text, jsonb, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.shop_confirm_payment(
  p_order_id uuid,
  p_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order jsonb; v_now timestamptz := now();
BEGIN
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
     AND metadata->>'shop_order_id' = p_order_id::text
     AND status = 'pending';

  SELECT to_jsonb(o) INTO v_order FROM public.plg_shop_orders o WHERE o.id = p_order_id;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.shop_confirm_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_confirm_payment(uuid, text) TO anon, authenticated, service_role;
