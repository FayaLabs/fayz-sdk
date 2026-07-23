-- ============================================================================
-- A loja passa a alimentar o financeiro: pedido → conta a receber
-- ----------------------------------------------------------------------------
-- Until now a shop order produced a row in public.transactions and an enum on
-- plg_shop_orders.financial_status that a human flipped with a "Marcar como
-- pago" button. Both were wrong:
--
--   · public.transactions has ONE reference in the entire codebase — a generic
--     archetype map in packages/core/src/data/archetype.ts. No screen reads it.
--     717 rows of shop payments were being written where nobody looks.
--   · "paid" as a button is an assertion about money with no counterpart. There
--     is no receivable, no due date, no instalment, no bank, no fee — nothing an
--     accountant would recognise as having happened.
--
-- Meanwhile the financial plugin already models exactly this, and none of it was
-- reachable from the shop:
--
--   fn_invoice_from_order   raises REC-00001 and its instalments  (004)
--   plg_financial_movements bills (obligations) and payments (cash) (001)
--   v_invoice_balances      derives billed / paid / balance / overdue (004)
--
-- This migration is the bridge, and it deliberately writes NO new financial
-- concept of its own. Four moves:
--
--   1. the mirror stops clobbering the invoice metadata it does not own
--   2. placing an order raises its receivable, in the same transaction
--   3. financial_status becomes DERIVED from the receivable, like
--      fulfillment_status was made derived from shipments in 0018
--   4. shop_confirm_payment registers a RECEIPT instead of flipping the enum
--
-- Requires plugin-financial 001–010.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The mirror must merge metadata, not replace it
--
-- 0013's upsert does `metadata = EXCLUDED.metadata`, which is fine while the
-- shop is the only writer. fn_invoice_from_order writes itemsSummary,
-- contactName, installmentCount and quoteNumber into the SAME column, so the
-- next touch of the shop order — a status change, a fulfilment — would erase the
-- invoice's own record of itself.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_mirror_order_to_core()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Tenants with no row in `tenants` (see 0009) have no core order to mirror to.
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.tenant_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.orders (
    id, tenant_id, kind, reference_number, status, party_id,
    subtotal, discount, tax, shipping, total, currency, notes, metadata
  ) VALUES (
    NEW.id, NEW.tenant_id, 'shop', NEW.order_number::text, NEW.status,
    (SELECT p.id FROM public.people p WHERE p.id = NEW.customer_id),
    NEW.subtotal, NEW.discount_total, NEW.tax_total, NEW.shipping_total, NEW.total,
    NEW.currency, NEW.notes,
    jsonb_build_object(
      'source','shop',
      'financial_status', NEW.financial_status,
      'fulfillment_status', NEW.fulfillment_status,
      'shipping_total', NEW.shipping_total,
      'discount_code', NEW.discount_code,
      'customer_email', NEW.customer_email)
  )
  ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status, party_id = EXCLUDED.party_id,
        subtotal = EXCLUDED.subtotal, discount = EXCLUDED.discount, tax = EXCLUDED.tax,
        -- `shipping` is a first-class core column since 0016. An earlier draft
        -- of this migration rebuilt this function from 0013's body and dropped
        -- it, so freight silently stopped reaching the core order — the fourth
        -- time a re-emission here lost a later fix. Diff before shipping one.
        shipping = EXCLUDED.shipping,
        total = EXCLUDED.total, notes = EXCLUDED.notes,
        -- Existing keys first, the shop's on top: the shop owns the keys it
        -- writes and nothing else in the object.
        metadata = COALESCE(public.orders.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = now();

  IF NEW.order_id IS NULL THEN NEW.order_id := NEW.id; END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Placing an order raises its receivable
--
-- AFTER INSERT, so the BEFORE-INSERT mirror has already created the core order
-- fn_invoice_from_order_internal reads. One instalment due today; when a payment
-- provider lands, the instalment plan it returns is what gets passed here.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_order_raise_receivable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- No core order (orphan tenant) means nothing to invoice, and an exception
  -- here would take the whole checkout down for a defect it did not cause.
  IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = NEW.id) THEN
    RETURN NEW;
  END IF;

  PERFORM public.fn_invoice_from_order_internal(
    NEW.id,
    current_date,   -- due today; a term per payment method is a later decision
    NULL,           -- leave orders.status alone: the shop owns it
    1,
    'credit');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plg_shop_orders_raise_receivable ON public.plg_shop_orders;
CREATE TRIGGER plg_shop_orders_raise_receivable
  AFTER INSERT ON public.plg_shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.shop_order_raise_receivable();

