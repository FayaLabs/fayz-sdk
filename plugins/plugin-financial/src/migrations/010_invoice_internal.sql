-- Financial plugin — separate WHO MAY invoice from HOW an invoice is built.
--
-- fn_invoice_from_order (004) mixes the two: it checks that the caller is a
-- member of the order's tenant, then does the work. That check is right for a
-- human clicking "Faturar" in the admin, and impossible for anything else — a
-- storefront checkout runs as the SHOPPER, whose user_tenant_ids() is empty by
-- definition, so an order that should raise a receivable the moment it is placed
-- cannot raise one at all. SECURITY DEFINER does not help: auth.uid() still
-- belongs to the caller inside the definer context.
--
-- So the body moves to an internal function with no authorization of its own,
-- and fn_invoice_from_order keeps its signature, keeps its check, and delegates.
-- Callers that exist today (CRM approveQuote, the agenda bridge) are untouched.
-- The internal one is granted to NOBODY: it is reachable only from other
-- SECURITY DEFINER functions and triggers that have already decided the caller
-- is entitled — the shop's order-to-cash bridge being the first.
--
-- Idempotent.

CREATE OR REPLACE FUNCTION public.fn_invoice_from_order_internal(
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

  -- Idempotent: an order already carrying a bill is already invoiced.
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

-- Deliberately NOT granted to authenticated/anon: entry is through
-- fn_invoice_from_order, or from another definer function that has already
-- established the caller's right to create this receivable.
REVOKE ALL ON FUNCTION public.fn_invoice_from_order_internal(uuid, date, text, int, text) FROM PUBLIC;

-- The public entry point: unchanged signature and behaviour, now a guard around
-- the shared body instead of a second copy of it.
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
DECLARE v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.orders WHERE id = p_order_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'fn_invoice_from_order: order % not found', p_order_id;
  END IF;
  IF v_tenant NOT IN (SELECT public.user_tenant_ids()) THEN
    RAISE EXCEPTION 'fn_invoice_from_order: forbidden';
  END IF;

  RETURN public.fn_invoice_from_order_internal(
    p_order_id, p_due_date, p_status, p_installments, p_direction);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_invoice_from_order(uuid, date, text, int, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
