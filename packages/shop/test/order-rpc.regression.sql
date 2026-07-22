-- Behaviour proof for the 0008 hardening. Run once against the 0003 baseline
-- (expect FAIL markers) and once after 0008 (expect PASS markers).
\set ON_ERROR_STOP off

\echo '=== seed ==='
DELETE FROM plg_shop_order_items;
DELETE FROM plg_shop_orders;
DELETE FROM plg_shop_customers;
DELETE FROM plg_shop_products;

INSERT INTO plg_shop_products (id, tenant_id, name, slug, price, status, inventory_count, sku)
VALUES (
  '00000000-0000-4000-8000-0000000000aa',
  '10000000-0000-4000-8000-000000000104',
  'Costela de Teste', 'costela-teste', 10.00, 'active', 5, 'TEST-1'
);

\echo ''
\echo '=== T1: duplicate line items must not oversell (stock 5, ordering 3+3) ==='
DO $$
DECLARE v_order uuid; v_stock int;
BEGIN
  BEGIN
    SELECT shop_place_order(
      '10000000-0000-4000-8000-000000000104'::uuid,
      '[{"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":3},
        {"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":3}]'::jsonb,
      NULL, 'Dup Buyer', 'dup@test.local'
    ) INTO v_order;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T1 PASS — rejected: %', SQLERRM;
    RETURN;
  END;

  SELECT inventory_count INTO v_stock FROM plg_shop_products
   WHERE id = '00000000-0000-4000-8000-0000000000aa';
  IF v_stock < 0 THEN
    RAISE NOTICE 'T1 FAIL — order accepted, stock is now % (oversold)', v_stock;
  ELSE
    RAISE NOTICE 'T1 ?? — order accepted, stock %', v_stock;
  END IF;
END $$;

\echo ''
\echo '=== T2: legitimate duplicate lines (2+2 of stock 5) must total 4 units, once ==='
UPDATE plg_shop_products SET inventory_count = 5
 WHERE id = '00000000-0000-4000-8000-0000000000aa';
DELETE FROM plg_shop_order_items; DELETE FROM plg_shop_orders;

DO $$
DECLARE v_order uuid; v_stock int; v_qty int; v_lines int; v_total numeric;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":2},
      {"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":2}]'::jsonb,
    NULL, 'Two Buyer', 'two@test.local'
  ) INTO v_order;

  SELECT inventory_count INTO v_stock FROM plg_shop_products
   WHERE id = '00000000-0000-4000-8000-0000000000aa';
  SELECT count(*), COALESCE(sum(quantity),0) INTO v_lines, v_qty
    FROM plg_shop_order_items WHERE order_id = v_order;
  SELECT total INTO v_total FROM plg_shop_orders WHERE id = v_order;

  -- 4 x 10.00 = 40.00 goods + 8.00 shipping. Since 0015 the server applies the
  -- store's shipping policy even when the caller sends none, so a direct RPC
  -- call can no longer dodge the freight.
  IF v_stock = 1 AND v_qty = 4 AND v_total = 48.00 THEN
    RAISE NOTICE 'T2 PASS — stock 5→%, % unit(s) across % line(s), total % (40 + 8 frete)', v_stock, v_qty, v_lines, v_total;
  ELSE
    RAISE NOTICE 'T2 FAIL — stock %, qty %, lines %, total %', v_stock, v_qty, v_lines, v_total;
  END IF;
END $$;

\echo ''
\echo '=== T3: a forged p_customer_id belonging to someone else must be refused ==='
UPDATE plg_shop_products SET inventory_count = 5
 WHERE id = '00000000-0000-4000-8000-0000000000aa';

INSERT INTO plg_shop_customers (id, tenant_id, first_name, last_name, email, auth_user_id)
VALUES ('00000000-0000-4000-8000-0000000000cc',
        '10000000-0000-4000-8000-000000000104',
        'Vitima', '', 'victim@test.local', '00000000-0000-4000-8000-0000000000ee');

DO $$
DECLARE v_order uuid;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-0000000000cc'::uuid,   -- someone else's customer id
    'Atacante', 'attacker@test.local'
  ) INTO v_order;
  RAISE NOTICE 'T3 FAIL — order % attached to another customer', v_order;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'T3 PASS — refused: %', SQLERRM;
END $$;

\echo ''
\echo '=== T4: shop_get_order must not expose tenant_id / customer_id / customer_email ==='
DELETE FROM plg_shop_order_items; DELETE FROM plg_shop_orders;
UPDATE plg_shop_products SET inventory_count = 5
 WHERE id = '00000000-0000-4000-8000-0000000000aa';

DO $$
DECLARE v_order uuid; v_json jsonb; v_leaked text[];
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":1}]'::jsonb,
    NULL, 'Leak Check', 'leak@test.local'
  ) INTO v_order;

  SELECT shop_get_order(v_order) INTO v_json;
  SELECT array_agg(k) INTO v_leaked
    FROM unnest(ARRAY['tenant_id','customer_id','customer_email','notes']) k
   WHERE v_json ? k;

  IF v_leaked IS NULL THEN
    RAISE NOTICE 'T4 PASS — no internal columns exposed (keys: %)',
      (SELECT string_agg(k, ',') FROM jsonb_object_keys(v_json) k);
  ELSE
    RAISE NOTICE 'T4 FAIL — leaked %', array_to_string(v_leaked, ',');
  END IF;
