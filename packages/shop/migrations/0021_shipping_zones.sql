-- ============================================================================
-- Frete por faixa de CEP — cotação e disponibilidade antes do checkout
-- ----------------------------------------------------------------------------
-- 0015 moved shipping off the client and onto the server, but only as far as a
-- single flat rate per store: shop_shipping_for(tenant, subtotal) knows nothing
-- about WHERE the parcel is going. A steakhouse delivering in Rio and a store
-- shipping nationwide were charging the same number to every address, and there
-- was no way at all to say "we do not deliver there".
--
-- Zones are ranges of postal code with their own rate, free-above threshold and
-- delivery estimate. Two functions come out of them:
--
--   shop_quote_shipping()  the options for a CEP — an EMPTY result is the
--                          answer "we do not deliver there", which is what the
--                          storefront shows before the buyer builds a cart
--   shop_shipping_for()    the single number the order is charged, re-emitted
--                          to take the postal code into account
--
-- ROLLOUT — zones are opt-in per merchant. A tenant with no zone row keeps
-- exactly the 0015 behaviour (shipping_settings.flat_rate / free_above). Seven
-- live storefronts share this pool and none of them may change price on deploy
-- day; a merchant starts charging by distance the moment they save their first
-- zone, and not before.
--
-- The client's p_shipping_total stays IGNORED. A quote is something to show,
-- never something to trust — accepting it "when it matches" would restore the
-- code path 0015 removed.
--
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  name          text NOT NULL,
  carrier       text,
  -- Digits only, zero-padded to 8. Stored that way so the range test is a plain
  -- string BETWEEN: on fixed-width zero-padded numerals, lexical order and
  -- numeric order are the same thing, and it indexes.
  postal_from   char(8) NOT NULL CHECK (postal_from ~ '^[0-9]{8}$'),
  postal_to     char(8) NOT NULL CHECK (postal_to   ~ '^[0-9]{8}$'),
  rate          numeric(12,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  -- Overrides shipping_settings.free_above for addresses inside this zone: a
  -- store often gives free delivery nearby and never far away.
  free_above    numeric(12,2),
  eta_min_days  int CHECK (eta_min_days >= 0),
  eta_max_days  int CHECK (eta_max_days >= 0),
  active        boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipping_zones_range CHECK (postal_from <= postal_to),
  CONSTRAINT shipping_zones_eta   CHECK (eta_max_days IS NULL OR eta_min_days IS NULL
                                         OR eta_max_days >= eta_min_days)
);

CREATE INDEX IF NOT EXISTS shipping_zones_tenant_idx
  ON public.shipping_zones (tenant_id) WHERE active;
CREATE INDEX IF NOT EXISTS shipping_zones_range_idx
  ON public.shipping_zones (tenant_id, postal_from, postal_to) WHERE active;

DROP TRIGGER IF EXISTS shipping_zones_set_updated_at ON public.shipping_zones;
CREATE TRIGGER shipping_zones_set_updated_at
  BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW EXECUTE FUNCTION public.shop_set_updated_at();

-- RLS mirrors shipping_settings: members write, anon reads. There is nothing
-- private here — it is the delivery policy already printed on the site.
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_zones_member_all ON public.shipping_zones;
CREATE POLICY shipping_zones_member_all ON public.shipping_zones
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

DROP POLICY IF EXISTS shipping_zones_public_read ON public.shipping_zones;
CREATE POLICY shipping_zones_public_read ON public.shipping_zones
  FOR SELECT TO anon, authenticated USING (active);

