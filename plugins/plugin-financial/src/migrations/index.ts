// AUTO-GENERATED from 000_plg_rename.sql, 001_financial_base.sql, 002_chart_of_accounts.sql, 003_card_brands.sql, 004_order_to_cash.sql, 005_seed_defaults.sql, 006_rls_policies.sql, 006b_extract_fee_amount.sql, 007_reconciliation.sql, 007b_movement_payment_method_type.sql, 008_split_payment_movements.sql — regenerate with scripts/embed-migrations.mjs
// SQL files are the source of truth; this inline copy lets the manifest declare
// migrations as data. Do not edit by hand — run the embed script instead.

export const MIGRATION_000_PLG_RENAME = `-- 000_plg_rename.sql — rename legacy financial tables to plg_financial_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when the legacy
-- name exists and the target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.financial_movements') IS NOT NULL AND to_regclass('public.plg_financial_movements') IS NULL THEN
    ALTER TABLE public.financial_movements RENAME TO plg_financial_movements;
  END IF;
  IF to_regclass('public.chart_of_accounts') IS NOT NULL AND to_regclass('public.plg_financial_chart_of_accounts') IS NULL THEN
    ALTER TABLE public.chart_of_accounts RENAME TO plg_financial_chart_of_accounts;
  END IF;
  IF to_regclass('public.bank_accounts') IS NOT NULL AND to_regclass('public.plg_financial_bank_accounts') IS NULL THEN
    ALTER TABLE public.bank_accounts RENAME TO plg_financial_bank_accounts;
  END IF;
  IF to_regclass('public.card_brands') IS NOT NULL AND to_regclass('public.plg_financial_card_brands') IS NULL THEN
    ALTER TABLE public.card_brands RENAME TO plg_financial_card_brands;
  END IF;
  IF to_regclass('public.cost_centers') IS NOT NULL AND to_regclass('public.plg_financial_cost_centers') IS NULL THEN
    ALTER TABLE public.cost_centers RENAME TO plg_financial_cost_centers;
  END IF;
  IF to_regclass('public.cash_register_sessions') IS NOT NULL AND to_regclass('public.plg_financial_cash_register_sessions') IS NULL THEN
    ALTER TABLE public.cash_register_sessions RENAME TO plg_financial_cash_register_sessions;
  END IF;
  IF to_regclass('public.payment_methods') IS NOT NULL AND to_regclass('public.plg_financial_payment_methods') IS NULL THEN
    ALTER TABLE public.payment_methods RENAME TO plg_financial_payment_methods;
  END IF;
  IF to_regclass('public.payment_method_types') IS NOT NULL AND to_regclass('public.plg_financial_payment_method_types') IS NULL THEN
    ALTER TABLE public.payment_method_types RENAME TO plg_financial_payment_method_types;
  END IF;
END $$;
`

