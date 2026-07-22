-- Behaviour proof for 0009_products_canonical.sql.
\set ON_ERROR_STOP off

\echo '=== seed: two shop products, one active one draft ==='
DELETE FROM plg_shop_order_items;
DELETE FROM plg_shop_orders;
DELETE FROM plg_shop_products;
DELETE FROM products;

INSERT INTO plg_shop_products (id, tenant_id, name, slug, price, status, inventory_count, sku, description)
VALUES
  ('00000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000104',
   'Costela Ativa', 'costela-ativa', 69.99, 'active', 5, 'ART-A', 'defumada 12h'),
  ('00000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-000000000104',
   'Rascunho Secreto', 'rascunho-secreto', 10.00, 'draft', 2, 'ART-D', 'não publicado'),
  -- tenant sem linha em `tenants`, exatamente como o pool real
  ('00000000-0000-4000-8000-0000000000a3', 'a496ec63-9a9a-4cce-a699-76140aa9225f',
   'Sample Product', 'sample-product', 1.00, 'active', 1, 'ORF-1', 'tenant orfao');

\echo ''
\echo '=== aplicando 0009 sobre os dados semeados ==='
\i /tmp/migrations/0009_products_canonical.sql

\echo ''
\echo '=== P1: backfill cria um products por plg_shop_products, com o MESMO id ==='
DO $$
DECLARE v_shop int; v_core int; v_same int;
BEGIN
  -- só as linhas cujo tenant existe entram no backfill (ver P10)
  SELECT count(*) INTO v_shop FROM plg_shop_products s
   WHERE EXISTS (SELECT 1 FROM tenants t WHERE t.id = s.tenant_id);
  SELECT count(*) INTO v_core FROM products;
  SELECT count(*) INTO v_same FROM plg_shop_products s JOIN products p ON p.id = s.id;
  IF v_shop = v_core AND v_same = v_shop THEN
    RAISE NOTICE 'P1 PASS — % produtos, ids preservados', v_core;
  ELSE
    RAISE NOTICE 'P1 FAIL — shop=% core=% ids_iguais=%', v_shop, v_core, v_same;
  END IF;
END $$;

\echo ''
\echo '=== P2: product_id preenchido e com FK para products ==='
DO $$
DECLARE v_null int; v_fk int;
BEGIN
  -- órfãos ficam com product_id NULL de propósito (ver P10); qualquer outra
  -- linha sem link é bug.
  SELECT count(*) INTO v_null FROM plg_shop_products s
   WHERE s.product_id IS NULL
     AND EXISTS (SELECT 1 FROM tenants t WHERE t.id = s.tenant_id);
  SELECT count(*) INTO v_fk FROM pg_constraint
   WHERE conname = 'plg_shop_products_product_fk';
  IF v_null = 0 AND v_fk = 1 THEN
    RAISE NOTICE 'P2 PASS — todos linkados, FK presente';
  ELSE
    RAISE NOTICE 'P2 FAIL — product_id nulo em % linhas, FK=%', v_null, v_fk;
  END IF;
END $$;

\echo ''
\echo '=== P3: a view NAO expõe cost (margem) ==='
DO $$
DECLARE v_leak text;
BEGIN
  SELECT string_agg(column_name, ',') INTO v_leak
    FROM information_schema.columns
   WHERE table_name = 'plg_shop_catalog'
     AND column_name IN ('cost', 'min_stock', 'is_active');
  IF v_leak IS NULL THEN
    RAISE NOTICE 'P3 PASS — nenhuma coluna de custo/interna na view';
  ELSE
    RAISE NOTICE 'P3 FAIL — view expõe %', v_leak;
  END IF;
END $$;

\echo ''
\echo '=== P4: a view mostra só produto ativo (rascunho não vaza) ==='
DO $$
DECLARE v_total int; v_draft int;
BEGIN
  SELECT count(*) INTO v_total FROM plg_shop_catalog;
  SELECT count(*) INTO v_draft FROM plg_shop_catalog WHERE slug = 'rascunho-secreto';
  IF v_total = 1 AND v_draft = 0 THEN
    RAISE NOTICE 'P4 PASS — 1 produto visível, rascunho oculto';
  ELSE
    RAISE NOTICE 'P4 FAIL — total=% rascunho_visivel=%', v_total, v_draft;
  END IF;
END $$;

\echo ''
\echo '=== P5: anon pode ler a view e NAO pode ler products ==='
DO $$
DECLARE v_view boolean; v_table boolean;
BEGIN
  SELECT has_table_privilege('anon', 'public.plg_shop_catalog', 'SELECT') INTO v_view;
  SELECT has_table_privilege('anon', 'public.products', 'SELECT') INTO v_table;
  IF v_view AND NOT v_table THEN
    RAISE NOTICE 'P5 PASS — anon lê a view, não lê products';
  ELSE
    RAISE NOTICE 'P5 FAIL — view=% products=%', v_view, v_table;
  END IF;
