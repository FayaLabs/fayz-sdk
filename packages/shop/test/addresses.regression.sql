-- Address + payment consolidation (0012). Self-contained: earlier regression
-- files leave the shared product as a draft, and that cross-file state is what
-- made these look broken before.
\set ON_ERROR_STOP off

UPDATE plg_shop_products SET inventory_count = 50, status = 'active', price = 10.00
 WHERE id = '00000000-0000-4000-8000-0000000000a1';
DELETE FROM plg_shop_order_items; DELETE FROM plg_shop_orders;

\echo '=== A1: tabelas plg_ de endereco/pagamento foram retiradas ==='
DO $$
DECLARE v_left int;
BEGIN
  SELECT count(*) INTO v_left FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('plg_shop_addresses','plg_shop_payment_methods','plg_shop_payments');
  IF v_left = 0 THEN RAISE NOTICE 'A1 PASS — nenhuma tabela plg_ de endereco/pagamento restante';
  ELSE RAISE NOTICE 'A1 FAIL — % ainda existem', v_left; END IF;
END $$;

\echo ''
\echo '=== A2: endereco estruturado vira snapshot no pedido + linha em public.addresses ==='
DO $$
DECLARE v_order uuid; a jsonb; v_book int; v_pay text; v_owner text;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000a1","quantity":1}]'::jsonb,
    NULL, 'Estruturado', 'struct@test.local', 'BRL', NULL, 0, NULL,
    '{"postal_code":"22000-000","street":"Av Atlantica","number":"1702","district":"Copacabana","city":"Rio de Janeiro","state":"RJ"}'::jsonb,
    'pix'
  ) INTO v_order;

  SELECT shipping_address, payment_method_kind INTO a, v_pay FROM plg_shop_orders WHERE id = v_order;
  SELECT count(*), min(owner_type) INTO v_book, v_owner FROM addresses WHERE postal_code = '22000-000';

  IF a->>'state' = 'RJ' AND a->>'district' = 'Copacabana' AND v_pay = 'pix'
     AND v_book = 1 AND v_owner = 'shop_customer' THEN
    RAISE NOTICE 'A2 PASS — snapshot com bairro/UF, metodo %, 1 endereco em public.addresses', v_pay;
  ELSE
    RAISE NOTICE 'A2 FAIL — addr=% metodo=% agenda=% owner=%', a::text, v_pay, v_book, v_owner;
  END IF;
END $$;

\echo ''
\echo '=== A3: mesmo endereco duas vezes nao duplica a agenda ==='
DO $$
DECLARE v_order uuid; v_book int;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000a1","quantity":1}]'::jsonb,
    NULL, 'Estruturado', 'struct@test.local', 'BRL', NULL, 0, NULL,
    '{"postal_code":"22000-000","street":"Av Atlantica","number":"1702","district":"Copacabana","city":"Rio de Janeiro","state":"RJ"}'::jsonb,
    'pix'
  ) INTO v_order;
  SELECT count(*) INTO v_book FROM addresses WHERE postal_code = '22000-000';
  IF v_book = 1 THEN RAISE NOTICE 'A3 PASS — segue 1 endereco na agenda';
  ELSE RAISE NOTICE 'A3 FAIL — % enderecos', v_book; END IF;
END $$;

\echo ''
\echo '=== A4: pedido levanta conta a receber e confirmar registra o recebimento ==='
DO $$
DECLARE
  v_order uuid; v_tenant uuid; v_paid timestamptz; v_status text;
  v_bills int; v_ref text; v_receipts int; v_balance record;
BEGIN
  SELECT id, tenant_id INTO v_order, v_tenant FROM plg_shop_orders
   WHERE customer_email = 'struct@test.local'
   ORDER BY created_at LIMIT 1;

  -- The order raised its receivable when it was placed (0023), numbered by the
  -- financial plugin's own sequence.
  SELECT count(*) INTO v_bills FROM plg_financial_movements
   WHERE invoice_id = v_order AND movement_kind = 'bill';
  SELECT reference_number INTO v_ref FROM orders WHERE id = v_order;

  -- Confirming settles it, as the merchant. It no longer writes
  -- public.transactions, and no longer sets financial_status by hand.
  PERFORM set_config('app.tenant', v_tenant::text, true);
  PERFORM shop_confirm_payment(v_order, 'PIX-TX-123');

  SELECT count(*) INTO v_receipts FROM plg_financial_movements
   WHERE invoice_id = v_order AND movement_kind = 'payment';
  SELECT * INTO v_balance FROM v_invoice_balances WHERE invoice_id = v_order;
  SELECT financial_status, paid_at INTO v_status, v_paid FROM plg_shop_orders WHERE id = v_order;

  IF v_bills = 1 AND v_ref LIKE 'REC-%' AND v_receipts = 1
     AND v_balance.status = 'paid' AND v_balance.balance = 0
     AND v_status = 'paid' AND v_paid IS NOT NULL THEN
    RAISE NOTICE 'A4 PASS — % com 1 parcela, recebida, saldo 0, pedido derivado como %', v_ref, v_status;
  ELSE
    RAISE NOTICE 'A4 FAIL — bills=% ref=% receipts=% saldo=% status=% paid_at=%',
      v_bills, v_ref, v_receipts, v_balance.balance, v_status, v_paid;
  END IF;
END $$;

\echo ''
\echo '=== A5: cartao nao guarda numero — so bandeira/last4/token ==='
DO $$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(column_name, ',') INTO v_bad
    FROM information_schema.columns
   WHERE table_name = 'payment_methods'
     AND column_name ~* '(card_number|pan|cvv|cvc|security_code)';
  IF v_bad IS NULL THEN RAISE NOTICE 'A5 PASS — nenhuma coluna de dado sensivel de cartao';
  ELSE RAISE NOTICE 'A5 FAIL — %', v_bad; END IF;
END $$;
