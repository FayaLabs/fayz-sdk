-- ============================================================================
-- Reparo: devolver o "pago" que a primeira versão da 0024 apagou
-- ----------------------------------------------------------------------------
-- The first version of 0024 raised the receivables before snapshotting which
-- orders were already settled. Inserting a bill fires 0023's trigger, which
-- re-derives financial_status from a receivable that has no receipts yet — so
-- every historically paid order was rewritten to 'pending' and its paid_at
-- cleared, and the step that was about to read that flag found nothing. 405
-- orders in the pool lost their settlement.
--
-- 0024 has since been corrected (it snapshots first). This migration repairs the
-- pools where the broken version already ran. It is a no-op anywhere else.
--
-- Two things made the damage recoverable, and both were deliberate:
--
--   · public.transactions was retired but NOT dropped, so 249 of the orders
--     still carry their settlement date to the second;
--   · order_events (0018) records every financial transition, so the exact set
--     of orders flipped from 'paid' to 'pending' is on file rather than
--     inferred — including the 156 that never had a ledger row at all.
--
-- The timeline is the authority for WHICH orders; the ledger, where present, is
-- the authority for WHEN. Orders with neither fall back to their own date,
-- which is accurate for this history: the old checkout confirmed payment
-- immediately after placing the order.
--
-- Idempotent.
-- ============================================================================

DO $$
DECLARE v_damaged int; v_receipts int;
BEGIN
  CREATE TEMP TABLE _repair_paid ON COMMIT DROP AS
  SELECT DISTINCT ON (e.order_id)
         e.order_id,
         COALESCE(
           (SELECT max(t.transacted_at)::date
              FROM public.transactions t
             WHERE t.kind = 'shop_payment' AND t.status = 'paid'
               AND (t.order_id = e.order_id OR t.metadata->>'shop_order_id' = e.order_id::text)),
           s.created_at::date
         ) AS paid_on
    FROM public.order_events e
    JOIN public.plg_shop_orders s ON s.id = e.order_id
   WHERE e.kind = 'pending'
     AND e.data->>'from' = 'paid'
     AND e.data->>'to' = 'pending'
     -- Only orders that are still unsettled: one that has since been received
     -- for real must not be paid a second time.
     AND NOT EXISTS (
       SELECT 1 FROM public.plg_financial_movements m
        WHERE m.invoice_id = e.order_id AND m.movement_kind = 'payment'
          AND m.status <> 'cancelled')
   ORDER BY e.order_id, e.created_at DESC;

  SELECT count(*) INTO v_damaged FROM _repair_paid;
  RAISE NOTICE 'pedidos a reparar: %', v_damaged;

  INSERT INTO public.plg_financial_movements (
    tenant_id, invoice_id, direction, movement_kind, amount, paid_amount,
    status, due_date, payment_date, installment_number, notes, metadata
  )
  SELECT b.tenant_id, b.invoice_id, b.direction, 'payment',
         b.amount - COALESCE(b.paid_amount, 0), b.amount - COALESCE(b.paid_amount, 0),
         'paid', b.due_date, r.paid_on, b.installment_number,
         'Recebimento reconstruído do histórico da loja',
         jsonb_build_object('repairedBy', '0025', 'orderId', r.order_id)
    FROM public.plg_financial_movements b
    JOIN _repair_paid r ON r.order_id = b.invoice_id
   WHERE b.movement_kind = 'bill'
     AND b.status <> 'cancelled'
     AND b.amount - COALESCE(b.paid_amount, 0) > 0;

  GET DIAGNOSTICS v_receipts = ROW_COUNT;

  UPDATE public.plg_financial_movements b
     SET paid_amount = b.amount, status = 'paid',
         payment_date = COALESCE(b.payment_date, r.paid_on), updated_at = now()
    FROM _repair_paid r
   WHERE r.order_id = b.invoice_id
     AND b.movement_kind = 'bill'
     AND b.status <> 'cancelled';

  RAISE NOTICE 'recebimentos reconstruidos: %', v_receipts;
END $$;

-- Re-derive every shop order's status from the money now on file. Explicit
-- rather than left to the triggers, so the repair is complete when this
-- migration returns instead of whenever each order is next touched.
DO $$
DECLARE r record; v_n int := 0;
BEGIN
  FOR r IN SELECT DISTINCT invoice_id FROM public.plg_financial_movements
            WHERE movement_kind = 'bill' AND invoice_id IS NOT NULL
  LOOP
    PERFORM public.refresh_shop_financial_status(r.invoice_id);
    v_n := v_n + 1;
  END LOOP;
  RAISE NOTICE 'status rederivado em % pedidos', v_n;
END $$;