GRANT SELECT ON public.shipping_zones TO anon, authenticated;
GRANT ALL ON public.shipping_zones TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Quote: which zones serve this CEP, and for how much
-- ----------------------------------------------------------------------------
-- Dropped first, not merely replaced: 0022 widens this function's OUT columns,
-- and CREATE OR REPLACE cannot change a row type ("cannot change return type of
-- existing function"). Without the drop, replaying this file on a pool that has
-- already reached 0022 is a hard error rather than a no-op — which is precisely
-- what `db apply` does the first time this file's checksum moves.
DROP FUNCTION IF EXISTS public.shop_quote_shipping(uuid, text, numeric);

CREATE FUNCTION public.shop_quote_shipping(
  p_tenant_id   uuid,
  p_postal_code text,
  p_subtotal    numeric DEFAULT 0
)
RETURNS TABLE (
  zone_id      uuid,
  name         text,
  carrier      text,
  rate         numeric,
  eta_min_days int,
  eta_max_days int,
  free         boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cep AS (
    SELECT lpad(regexp_replace(COALESCE(p_postal_code, ''), '\D', '', 'g'), 8, '0') AS code,
           length(regexp_replace(COALESCE(p_postal_code, ''), '\D', '', 'g')) = 8 AS valid
  )
  SELECT z.id,
         z.name,
         z.carrier,
         CASE WHEN z.free_above IS NOT NULL AND p_subtotal >= z.free_above
              THEN 0::numeric ELSE z.rate END AS rate,
         z.eta_min_days,
         z.eta_max_days,
         (z.free_above IS NOT NULL AND p_subtotal >= z.free_above) AS free
    FROM public.shipping_zones z, cep
   WHERE z.tenant_id = p_tenant_id
     AND z.active
     AND cep.valid
     AND cep.code BETWEEN z.postal_from AND z.postal_to
   -- Cheapest first; sort_order then id break ties so the "best" option is the
   -- same row on every call. A non-deterministic pick here would let the quote
   -- and the order disagree on a store with overlapping zones.
   ORDER BY 4 ASC, z.sort_order ASC, z.id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.shop_quote_shipping(uuid, text, numeric)
  TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- The charged rate. Dropped and recreated rather than replaced: adding a
-- defaulted parameter to a live function creates a SECOND overload, and the
-- next call answers "function is not unique" — the failure that took checkout
-- down in 0008.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.shop_shipping_for(uuid, numeric);
DROP FUNCTION IF EXISTS public.shop_shipping_for(uuid, numeric, text);

CREATE FUNCTION public.shop_shipping_for(
  p_tenant_id   uuid,
  p_subtotal    numeric,
  p_postal_code text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rate numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.shipping_zones
              WHERE tenant_id = p_tenant_id AND active) THEN
    SELECT q.rate INTO v_rate
      FROM public.shop_quote_shipping(p_tenant_id, p_postal_code, p_subtotal) q
     LIMIT 1;
    -- NULL, deliberately, when no zone covers the address: "not served" is not
    -- the same as "free", and the caller has to decide. shop_place_order below
    -- refuses the order rather than COALESCEing it to zero.
    RETURN v_rate;
  END IF;

  -- No zones configured: the 0015 path, byte for byte.
  RETURN (SELECT CASE
                   WHEN s.free_above IS NOT NULL AND p_subtotal >= s.free_above THEN 0::numeric
                   ELSE COALESCE(s.flat_rate, 0)
                 END
            FROM public.shipping_settings s
           WHERE s.tenant_id = p_tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.shop_shipping_for(uuid, numeric, text)
  TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- shop_place_order re-emitted in full (the discipline of 0014/0015: a partial
-- patch to a function this central is how the ledger close got dropped once).
--
-- Only two things change versus 0015: the postal code is read out of the
-- address payload that was already being sent — so the SIGNATURE IS UNTOUCHED
-- and no client needs updating — and an order to an address the store does not
-- serve is refused. Without that refusal the "we don't deliver there" message
-- would be decoration: the RPC is callable directly.
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
  -- ignored: the rate comes from the zones / shipping_settings. See 0015.
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
  v_postal      text          := NULLIF(regexp_replace(
                                   COALESCE(p_shipping_address->>'postal_code', ''),
                                   '\D', '', 'g'), '');
  v_quoted      numeric;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'shop_place_order: no items' USING ERRCODE = '22023';
  END IF;

  IF v_method IS NOT NULL
     AND v_method NOT IN ('pix','credit_card','debit_card','boleto','cash','other') THEN
    RAISE EXCEPTION 'shop_place_order: unknown payment method %', v_method USING ERRCODE = '22023';
  END IF;

  -- Delivery coverage, checked before anything is written or decremented.
  -- Only enforced for a store that actually configured zones, so a merchant who
  -- has not set any keeps selling to every address exactly as before.
  IF EXISTS (SELECT 1 FROM public.shipping_zones
              WHERE tenant_id = p_tenant_id AND active) THEN
    IF v_postal IS NULL OR length(v_postal) <> 8 THEN
      RAISE EXCEPTION 'shop_place_order: postal code required for delivery'
        USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.shop_quote_shipping(p_tenant_id, v_postal, 0)) THEN
      RAISE EXCEPTION 'shop_place_order: delivery not available for postal code %', v_postal
        USING ERRCODE = '22023';
    END IF;
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

  -- Shipping uses the PRE-discount subtotal, matching selectShipping() in the
  -- cart store. This is 0017's rule and it must survive every re-emission: an
  -- earlier draft of THIS migration copied 0015's post-discount line back in,
  -- which silently reinstated the bug where the cart promised free delivery and
  -- the order charged for it. The T8 regression caught it.
  -- A free_shipping discount still wins (it set v_free_shipping above).
  IF NOT v_free_shipping THEN
    v_quoted := public.shop_shipping_for(p_tenant_id, v_subtotal, v_postal);
    -- The coverage check above already refused an unserved address, so a NULL
    -- here can only mean "no zones and no shipping_settings row" — free.
    v_shipping := COALESCE(v_quoted, 0);
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

  -- Open the payment ledger entry. It is `pending` until a gateway (or the
  -- merchant) settles it — that transition is shop_confirm_payment's job.
  IF v_method IS NOT NULL THEN
    INSERT INTO public.transactions (
      tenant_id, kind, order_id, party_id, amount, currency, payment_method, status, metadata
    ) VALUES (
      p_tenant_id, 'shop_payment',
      -- Only link when the core order exists. A tenant skipped by 0013 (no
      -- `tenants` row) has none, and the FK would otherwise abort the checkout.
      (SELECT o.id FROM public.orders o WHERE o.id = v_order_id),
      -- Who paid (0016). Dropped by an earlier draft of this migration and
      -- caught by the "lançamento atribuído à pessoa" e2e — the third time a
      -- re-emission of this function silently lost a later fix. Diff the body
      -- against the previous migration before shipping one.
      (SELECT p.id FROM public.people p WHERE p.id = v_customer_id),
      v_total, COALESCE(p_currency, 'BRL'), v_method, 'pending',
      jsonb_build_object('shop_order_id', v_order_id)
    );
  END IF;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shop_place_order(uuid, jsonb, uuid, text, text, text, text, numeric, text, jsonb, text)
  TO anon, authenticated;