-- ----------------------------------------------------------------------------
-- 3. financial_status is derived from the receivable
--
-- Same discipline as 0018's fulfillment_status: a status nobody can write by
-- hand cannot drift from the thing it describes. v_invoice_balances is the
-- financial module's own definition of paid/partial/overdue — the shop adopts
-- it rather than forming a second opinion.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_shop_financial_status(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance record; v_status text; v_paid_at timestamptz;
BEGIN
  SELECT * INTO v_balance FROM public.v_invoice_balances WHERE invoice_id = p_order_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_status := CASE v_balance.status
    WHEN 'paid'      THEN 'paid'
    WHEN 'partial'   THEN 'partially_paid'
    WHEN 'cancelled' THEN 'voided'
    ELSE 'pending'          -- open and overdue are both "not settled yet"
  END;

  -- paid_at is the date money actually arrived, taken from the last receipt,
  -- not from when someone got round to looking at the screen.
  SELECT max(payment_date)::timestamptz INTO v_paid_at
    FROM public.plg_financial_movements
   WHERE invoice_id = p_order_id AND movement_kind = 'payment' AND status <> 'cancelled';

  UPDATE public.plg_shop_orders
     SET financial_status = v_status,
         paid_at = CASE WHEN v_status = 'paid' THEN COALESCE(v_paid_at, now()) ELSE NULL END
   WHERE id = p_order_id
     AND (financial_status IS DISTINCT FROM v_status
          OR (v_status = 'paid') <> (paid_at IS NOT NULL));
END;
$$;

CREATE OR REPLACE FUNCTION public.shop_financial_movement_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
BEGIN
  IF v_order IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.plg_shop_orders s WHERE s.id = v_order) THEN
    PERFORM public.refresh_shop_financial_status(v_order);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS plg_financial_movements_shop_sync ON public.plg_financial_movements;
CREATE TRIGGER plg_financial_movements_shop_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.plg_financial_movements
  FOR EACH ROW EXECUTE FUNCTION public.shop_financial_movement_sync();

-- ----------------------------------------------------------------------------
-- 4. Confirming a payment means recording a receipt
--
-- The authorization from 0019 stays exactly as it was: a member of the owning
-- tenant, or a PSP webhook with the service role. What changes is the effect —
-- it settles the open instalments by writing `payment` movements, which is what
-- the financial module reads, and the order's status follows from that via the
-- trigger above instead of being set here.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_confirm_payment(
  p_order_id uuid,
  p_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  jsonb;
  v_tenant uuid;
  v_role   text;
  v_bill   record;
  v_open   numeric;
  v_any    boolean := false;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.plg_shop_orders WHERE id = p_order_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  v_role := COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    '');

  IF v_role <> 'service_role'
     AND v_tenant NOT IN (SELECT public.user_tenant_ids())
  THEN
    RAISE EXCEPTION 'not authorized to confirm payment for this order'
      USING ERRCODE = '42501';
  END IF;

  -- One receipt per open instalment, for whatever is still owed on it.
  FOR v_bill IN
    SELECT * FROM public.plg_financial_movements
     WHERE invoice_id = p_order_id
       AND movement_kind = 'bill'
       AND status <> 'cancelled'
     ORDER BY installment_number
  LOOP
    v_open := round(v_bill.amount - COALESCE(v_bill.paid_amount, 0), 2);
    CONTINUE WHEN v_open <= 0;

    INSERT INTO public.plg_financial_movements (
      tenant_id, invoice_id, direction, movement_kind, amount, paid_amount,
      status, due_date, payment_date, installment_number, notes, metadata
    ) VALUES (
      v_bill.tenant_id, p_order_id, v_bill.direction, 'payment', v_open, v_open,
      'paid', v_bill.due_date, current_date, v_bill.installment_number,
      NULLIF(p_reference, ''),
      jsonb_build_object('source', 'shop_confirm_payment', 'reference', p_reference)
    );

    UPDATE public.plg_financial_movements
       SET paid_amount = v_bill.amount, status = 'paid',
           payment_date = current_date, updated_at = now()
     WHERE id = v_bill.id;

    v_any := true;
  END LOOP;

  IF NOT v_any THEN
    RAISE EXCEPTION 'order not found or not pending' USING ERRCODE = 'P0002';
  END IF;

  -- The trigger above has already derived financial_status from the receipts.
  SELECT to_jsonb(o) INTO v_order FROM public.plg_shop_orders o WHERE o.id = p_order_id;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.shop_confirm_payment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shop_confirm_payment(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.shop_confirm_payment(uuid, text)
  TO authenticated, service_role;
