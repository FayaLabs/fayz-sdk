-- Financial plugin — order-to-cash companion SQL.
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