export const MIGRATION_001_FINANCIAL_BASE = `-- Financial Plugin: Base Tables
-- Pattern: uuid PK, tenant_id FK, timestamps, RLS via project_rls.sql auto-detection

CREATE TABLE IF NOT EXISTS public.plg_financial_payment_method_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  transaction_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  allowed_account_types jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_payment_method_types ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_payment_method_types_tenant ON public.plg_financial_payment_method_types(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_financial_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  payment_method_type_id uuid REFERENCES public.plg_financial_payment_method_types(id),
  is_active boolean NOT NULL DEFAULT true,
  discount_mode text,
  discount_value numeric(12,2) DEFAULT 0,
  interest_mode text,
  interest_value numeric(12,2) DEFAULT 0,
  min_installments integer DEFAULT 1,
  max_installments integer DEFAULT 1,
  service_filter_mode text DEFAULT 'all',
  service_filter_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_payment_methods_tenant ON public.plg_financial_payment_methods(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_financial_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'bank_account',
  bank_name text,
  account_number text,
  agency_number text,
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  initial_balance numeric(14,2) NOT NULL DEFAULT 0,
  credit_limit numeric(14,2),
  due_day integer,
  closing_day integer,
  is_active boolean NOT NULL DEFAULT true,
  unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_bank_accounts_tenant ON public.plg_financial_bank_accounts(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_financial_cash_register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.plg_financial_bank_accounts(id),
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  opened_by_user_id uuid,
  opened_by_name text,
  opening_balance numeric(14,2) NOT NULL,
  closed_at timestamptz,
  closed_by_user_id uuid,
  closed_by_name text,
  closing_balance numeric(14,2),
  expected_balance numeric(14,2),
  difference numeric(14,2),
  notes text,
  unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_cash_register_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_cash_register_sessions_tenant ON public.plg_financial_cash_register_sessions(tenant_id);

-- Financial movements (installments, payments) — plugin-specific, not archetype
-- Invoices themselves use public.orders (kind='invoice_payable'/'invoice_receivable')
CREATE TABLE IF NOT EXISTS public.plg_financial_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.orders(id),
  direction text NOT NULL,
  movement_kind text NOT NULL,
  amount numeric(14,2) NOT NULL,
  paid_amount numeric(14,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_date date NOT NULL,
  payment_date date,
  installment_number integer,
  payment_method_id uuid REFERENCES public.plg_financial_payment_methods(id),
  bank_account_id uuid REFERENCES public.plg_financial_bank_accounts(id),
  cash_session_id uuid REFERENCES public.plg_financial_cash_register_sessions(id),
  card_brand text,
  card_installments integer,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_movements_tenant ON public.plg_financial_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_financial_movements_invoice ON public.plg_financial_movements(invoice_id);
CREATE INDEX IF NOT EXISTS idx_plg_financial_movements_due ON public.plg_financial_movements(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_plg_financial_movements_bank ON public.plg_financial_movements(bank_account_id);
`

export const MIGRATION_002_CHART_OF_ACCOUNTS = `-- Financial Plugin: Chart of Accounts + Cost Centers

CREATE TABLE IF NOT EXISTS public.plg_financial_chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  node_type text NOT NULL DEFAULT 'leaf',
  parent_id uuid REFERENCES public.plg_financial_chart_of_accounts(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_chart_of_accounts_tenant ON public.plg_financial_chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_financial_chart_of_accounts_parent ON public.plg_financial_chart_of_accounts(parent_id);

CREATE TABLE IF NOT EXISTS public.plg_financial_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_cost_centers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_cost_centers_tenant ON public.plg_financial_cost_centers(tenant_id);
`

export const MIGRATION_003_CARD_BRANDS = `-- Financial Plugin: Card Brands

CREATE TABLE IF NOT EXISTS public.plg_financial_card_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_card_brands ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_card_brands_tenant ON public.plg_financial_card_brands(tenant_id);
`