END $$;

\echo ''
\echo '=== P6: vender espelha o estoque para products.stock ==='
DO $$
DECLARE v_order uuid; v_shop int; v_core numeric;
BEGIN
  SELECT shop_place_order(
    '10000000-0000-4000-8000-000000000104'::uuid,
    '[{"product_id":"00000000-0000-4000-8000-0000000000a1","quantity":2}]'::jsonb,
    NULL, 'Comprador', 'mirror@test.local'
  ) INTO v_order;

  SELECT inventory_count INTO v_shop FROM plg_shop_products
   WHERE id = '00000000-0000-4000-8000-0000000000a1';
  SELECT stock INTO v_core FROM products
   WHERE id = '00000000-0000-4000-8000-0000000000a1';

  IF v_shop = 3 AND v_core = 3 THEN
    RAISE NOTICE 'P6 PASS — loja 5→%, estoque central acompanhou (%)', v_shop, v_core;
  ELSE
    RAISE NOTICE 'P6 FAIL — loja=% central=%', v_shop, v_core;
  END IF;
END $$;

\echo ''
\echo '=== P8: renomear/reprecificar na loja reflete no produto central ==='
DO $$
DECLARE v_name text; v_price numeric; v_active boolean;
BEGIN
  UPDATE plg_shop_products
     SET name = 'Costela Renomeada', price = 88.50, status = 'draft'
   WHERE id = '00000000-0000-4000-8000-0000000000a1';

  SELECT name, price, is_active INTO v_name, v_price, v_active
    FROM products WHERE id = '00000000-0000-4000-8000-0000000000a1';

  IF v_name = 'Costela Renomeada' AND v_price = 88.50 AND v_active = false THEN
    RAISE NOTICE 'P8 PASS — nome, preço e publicação espelhados';
  ELSE
    RAISE NOTICE 'P8 FAIL — nome=% preco=% ativo=%', v_name, v_price, v_active;
  END IF;
END $$;

\echo ''
\echo '=== P9: produto NOVO na loja ganha produto central automaticamente ==='
DO $$
DECLARE v_core int; v_link uuid;
BEGIN
  INSERT INTO plg_shop_products (tenant_id, name, slug, price, status, inventory_count, sku)
  VALUES ('10000000-0000-4000-8000-000000000104', 'Novo Item', 'novo-item', 12.00, 'active', 4, 'ART-N');

  SELECT count(*) INTO v_core FROM products p
    JOIN plg_shop_products s ON s.product_id = p.id WHERE s.slug = 'novo-item';
  SELECT product_id INTO v_link FROM plg_shop_products WHERE slug = 'novo-item';

  IF v_core = 1 AND v_link IS NOT NULL THEN
    RAISE NOTICE 'P9 PASS — produto central criado e linkado (%)', v_link;
  ELSE
    RAISE NOTICE 'P9 FAIL — central=% link=%', v_core, v_link;
  END IF;
END $$;

\echo ''
\echo '=== P10: tenant sem linha em tenants nao quebra a migration ==='
DO $$
DECLARE v_core int; v_orphan int;
BEGIN
  SELECT count(*) INTO v_core FROM products;
  SELECT count(*) INTO v_orphan FROM products
   WHERE tenant_id = 'a496ec63-9a9a-4cce-a699-76140aa9225f';
  -- 3 shop rows, 1 delas orfa => 2 produtos centrais, e a orfa fica de fora
  IF v_orphan = 0 AND v_core >= 2 THEN
    RAISE NOTICE 'P10 PASS — orfao pulado, % produtos migrados', v_core;
  ELSE
    RAISE NOTICE 'P10 FAIL — core=% orfaos_migrados=%', v_core, v_orphan;
  END IF;
END $$;

\echo ''
\echo '=== P7: rodar a migration duas vezes não duplica nada ==='
-- Conta antes de reaplicar em vez de fixar um número: os testes acima criam
-- produtos, e um valor cravado aqui quebra sempre que a suíte cresce.
CREATE TEMP TABLE _p7 AS SELECT count(*) AS n FROM products;
\i /tmp/migrations/0009_products_canonical.sql
DO $$
DECLARE v_before int; v_after int;
BEGIN
  SELECT n INTO v_before FROM _p7;
  SELECT count(*) INTO v_after FROM products;
  IF v_before = v_after THEN
    RAISE NOTICE 'P7 PASS — idempotente (% produtos antes e depois)', v_after;
  ELSE
    RAISE NOTICE 'P7 FAIL — % antes, % depois', v_before, v_after;
  END IF;
END $$;
