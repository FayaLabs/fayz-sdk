-- ============================================================================
-- @fayz-ai/shop — structured addresses and payment methods
-- ----------------------------------------------------------------------------
-- Until now the buyer's address travelled as free text inside plg_shop_orders.notes
-- ("Entrega: Rua das Brasas, 42, Rio de Janeiro, 21360-001"), and the payment
-- method was not recorded at all. Consequences, all of them live today:
--   • logistics cannot read a CEP, a number or a complement out of a sentence;
--   • the customer cannot reuse an address on the next order;
--   • the admin cannot correct a typo before shipping;
--   • finance cannot tell a Pix from a card, nor reconcile with the gateway.
--
-- Design decisions worth stating, because they are not reversible cheaply:
--
-- 1. ORDERS SNAPSHOT THE ADDRESS. An order keeps `shipping_address` as jsonb
--    plus an optional FK to the address it came from. If the order only
--    referenced the address row, a customer moving house would silently rewrite
--    where past orders were delivered. The FK records provenance; the snapshot
--    is the truth of that shipment.
--
-- 2. NO CARD DATA. plg_shop_payment_methods stores brand, last4, holder name and
--    a PROVIDER TOKEN — never the PAN, never the CVV. Storing a card number
--    would drag this database into PCI scope. The column names make the intent
--    explicit so nobody "helpfully" adds one later.
--
-- 3. PAYMENTS ARE THEIR OWN ROWS. An order can be paid, partially refunded and
--    refunded; each of those is an event with its own gateway id and timestamp.
--    A single status column on the order cannot express that, so
--    plg_shop_payments is the ledger and orders.financial_status is the summary.
--
-- Additive and idempotent: nothing is dropped, and the existing notes-based flow
-- keeps working until the storefront sends structured data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Addresses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plg_shop_addresses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  customer_id   uuid REFERENCES public.plg_shop_customers(id) ON DELETE CASCADE,
  label         text,                       -- "Casa", "Trabalho"
  recipient     text,                       -- quem recebe, se não for o cliente
  phone         text,
  postal_code   text NOT NULL,              -- CEP
  street        text NOT NULL,
  number        text,
  complement    text,
  district      text,                       -- bairro
  city          text NOT NULL,
  state         text NOT NULL,              -- UF
  country       text NOT NULL DEFAULT 'BR',
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plg_shop_addresses_tenant_idx ON public.plg_shop_addresses (tenant_id);
CREATE INDEX IF NOT EXISTS plg_shop_addresses_customer_idx ON public.plg_shop_addresses (customer_id);
-- One default per customer, enforced by the database rather than by hoping the
-- application remembers to clear the previous one.
CREATE UNIQUE INDEX IF NOT EXISTS plg_shop_addresses_one_default_idx
  ON public.plg_shop_addresses (customer_id) WHERE is_default;