END $$;

\echo ''
\echo '=== T5: normal single-item order still works end to end ==='
DELETE FROM plg_shop_order_items; DELETE FROM plg_shop_orders;
UPDATE plg_shop_products SET inventory_count = 5
 WHERE id = '00000000-0000-4000-8000-0000000000aa';

DO $$
DECLARE v_order uuid; v_total numeric; v_stock int;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":2}]'::jsonb,
    NULL, 'Normal Buyer', 'normal@test.local', 'BRL', NULL, 8.00
  ) INTO v_order;
  SELECT total INTO v_total FROM plg_shop_orders WHERE id = v_order;
  SELECT inventory_count INTO v_stock FROM plg_shop_products
   WHERE id = '00000000-0000-4000-8000-0000000000aa';
  IF v_total = 28.00 AND v_stock = 3 THEN
    RAISE NOTICE 'T5 PASS — total % (20 goods + 8 shipping), stock 5→%', v_total, v_stock;
  ELSE
    RAISE NOTICE 'T5 FAIL — total %, stock %', v_total, v_stock;
  END IF;
END $$;

\echo ''
\echo '=== T6: frete forjado pelo cliente e IGNORADO (o servidor decide) ==='
UPDATE plg_shop_products SET inventory_count = 5
 WHERE id = '00000000-0000-4000-8000-0000000000aa';
DELETE FROM plg_shop_order_items; DELETE FROM plg_shop_orders;

DO $$
DECLARE v_order uuid; v_ship numeric; v_total numeric;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":1}]'::jsonb,
    NULL, 'Forjador', 'forge@test.local', 'BRL', NULL,
    999999.00   -- frete absurdo enviado pelo cliente
  ) INTO v_order;

  SELECT shipping_total, total INTO v_ship, v_total FROM plg_shop_orders WHERE id = v_order;

  IF v_ship = 8.00 AND v_total = 18.00 THEN
    RAISE NOTICE 'T6 PASS — frete do cliente descartado, servidor cobrou % (total %)', v_ship, v_total;
  ELSE
    RAISE NOTICE 'T6 FAIL — frete gravado % total %', v_ship, v_total;
  END IF;
END $$;

\echo ''
\echo '=== T7: acima do limite, frete gratis calculado pelo servidor ==='
UPDATE plg_shop_products SET inventory_count = 50, price = 200.00
 WHERE id = '00000000-0000-4000-8000-0000000000aa';
DELETE FROM plg_shop_order_items; DELETE FROM plg_shop_orders;

DO $$
DECLARE v_order uuid; v_ship numeric; v_total numeric;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":1}]'::jsonb,
    NULL, 'Acima', 'above@test.local', 'BRL', NULL, 0
  ) INTO v_order;

  SELECT shipping_total, total INTO v_ship, v_total FROM plg_shop_orders WHERE id = v_order;

  IF v_ship = 0 AND v_total = 200.00 THEN
    RAISE NOTICE 'T7 PASS — 200 >= 150, frete zerado pelo servidor';
  ELSE
    RAISE NOTICE 'T7 FAIL — frete % total %', v_ship, v_total;
  END IF;
END $$;

\echo ''
\echo '=== T8: cupom que derruba abaixo do limite MANTEM o frete gratis (igual ao carrinho) ==='
UPDATE plg_shop_products SET inventory_count = 50, price = 160.00
 WHERE id = '00000000-0000-4000-8000-0000000000aa';
DELETE FROM plg_shop_order_items; DELETE FROM plg_shop_orders;
INSERT INTO plg_shop_discounts (tenant_id, title, code, type, value, status, starts_at)
VALUES ('10000000-0000-4000-8000-000000000104','Dez','DEZ','percentage',10,'active', now() - interval '1 day')
ON CONFLICT DO NOTHING;

DO $$
DECLARE v_order uuid; v_ship numeric; v_sub numeric; v_total numeric;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000aa","quantity":1}]'::jsonb,
    NULL, 'Cupom', 'cupom@test.local', 'BRL', 'DEZ', 0
  ) INTO v_order;

  SELECT shipping_total, subtotal, total INTO v_ship, v_sub, v_total
    FROM plg_shop_orders WHERE id = v_order;

  -- 160 >= 150 antes do desconto => frete 0; total 160 - 16 = 144
  IF v_ship = 0 AND v_total = 144.00 THEN
    RAISE NOTICE 'T8 PASS — subtotal % acima do limite, frete 0, total %', v_sub, v_total;
  ELSE
    RAISE NOTICE 'T8 FAIL — frete % subtotal % total %', v_ship, v_sub, v_total;
  END IF;
END $$;