export const MIGRATION_004_ORDER_TO_CASH = `-- Financial plugin — order-to-cash companion SQL.
-- The atomic "promote an order into an invoice + installment ledger" function
-- that CRM (approveQuote) and the agenda financial bridge both RPC. It belongs
-- to the financial plugin (it writes plg_financial_movements + reads orders), and it
-- ships WITH the plugin so enabling Payments provisions it. Idempotent.
-- Depends on: public.orders, public.plg_financial_movements (001_financial_base).

-- 1. Sequence generator (REC-00001 / PAG-00001 numbering)
CREATE TABLE IF NOT EXISTS public.sequences (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  kind text NOT NULL,
  current_value bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, kind)
);
CREATE OR REPLACE FUNCTION public.next_sequence(p_tenant_id uuid, p_kind text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_next bigint;
BEGIN
  INSERT INTO public.sequences (tenant_id, kind, current_value)
  VALUES (p_tenant_id, p_kind, 1)
  ON CONFLICT (tenant_id, kind)
  DO UPDATE SET current_value = public.sequences.current_value + 1
  RETURNING current_value INTO v_next;
  RETURN v_next;
END;
$$;

-- 2. Order-to-cash columns on the spine orders (plugin extends public.orders)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS direction text;

-- 3. RLS + grants for plg_financial_movements (table from 001_financial_base.sql)
ALTER TABLE public.plg_financial_movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_financial_movements TO authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plg_financial_movements' AND policyname='plg_financial_movements_select') THEN
    CREATE POLICY plg_financial_movements_select ON public.plg_financial_movements FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
    CREATE POLICY plg_financial_movements_insert ON public.plg_financial_movements FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
    CREATE POLICY plg_financial_movements_update ON public.plg_financial_movements FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
    CREATE POLICY plg_financial_movements_delete ON public.plg_financial_movements FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
  END IF;
END $$;

-- 4. The function (v2 — backward compatible with the 3-arg CRM call via defaults)
DROP FUNCTION IF EXISTS public.fn_invoice_from_order(uuid, date, text);
CREATE OR REPLACE FUNCTION public.fn_invoice_from_order(
  p_order_id uuid,
  p_due_date date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_installments int DEFAULT 1,
  p_direction text DEFAULT 'credit'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order   public.orders%ROWTYPE;
  v_ref     text;
  v_seq     bigint;
  v_summary text;
  v_contact text;
  v_existing uuid;
  v_kind    text;
  v_prefix  text;
  v_n       int := GREATEST(COALESCE(p_installments, 1), 1);
  v_total   numeric;
  v_base    numeric;
  v_amt     numeric;
  v_alloc   numeric := 0;
  v_due     date;
  i         int;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'fn_invoice_from_order: order % not found', p_order_id; END IF;
  IF v_order.tenant_id NOT IN (SELECT public.user_tenant_ids()) THEN
    RAISE EXCEPTION 'fn_invoice_from_order: forbidden';
  END IF;

  SELECT id INTO v_existing FROM public.plg_financial_movements
    WHERE invoice_id = p_order_id AND movement_kind = 'bill' LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN p_order_id; END IF;

  IF p_direction = 'debit' THEN v_kind := 'invoice_payable'; v_prefix := 'PAG';
  ELSE v_kind := 'invoice_receivable'; v_prefix := 'REC'; END IF;

  SELECT public.next_sequence(v_order.tenant_id, v_kind) INTO v_seq;
  v_ref := v_prefix || '-' || lpad(v_seq::text, 5, '0');

  SELECT string_agg(name, ', ' ORDER BY sort_order) INTO v_summary
    FROM public.order_items WHERE order_id = p_order_id;
  SELECT name INTO v_contact FROM public.people WHERE id = v_order.party_id;

  UPDATE public.orders SET
    status = COALESCE(p_status, status),
    stage = 'invoiced',
    direction = p_direction,
    reference_number = v_ref,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'itemsSummary', COALESCE(v_summary, ''),
      'contactName', v_contact,
      'installmentCount', v_n,
      'quoteNumber', v_order.reference_number,
      'direction', p_direction
    ),
    updated_at = now()
  WHERE id = p_order_id;

  v_total := COALESCE(v_order.total, 0);
  v_base  := round(v_total / v_n, 2);
  v_due   := COALESCE(p_due_date, current_date);
  FOR i IN 1..v_n LOOP
    IF i = v_n THEN v_amt := round(v_total - v_alloc, 2);
    ELSE v_amt := v_base; v_alloc := v_alloc + v_base; END IF;
    INSERT INTO public.plg_financial_movements
      (tenant_id, invoice_id, direction, movement_kind, amount, paid_amount, status, due_date, installment_number)
    VALUES
      (v_order.tenant_id, p_order_id, p_direction, 'bill', v_amt, 0, 'pending',
       (v_due + ((i - 1) || ' months')::interval)::date, i);
  END LOOP;

  RETURN p_order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_invoice_from_order(uuid, date, text, int, text) TO authenticated;

-- 5. Derived balances view (Payments page + agenda payment badge read this)
CREATE OR REPLACE VIEW public.v_invoice_balances AS
WITH bill AS (
  SELECT
    invoice_id,
    SUM(amount)      FILTER (WHERE status <> 'cancelled') AS billed,
    SUM(paid_amount) FILTER (WHERE status <> 'cancelled') AS paid,
    bool_or(status NOT IN ('paid','cancelled') AND due_date < current_date) AS has_overdue
  FROM public.plg_financial_movements
  WHERE movement_kind = 'bill'
  GROUP BY invoice_id
)
SELECT
  o.id AS invoice_id, o.tenant_id, o.kind, o.reference_number, o.party_id, o.direction,
  CASE WHEN o.direction = 'debit' OR o.kind = 'invoice_payable' THEN 'payable' ELSE 'receivable' END AS flow,
  COALESCE(b.billed, o.total, 0) AS amount,
  COALESCE(b.paid, 0) AS paid,
  CASE WHEN o.status = 'cancelled' OR o.stage = 'cancelled' THEN 0
       ELSE COALESCE(b.billed, o.total, 0) - COALESCE(b.paid, 0) END AS balance,
  CASE
    WHEN o.status = 'cancelled' OR o.stage = 'cancelled'       THEN 'cancelled'
    WHEN COALESCE(b.billed, o.total, 0) = 0                    THEN 'open'
    WHEN COALESCE(b.paid, 0) >= COALESCE(b.billed, o.total, 0) THEN 'paid'
    WHEN COALESCE(b.paid, 0) > 0                               THEN 'partial'
    WHEN COALESCE(b.has_overdue, false)                        THEN 'overdue'
    ELSE 'open'
  END AS status,
  o.created_at, o.updated_at
FROM public.orders o
LEFT JOIN bill b ON b.invoice_id = o.id
WHERE o.kind IN ('invoice_receivable','invoice_payable') OR b.invoice_id IS NOT NULL;
ALTER VIEW public.v_invoice_balances SET (security_invoker = true);
GRANT SELECT ON public.v_invoice_balances TO authenticated;

-- Refresh PostgREST's schema cache so the new RPC/views are visible immediately.
NOTIFY pgrst, 'reload schema';
`

