-- Fulfilment + timeline (0018).
\set ON_ERROR_STOP off
-- Self-contained: earlier regression files delete the product catalogue, so this
-- one seeds its own instead of inheriting state across files.
DELETE FROM plg_shop_order_items; DELETE FROM plg_shop_orders;
INSERT INTO plg_shop_products (id, tenant_id, name, slug, price, status, inventory_count, sku)
VALUES ('00000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-000000000104',
        'Item Envio', 'item-envio', 10.00, 'active', 50, 'SHIP-1')
ON CONFLICT (id) DO UPDATE SET inventory_count = 50, status = 'active', price = 10.00;

\echo '=== F1: envio parcial deixa o pedido como partially_fulfilled ==='
DO $$
DECLARE v_order uuid; v_item uuid; v_ful uuid; v_status text;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000f1","quantity":4}]'::jsonb,
    NULL, 'Envio', 'ship@test.local'
  ) INTO v_order;

  SELECT id INTO v_item FROM order_items WHERE order_id = v_order LIMIT 1;

  INSERT INTO fulfillments (tenant_id, order_id, status, carrier, service, tracking_code, shipped_at)
  VALUES ('10000000-0000-4000-8000-000000000104', v_order, 'in_transit', 'Correios', 'SEDEX', 'BR123456789BR', now())
  RETURNING id INTO v_ful;

  INSERT INTO fulfillment_items (fulfillment_id, order_item_id, quantity) VALUES (v_ful, v_item, 1);

  SELECT fulfillment_status INTO v_status FROM plg_shop_orders WHERE id = v_order;
  IF v_status = 'partially_fulfilled' THEN
    RAISE NOTICE 'F1 PASS — 1 de 4 enviado => %', v_status;
  ELSE
    RAISE NOTICE 'F1 FAIL — status %', v_status;
  END IF;
END $$;

\echo ''
\echo '=== F2: completar o envio marca fulfilled ==='
DO $$
DECLARE v_order uuid; v_item uuid; v_ful uuid; v_status text;
BEGIN
  SELECT id INTO v_order FROM plg_shop_orders WHERE customer_email='ship@test.local' LIMIT 1;
  SELECT id INTO v_item FROM order_items WHERE order_id = v_order LIMIT 1;
  SELECT id INTO v_ful FROM fulfillments WHERE order_id = v_order LIMIT 1;

  UPDATE fulfillment_items SET quantity = 4 WHERE fulfillment_id = v_ful AND order_item_id = v_item;

  SELECT fulfillment_status INTO v_status FROM plg_shop_orders WHERE id = v_order;
  IF v_status = 'fulfilled' THEN RAISE NOTICE 'F2 PASS — 4 de 4 => %', v_status;
  ELSE RAISE NOTICE 'F2 FAIL — status %', v_status; END IF;
END $$;

\echo ''
\echo '=== F3: a timeline registra criacao do envio e mudanca de status ==='
DO $$
DECLARE v_order uuid; v_ful uuid; v_events int; v_kinds text;
BEGIN
  SELECT id INTO v_order FROM plg_shop_orders WHERE customer_email='ship@test.local' LIMIT 1;
  SELECT id INTO v_ful FROM fulfillments WHERE order_id = v_order LIMIT 1;

  UPDATE fulfillments SET status='delivered', delivered_at=now() WHERE id = v_ful;

  SELECT count(*), string_agg(kind, ',' ORDER BY created_at) INTO v_events, v_kinds
    FROM order_events WHERE order_id = v_order;

  IF v_events >= 2 AND v_kinds LIKE '%fulfillment_created%' AND v_kinds LIKE '%delivered%' THEN
    RAISE NOTICE 'F3 PASS — % eventos: %', v_events, v_kinds;
  ELSE
    RAISE NOTICE 'F3 FAIL — % eventos: %', v_events, v_kinds;
  END IF;
END $$;

\echo ''
\echo '=== F4: cancelar o envio devolve o pedido para nao enviado ==='
DO $$
DECLARE v_order uuid; v_status text;
BEGIN
  SELECT id INTO v_order FROM plg_shop_orders WHERE customer_email='ship@test.local' LIMIT 1;
  UPDATE fulfillments SET status='cancelled' WHERE order_id = v_order;
  SELECT fulfillment_status INTO v_status FROM plg_shop_orders WHERE id = v_order;
  IF v_status = 'unfulfilled' THEN RAISE NOTICE 'F4 PASS — envio cancelado => %', v_status;
  ELSE RAISE NOTICE 'F4 FAIL — status %', v_status; END IF;
END $$;