-- ----------------------------------------------------------------------------
-- 2. Saved payment methods — tokens only.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plg_shop_payment_methods (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  customer_id    uuid REFERENCES public.plg_shop_customers(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('pix','credit_card','debit_card','boleto','cash','other')),
  brand          text,                      -- visa, mastercard, elo…
  last4          text CHECK (last4 IS NULL OR last4 ~ '^[0-9]{4}$'),
  holder_name    text,
  expiry_month   smallint CHECK (expiry_month IS NULL OR expiry_month BETWEEN 1 AND 12),
  expiry_year    smallint,
  provider       text,                      -- mercadopago, stripe…
  provider_token text,                      -- the PSP's token. NEVER a card number.
  is_default     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plg_shop_payment_methods IS
  'Tokenised payment methods. Never store a full card number or CVV here — only brand, last4 and the provider token.';

CREATE INDEX IF NOT EXISTS plg_shop_payment_methods_tenant_idx ON public.plg_shop_payment_methods (tenant_id);
CREATE INDEX IF NOT EXISTS plg_shop_payment_methods_customer_idx ON public.plg_shop_payment_methods (customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS plg_shop_payment_methods_one_default_idx
  ON public.plg_shop_payment_methods (customer_id) WHERE is_default;

-- ----------------------------------------------------------------------------
-- 3. Payment ledger — one row per attempt/settlement/refund.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plg_shop_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  order_id            uuid NOT NULL REFERENCES public.plg_shop_orders(id) ON DELETE CASCADE,
  payment_method_id   uuid REFERENCES public.plg_shop_payment_methods(id) ON DELETE SET NULL,
  kind                text NOT NULL CHECK (kind IN ('pix','credit_card','debit_card','boleto','cash','other')),
  brand               text,
  last4               text,
  provider            text,
  provider_payment_id text,                 -- txid / payment intent, for reconciliation
  amount              numeric(12,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'BRL',
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','authorized','paid','failed','refunded','cancelled')),
  paid_at             timestamptz,
  raw                 jsonb NOT NULL DEFAULT '{}',   -- gateway payload, for audits
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plg_shop_payments_order_idx ON public.plg_shop_payments (order_id);
CREATE INDEX IF NOT EXISTS plg_shop_payments_tenant_idx ON public.plg_shop_payments (tenant_id);
-- Reconciliation looks the payment up by the gateway's id, so it must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS plg_shop_payments_provider_idx
  ON public.plg_shop_payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Order columns: provenance FK + frozen snapshot + a denormalised method for
--    list screens (Shopify shows the method in the order list; joining the
--    ledger for every row would be wasteful).
-- ----------------------------------------------------------------------------
ALTER TABLE public.plg_shop_orders
  ADD COLUMN IF NOT EXISTS shipping_address_id uuid REFERENCES public.plg_shop_addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_address    jsonb,
  ADD COLUMN IF NOT EXISTS billing_address     jsonb,
  ADD COLUMN IF NOT EXISTS payment_method_kind text,
  ADD COLUMN IF NOT EXISTS paid_at             timestamptz;

COMMENT ON COLUMN public.plg_shop_orders.shipping_address IS
  'Frozen copy of the address at purchase time. Editing the customer address must never rewrite past shipments.';

-- ----------------------------------------------------------------------------
-- 5. Backfill what can be recovered from the free-text notes.
--    The storefront wrote "Entrega: <rua>, <cidade>, <cep>" (formatDeliveryNotes),
--    so street/city/postal_code are recoverable; number, district and state are
--    not — they were never collected. Marked `source: 'notes-backfill'` so nobody
--    mistakes a parsed guess for data the buyer actually typed.
-- ----------------------------------------------------------------------------
UPDATE public.plg_shop_orders o
   SET shipping_address = jsonb_strip_nulls(jsonb_build_object(
         'street',      NULLIF(btrim(split_part(m.captured, ',', 1)), ''),
         'city',        NULLIF(btrim(split_part(m.captured, ',', 2)), ''),
         'postal_code', NULLIF(btrim(split_part(m.captured, ',', 3)), ''),
         'raw',         m.captured,
         'source',      'notes-backfill'
       ))
  FROM (
    SELECT id, (regexp_match(notes, 'Entrega:\s*(.+)', 'i'))[1] AS captured
      FROM public.plg_shop_orders
     WHERE notes ~* 'Entrega:'
  ) m
 WHERE o.id = m.id
   AND o.shipping_address IS NULL
   AND m.captured IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 6. RLS — same shape as the rest of the shop: tenant members manage, customers
--    read their own, anon reads nothing. Addresses and payment methods are
--    personal data; there is deliberately no public policy.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['plg_shop_addresses','plg_shop_payment_methods','plg_shop_payments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_member_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids())) WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))',
      t || '_member_all', t);
  END LOOP;
END $$;

-- Customers see their own address book and cards (not the payment ledger, which
-- is operational).
DROP POLICY IF EXISTS plg_shop_addresses_self ON public.plg_shop_addresses;
CREATE POLICY plg_shop_addresses_self ON public.plg_shop_addresses
  FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.plg_shop_customers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS plg_shop_payment_methods_self ON public.plg_shop_payment_methods;
CREATE POLICY plg_shop_payment_methods_self ON public.plg_shop_payment_methods
  FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.plg_shop_customers WHERE auth_user_id = auth.uid()));

GRANT ALL ON public.plg_shop_addresses, public.plg_shop_payment_methods, public.plg_shop_payments
  TO authenticated, service_role;
-- anon gets nothing: guest checkout writes through shop_place_order, which is
-- SECURITY DEFINER and therefore does not need a grant here.