export const MIGRATION_005_SEED_DEFAULTS = `-- Financial plugin — seed: payment method types + card brands.
-- These are the read-only "system" registries the plugin's UI assumes exist
-- (PaymentModal, card selection). They live as registry seedData in TS but were
-- never written to the DB, so a fresh tenant had none. This backfills them for
-- every tenant that has none. Idempotent. Plugin-owned so every app gets them.

DO $$
DECLARE t_id uuid;
BEGIN
  FOR t_id IN (
    SELECT id FROM public.tenants
    WHERE id NOT IN (SELECT DISTINCT tenant_id FROM public.plg_financial_payment_method_types)
  )
  LOOP
    INSERT INTO public.plg_financial_payment_method_types (tenant_id, name, transaction_type) VALUES
      (t_id, 'Cash', 'cash'),
      (t_id, 'PIX', 'pix'),
      (t_id, 'Credit Card', 'credit_card'),
      (t_id, 'Debit Card', 'debit_card'),
      (t_id, 'Bank Transfer', 'bank_transfer'),
      (t_id, 'Check', 'check');
  END LOOP;
END $$;

DO $$
DECLARE t_id uuid;
BEGIN
  FOR t_id IN (
    SELECT id FROM public.tenants
    WHERE id NOT IN (SELECT DISTINCT tenant_id FROM public.plg_financial_card_brands)
  )
  LOOP
    INSERT INTO public.plg_financial_card_brands (tenant_id, name) VALUES
      (t_id, 'Visa'), (t_id, 'Mastercard'), (t_id, 'American Express'),
      (t_id, 'Elo'), (t_id, 'Hipercard'), (t_id, 'Diners Club'),
      (t_id, 'Discover'), (t_id, 'JCB'), (t_id, 'Aura'), (t_id, 'Hiper');
  END LOOP;
END $$;
`

