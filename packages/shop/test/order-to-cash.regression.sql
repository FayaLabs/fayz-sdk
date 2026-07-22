-- ============================================================================
-- 0023/0024 — a loja alimentando o financeiro
--
-- The claim under test is not "a trigger fires". It is that a shop order and a
-- receivable are the same fact seen from two sides, and that neither side can
-- be edited into disagreeing with the other.
-- ============================================================================
\set ON_ERROR_STOP off
\pset pager off

\echo === order to cash (0023/0024) ===

BEGIN;
INSERT INTO public.tenants (id, name, slug, storefront_published)
VALUES ('70000000-0000-4000-8000-000000000001', 'Loja Financeiro', 'o2c', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plg_shop_products (id, tenant_id, name, slug, price, currency, status, inventory_count)
VALUES ('70000000-0000-4000-8000-0000000000f1', '70000000-0000-4000-8000-000000000001',
        'Costela O2C', 'o2c-prod', 100, 'BRL', 'active', 500)
ON CONFLICT (id) DO NOTHING;
COMMIT;

-- ---------------------------------------------------------------------------
-- R1 — placing an order raises its receivable, numbered by the financial plugin
-- ---------------------------------------------------------------------------
\echo --- R1 pedido levanta conta a receber
DO $$
DECLARE v_order uuid; v_bills int; v_amount numeric; v_total numeric; v_ref text; v_stage text;
BEGIN
  SELECT public.shop_place_order(
    '70000000-0000-4000-8000-000000000001',
    '[{"product_id":"70000000-0000-4000-8000-0000000000f1","quantity":2}]'::jsonb,
    NULL, 'QA O2C', 'o2c@test.local', 'BRL', NULL, 0, NULL, NULL, 'pix') INTO v_order;

  SELECT count(*), COALESCE(sum(amount),0) INTO v_bills, v_amount
    FROM public.plg_financial_movements
   WHERE invoice_id = v_order AND movement_kind = 'bill';
  SELECT total INTO v_total FROM public.plg_shop_orders WHERE id = v_order;
  SELECT reference_number, stage INTO v_ref, v_stage FROM public.orders WHERE id = v_order;

  IF v_bills = 1 AND v_amount = v_total AND v_ref LIKE 'REC-%' AND v_stage = 'invoiced' THEN
    RAISE NOTICE 'R1 PASS — % (%) faturado, 1 parcela de %', v_ref, v_stage, v_amount;
  ELSE
    RAISE NOTICE 'R1 FAIL — bills=% valor=% total=% ref=% stage=%', v_bills, v_amount, v_total, v_ref, v_stage;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- R2 — financial_status is DERIVED, not written. Writing it by hand is
--      pointless: the next movement recomputes it from the money.
-- ---------------------------------------------------------------------------
\echo --- R2 financial_status deriva do recebivel
DO $$
DECLARE v_order uuid; v_before text; v_forced text; v_after text;
BEGIN
  SELECT s.id INTO v_order FROM public.plg_shop_orders s
   WHERE s.customer_email = 'o2c@test.local' ORDER BY s.created_at DESC LIMIT 1;

  SELECT financial_status INTO v_before FROM public.plg_shop_orders WHERE id = v_order;

  -- Someone flips the enum directly, the way the old "Marcar como pago" did.
  UPDATE public.plg_shop_orders SET financial_status = 'paid' WHERE id = v_order;
  SELECT financial_status INTO v_forced FROM public.plg_shop_orders WHERE id = v_order;

  -- Any movement on the receivable re-derives the truth and undoes the lie.
  PERFORM public.refresh_shop_financial_status(v_order);
  SELECT financial_status INTO v_after FROM public.plg_shop_orders WHERE id = v_order;

  IF v_before = 'pending' AND v_forced = 'paid' AND v_after = 'pending' THEN
    RAISE NOTICE 'R2 PASS — enum forcado para paid voltou para pending: sem dinheiro, sem pago';
  ELSE
    RAISE NOTICE 'R2 FAIL — antes=% forcado=% depois=%', v_before, v_forced, v_after;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- R3 — confirming registers a receipt and settles the balance
-- ---------------------------------------------------------------------------
\echo --- R3 confirmar registra recebimento
DO $$
DECLARE v_order uuid; v_receipts int; v_balance record; v_status text; v_paid timestamptz;
BEGIN
  SELECT s.id INTO v_order FROM public.plg_shop_orders s
   WHERE s.customer_email = 'o2c@test.local' ORDER BY s.created_at DESC LIMIT 1;

  PERFORM set_config('app.tenant', '70000000-0000-4000-8000-000000000001', true);
  PERFORM public.shop_confirm_payment(v_order, 'PIX-R3');

  SELECT count(*) INTO v_receipts FROM public.plg_financial_movements
   WHERE invoice_id = v_order AND movement_kind = 'payment';
  SELECT * INTO v_balance FROM public.v_invoice_balances WHERE invoice_id = v_order;
  SELECT financial_status, paid_at INTO v_status, v_paid
    FROM public.plg_shop_orders WHERE id = v_order;

  IF v_receipts = 1 AND v_balance.balance = 0 AND v_balance.status = 'paid'
     AND v_status = 'paid' AND v_paid IS NOT NULL THEN
    RAISE NOTICE 'R3 PASS — 1 recebimento, saldo 0, pedido % em %', v_status, v_paid::date;
  ELSE
    RAISE NOTICE 'R3 FAIL — receipts=% saldo=% inv=% pedido=% paid_at=%',
      v_receipts, v_balance.balance, v_balance.status, v_status, v_paid;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- R4 — confirming twice must not receive the money twice
-- ---------------------------------------------------------------------------
\echo --- R4 confirmar de novo nao duplica recebimento
DO $$
DECLARE v_order uuid; v_state text; v_receipts int; v_paid numeric;
BEGIN
  SELECT s.id INTO v_order FROM public.plg_shop_orders s
   WHERE s.customer_email = 'o2c@test.local' ORDER BY s.created_at DESC LIMIT 1;

  PERFORM set_config('app.tenant', '70000000-0000-4000-8000-000000000001', true);
  BEGIN
    PERFORM public.shop_confirm_payment(v_order, 'PIX-R4-DUPLICADO');
    v_state := 'no-error';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;

  SELECT count(*) INTO v_receipts FROM public.plg_financial_movements
   WHERE invoice_id = v_order AND movement_kind = 'payment';
  SELECT paid INTO v_paid FROM public.v_invoice_balances WHERE invoice_id = v_order;

  -- The second call finds nothing owing and refuses; the ledger is untouched.
  IF v_state = 'P0002' AND v_receipts = 1 THEN
    RAISE NOTICE 'R4 PASS — segunda confirmacao recusada, segue 1 recebimento de %', v_paid;
  ELSE
    RAISE NOTICE 'R4 FAIL — sqlstate=% receipts=% pago=%', v_state, v_receipts, v_paid;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- R5 — a partial receipt shows as partially_paid on both sides
-- ---------------------------------------------------------------------------
\echo --- R5 recebimento parcial
DO $$
DECLARE v_order uuid; v_bill record; v_status text; v_inv text;
BEGIN
  SELECT public.shop_place_order(
    '70000000-0000-4000-8000-000000000001',
    '[{"product_id":"70000000-0000-4000-8000-0000000000f1","quantity":1}]'::jsonb,
    NULL, 'QA Parcial', 'parcial@test.local', 'BRL', NULL, 0, NULL, NULL, 'cash') INTO v_order;

  SELECT * INTO v_bill FROM public.plg_financial_movements
   WHERE invoice_id = v_order AND movement_kind = 'bill' LIMIT 1;

  -- Half the money arrives, recorded the way the Financeiro records it.
  INSERT INTO public.plg_financial_movements
    (tenant_id, invoice_id, direction, movement_kind, amount, paid_amount, status,
     due_date, payment_date, installment_number)
  VALUES (v_bill.tenant_id, v_order, 'credit', 'payment', round(v_bill.amount/2, 2),
          round(v_bill.amount/2, 2), 'paid', v_bill.due_date, current_date, 1);
  UPDATE public.plg_financial_movements
     SET paid_amount = round(amount/2, 2) WHERE id = v_bill.id;

  SELECT financial_status INTO v_status FROM public.plg_shop_orders WHERE id = v_order;
  SELECT status INTO v_inv FROM public.v_invoice_balances WHERE invoice_id = v_order;

  IF v_status = 'partially_paid' AND v_inv = 'partial' THEN
    RAISE NOTICE 'R5 PASS — metade recebida: pedido % / fatura %', v_status, v_inv;
  ELSE
    RAISE NOTICE 'R5 FAIL — pedido=% fatura=%', v_status, v_inv;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- R6 — the retired ledger stays retired
-- ---------------------------------------------------------------------------
\echo --- R6 nenhum lancamento novo em public.transactions
DO $$
DECLARE v_before int; v_after int; v_order uuid;
BEGIN
  SELECT count(*) INTO v_before FROM public.transactions WHERE kind = 'shop_payment';
  SELECT public.shop_place_order(
    '70000000-0000-4000-8000-000000000001',
    '[{"product_id":"70000000-0000-4000-8000-0000000000f1","quantity":1}]'::jsonb,
    NULL, 'QA Ledger', 'ledger@test.local', 'BRL', NULL, 0, NULL, NULL, 'credit_card') INTO v_order;
  SELECT count(*) INTO v_after FROM public.transactions WHERE kind = 'shop_payment';

  IF v_after = v_before THEN
    RAISE NOTICE 'R6 PASS — pedido novo nao escreveu em transactions (segue em %)', v_after;
  ELSE
    RAISE NOTICE 'R6 FAIL — transactions foi de % para %', v_before, v_after;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- R7 — the mirror must not erase the invoice's own metadata
--
-- 0013 upserted `metadata = EXCLUDED.metadata`, so any later touch of the shop
-- order wiped itemsSummary/contactName/quoteNumber that fn_invoice_from_order
-- had written into the same column.
-- ---------------------------------------------------------------------------
\echo --- R7 espelho preserva o metadata da fatura
DO $$
DECLARE v_order uuid; v_quote text; v_src text; v_fin text;
BEGIN
  SELECT s.id INTO v_order FROM public.plg_shop_orders s
   WHERE s.customer_email = 'ledger@test.local' ORDER BY s.created_at DESC LIMIT 1;

  -- Touch the shop order, which re-runs the mirror upsert.
  UPDATE public.plg_shop_orders SET notes = 'mexido depois de faturar' WHERE id = v_order;

  SELECT metadata->>'quoteNumber', metadata->>'source', metadata->>'financial_status'
    INTO v_quote, v_src, v_fin
    FROM public.orders WHERE id = v_order;

  IF v_quote IS NOT NULL AND v_src = 'shop' AND v_fin IS NOT NULL THEN
    RAISE NOTICE 'R7 PASS — pedido % preservado junto com as chaves da loja', v_quote;
  ELSE
    RAISE NOTICE 'R7 FAIL — quoteNumber=% source=% financial_status=%', v_quote, v_src, v_fin;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- R8 — the backfill brought the history across
-- ---------------------------------------------------------------------------
\echo --- R8 historico migrado
DO $$
DECLARE v_orders int; v_without int;
BEGIN
  SELECT count(*) INTO v_orders FROM public.orders WHERE kind = 'shop';
  SELECT count(*) INTO v_without
    FROM public.orders o
    JOIN public.plg_shop_orders s ON s.id = o.id
   WHERE o.kind = 'shop'
     AND NOT EXISTS (SELECT 1 FROM public.plg_financial_movements m
                      WHERE m.invoice_id = o.id AND m.movement_kind = 'bill');

  IF v_without = 0 THEN
    RAISE NOTICE 'R8 PASS — % pedidos no core, nenhum sem conta a receber', v_orders;
  ELSE
    RAISE NOTICE 'R8 FAIL — % de % pedidos sem conta a receber', v_without, v_orders;
  END IF;
END $$;
