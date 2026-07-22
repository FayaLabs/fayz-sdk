-- shop→core consolidation (0013).
\set ON_ERROR_STOP off

UPDATE plg_shop_products SET inventory_count = 50, status = 'active', price = 10.00
 WHERE id = '00000000-0000-4000-8000-0000000000a1';

\echo '=== C1: comprar cria pedido, itens e cliente NO NUCLEO ==='
DO $$
DECLARE v_order uuid; v_core int; v_items int; v_person int; v_kind text; v_ref text;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000a1","quantity":3}]'::jsonb,
    NULL, 'Nucleo Teste', 'core@test.local'
  ) INTO v_order;

  SELECT count(*) INTO v_core   FROM orders      WHERE id = v_order;
  SELECT count(*) INTO v_items  FROM order_items WHERE order_id = v_order;
  SELECT count(*) INTO v_person FROM people      WHERE email = 'core@test.local' AND kind = 'customer';
  SELECT kind, reference_number INTO v_kind, v_ref FROM orders WHERE id = v_order;

  IF v_core = 1 AND v_items = 1 AND v_person = 1 AND v_kind = 'shop' THEN
    RAISE NOTICE 'C1 PASS — pedido % (ref %) no core, 1 item, cliente virou people', v_kind, v_ref;
  ELSE
    RAISE NOTICE 'C1 FAIL — orders=% items=% people=% kind=%', v_core, v_items, v_person, v_kind;
  END IF;
END $$;

\echo ''
\echo '=== C2: totais batem entre a loja e o nucleo ==='
DO $$
DECLARE v_bad int;
BEGIN
  SELECT count(*) INTO v_bad
    FROM plg_shop_orders s JOIN orders c ON c.id = s.id
   WHERE s.total IS DISTINCT FROM c.total
      OR s.subtotal IS DISTINCT FROM c.subtotal
      OR s.discount_total IS DISTINCT FROM c.discount;
  IF v_bad = 0 THEN RAISE NOTICE 'C2 PASS — nenhum pedido com total divergente';
  ELSE RAISE NOTICE 'C2 FAIL — % pedido(s) divergentes', v_bad; END IF;
END $$;

\echo ''
\echo '=== C3: ids preservados (order_items da loja apontam pro mesmo pedido) ==='
DO $$
DECLARE v_orphan int;
BEGIN
  SELECT count(*) INTO v_orphan
    FROM plg_shop_order_items i
   WHERE NOT EXISTS (SELECT 1 FROM order_items c WHERE c.id = i.id);
  IF v_orphan = 0 THEN RAISE NOTICE 'C3 PASS — todo item da loja existe no core com o mesmo id';
  ELSE RAISE NOTICE 'C3 FAIL — % item(ns) sem par no core', v_orphan; END IF;
END $$;

\echo ''
\echo '=== C4: a conta a receber aponta pro pedido do nucleo ==='
DO $$
DECLARE v_order uuid; v_linked int; v_amount numeric; v_total numeric; v_tx int;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000a1","quantity":1}]'::jsonb,
    NULL, 'Pago Core', 'paycore@test.local', 'BRL', NULL, 0, NULL, NULL, 'pix'
  ) INTO v_order;

  -- The receivable is linked by invoice_id = orders.id — the core order, not a
  -- uuid buried in a metadata blob, which is how this used to be joined.
  SELECT count(*), COALESCE(sum(amount), 0) INTO v_linked, v_amount
    FROM plg_financial_movements
   WHERE invoice_id = v_order AND movement_kind = 'bill';
  SELECT total INTO v_total FROM plg_shop_orders WHERE id = v_order;

  -- And the retired ledger is genuinely retired: no shop row lands there.
  SELECT count(*) INTO v_tx FROM transactions
   WHERE kind = 'shop_payment' AND metadata->>'shop_order_id' = v_order::text;

  IF v_linked = 1 AND v_amount = v_total AND v_tx = 0 THEN
    RAISE NOTICE 'C4 PASS — conta a receber de % ligada ao pedido do core, zero linhas em transactions', v_amount;
  ELSE
    RAISE NOTICE 'C4 FAIL — bills=% valor=% total=% transactions=%', v_linked, v_amount, v_total, v_tx;
  END IF;
END $$;

\echo ''
\echo '=== C5: alterar o pedido na loja reflete no nucleo ==='
DO $$
DECLARE v_order uuid; v_core_status text;
BEGIN
  SELECT id INTO v_order FROM plg_shop_orders WHERE customer_email = 'core@test.local' LIMIT 1;
  UPDATE plg_shop_orders SET status = 'cancelled' WHERE id = v_order;
  SELECT status INTO v_core_status FROM orders WHERE id = v_order;
  IF v_core_status = 'cancelled' THEN RAISE NOTICE 'C5 PASS — status espelhado no core';
  ELSE RAISE NOTICE 'C5 FAIL — core ficou em %', v_core_status; END IF;
END $$;