export const MIGRATION_006_RLS_POLICIES = `-- Financial Plugin: RLS policies + grants for ALL base tables.
--
-- The base migrations (001/002/003) ENABLE row-level security but relied on an
-- external \`project_rls.sql\` auto-detection step to create the actual policies.
-- That step does not run in the Drizzle/companion pipeline, so every table
-- except plg_financial_movements was RLS-enabled with NO policy → all inserts denied
-- ("new row violates row-level security policy"). This creates the canonical
-- per-tenant policies idempotently. Re-running is a no-op (IF NOT EXISTS guards;
-- plg_financial_movements policies from 004 are skipped).
--
-- Canonical RLS form: tenant_id IN (SELECT public.user_tenant_ids()).

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'plg_financial_payment_method_types','plg_financial_payment_methods','plg_financial_bank_accounts',
    'plg_financial_cash_register_sessions','plg_financial_movements',
    'plg_financial_chart_of_accounts','plg_financial_cost_centers','plg_financial_card_brands'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_select') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_select', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_insert') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_insert', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_update') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_update', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_delete') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_delete', t);
    END IF;
  END LOOP;
END $$;
`

export const MIGRATION_006B_EXTRACT_FEE_AMOUNT = `-- ---------------------------------------------------------------------------
-- Financial extract (extrato): net card settlement + transfers
-- ---------------------------------------------------------------------------
-- Adds the processing/MDR fee column used by the bank/cash account statement so
-- the running balance reflects the NET cash that actually lands in the account.
--   gross    = paid_amount (settles the receivable/payable)
--   net cash = paid_amount - fee_amount  (credits only; v1 has no fee on debits)
ALTER TABLE public.plg_financial_movements
  ADD COLUMN IF NOT EXISTS fee_amount numeric(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.plg_financial_movements.fee_amount IS
  'Processing/MDR fee deducted at settlement. Net cash impact = paid_amount - fee_amount (credit). v1: same-day net, no D+N settlement-date modeling.';

CREATE INDEX IF NOT EXISTS idx_plg_financial_movements_statement
  ON public.plg_financial_movements (bank_account_id, payment_date)
  WHERE status IN ('paid', 'partial');

-- Transfers between accounts = a debit row (source) + credit row (destination),
-- both status='paid', movement_kind='transfer', correlated via metadata jsonb:
--   metadata->>'transferId' | 'transferRole' ('out'|'in') | 'counterAccountId'
`

export const MIGRATION_007_RECONCILIATION = `-- ---------------------------------------------------------------------------
-- Reconciliation (conciliação): bank-statement lines ↔ internal movements
-- ---------------------------------------------------------------------------
-- An integration (e.g. open banking) imports bank-statement lines as
-- plg_financial_movements tagged with (external_source, external_id). The matching
-- UI then links each imported line to the internal movement it settles, or
-- accepts it standalone. These columns make a movement carry its bank-line
-- identity and its reconciliation state.
--   external_source / external_id : the bank line's provider + unique id
--   reconciled_at                 : when the line was matched/accepted (NULL = pending)
--   matched_movement_id           : the internal movement this line reconciles (NULL = standalone)
ALTER TABLE public.plg_financial_movements
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS matched_movement_id uuid
    REFERENCES public.plg_financial_movements(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.plg_financial_movements.external_source IS
  'Provider of an imported bank-statement line (e.g. plugbank, inter). NULL for app-native movements.';
COMMENT ON COLUMN public.plg_financial_movements.external_id IS
  'Provider-unique id of the imported bank line. Forms the import idempotency key with external_source.';

-- Idempotency: a given bank line imports at most once per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_plg_financial_movements_external
  ON public.plg_financial_movements (tenant_id, external_source, external_id)
  WHERE external_id IS NOT NULL AND external_source IS NOT NULL;

-- Fast lookup of imported-but-unreconciled lines for the matching screen.
CREATE INDEX IF NOT EXISTS idx_plg_financial_movements_unreconciled
  ON public.plg_financial_movements (tenant_id, payment_date)
  WHERE external_source IS NOT NULL AND reconciled_at IS NULL;
`

export const MIGRATION_007B_MOVEMENT_PAYMENT_METHOD_TYPE = `-- payment_method_type_id existed on pre-pool installs (added out-of-band on
-- the salon/beauty DB) but was never captured in the file series; 008 requires
-- it on plg_financial_movements. No-op where the column already exists.

ALTER TABLE public.plg_financial_movements
  ADD COLUMN IF NOT EXISTS payment_method_type_id uuid REFERENCES public.plg_financial_payment_method_types(id);
`

export const MIGRATION_008_SPLIT_PAYMENT_MOVEMENTS = `-- Split bill (obligation) vs payment (cash event).
-- Each payment is now its own movement_kind='payment' row (one per cash event), so
-- two payments on one installment show as two extract rows instead of one summed row.
-- Bills stay pure obligations; v_invoice_balances already filters movement_kind='bill',
-- so the new payment rows don't affect invoice balances. Backfill is idempotent.
-- Requires fee_amount (006b_extract_fee_amount.sql).

INSERT INTO public.plg_financial_movements
  (tenant_id, invoice_id, direction, movement_kind, amount, paid_amount, fee_amount, status,
   due_date, payment_date, installment_number, payment_method_id, payment_method_type_id,
   bank_account_id, cash_session_id, card_brand, card_installments, notes, metadata)
SELECT
  b.tenant_id, b.invoice_id, b.direction, 'payment', b.paid_amount, b.paid_amount,
  COALESCE(b.fee_amount, 0), 'paid',
  b.due_date, COALESCE(b.payment_date, b.updated_at::date, CURRENT_DATE), b.installment_number,
  b.payment_method_id, b.payment_method_type_id, b.bank_account_id, b.cash_session_id,
  b.card_brand, b.card_installments, b.notes,
  jsonb_build_object('backfilledFromBill', b.id)
FROM public.plg_financial_movements b
WHERE b.movement_kind = 'bill' AND b.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.plg_financial_movements p
    WHERE p.movement_kind = 'payment' AND p.metadata->>'backfilledFromBill' = b.id::text
  );

UPDATE public.plg_financial_movements
SET payment_date = NULL, bank_account_id = NULL, payment_method_id = NULL,
    payment_method_type_id = NULL, cash_session_id = NULL, card_brand = NULL, card_installments = NULL
WHERE movement_kind = 'bill';
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000_plg_rename", sql: MIGRATION_000_PLG_RENAME },
  { id: "001_financial_base", sql: MIGRATION_001_FINANCIAL_BASE },
  { id: "002_chart_of_accounts", sql: MIGRATION_002_CHART_OF_ACCOUNTS },
  { id: "003_card_brands", sql: MIGRATION_003_CARD_BRANDS },
  { id: "004_order_to_cash", sql: MIGRATION_004_ORDER_TO_CASH },
  { id: "005_seed_defaults", sql: MIGRATION_005_SEED_DEFAULTS },
  { id: "006_rls_policies", sql: MIGRATION_006_RLS_POLICIES },
  { id: "006b_extract_fee_amount", sql: MIGRATION_006B_EXTRACT_FEE_AMOUNT },
  { id: "007_reconciliation", sql: MIGRATION_007_RECONCILIATION },
  { id: "007b_movement_payment_method_type", sql: MIGRATION_007B_MOVEMENT_PAYMENT_METHOD_TYPE },
  { id: "008_split_payment_movements", sql: MIGRATION_008_SPLIT_PAYMENT_MOVEMENTS },
]
