-- ============================================================================
-- 0021 — frete por faixa de CEP
--
-- Self-contained: builds its own tenant, product and zones. Two tenants on
-- purpose — one WITH zones and one WITHOUT — because the whole rollout promise
-- is that a store with no zones does not change behaviour, and a test that only
-- exercises the new path proves nothing about that.
-- ============================================================================
\set ON_ERROR_STOP off
\pset pager off

\echo === shipping zones (0021) ===

BEGIN;

INSERT INTO public.tenants (id, name, slug, storefront_published) VALUES
  ('60000000-0000-4000-8000-000000000001', 'Loja Com Zonas', 'zone-with',    true),
  ('60000000-0000-4000-8000-000000000002', 'Loja Sem Zonas', 'zone-without', true)
ON CONFLICT (id) DO NOTHING;

-- The no-zone tenant keeps a classic flat rate, so Z3 can assert it survives.
INSERT INTO public.shipping_settings (tenant_id, flat_rate, free_above) VALUES
  ('60000000-0000-4000-8000-000000000001', 99.00, NULL),
  ('60000000-0000-4000-8000-000000000002', 25.00, 300.00)
ON CONFLICT (tenant_id) DO UPDATE
  SET flat_rate = EXCLUDED.flat_rate, free_above = EXCLUDED.free_above;

-- Rio: 20000-000..23799-999 · São Paulo capital: 01000-000..05999-999
-- The two SP zones overlap deliberately, to pin down tie-breaking (Z7).
INSERT INTO public.shipping_zones
  (id, tenant_id, name, carrier, postal_from, postal_to, rate, free_above, eta_min_days, eta_max_days, sort_order)
VALUES
  ('60000000-0000-4000-8000-0000000000a1', '60000000-0000-4000-8000-000000000001',
   'Rio de Janeiro', 'Motoboy', '20000000', '23799999', 8.00, 150.00, 0, 1, 0),
  ('60000000-0000-4000-8000-0000000000a2', '60000000-0000-4000-8000-000000000001',
   'São Paulo capital', 'Correios', '01000000', '05999999', 29.90, NULL, 2, 5, 0),
  ('60000000-0000-4000-8000-0000000000a3', '60000000-0000-4000-8000-000000000001',
   'SP promocional', 'Correios', '01000000', '01999999', 19.90, NULL, 3, 6, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plg_shop_products (id, tenant_id, name, slug, price, currency, status, inventory_count) VALUES
  ('60000000-0000-4000-8000-0000000000f1', '60000000-0000-4000-8000-000000000001', 'Costela Zona', 'zone-prod', 50, 'BRL', 'active', 500),
  ('60000000-0000-4000-8000-0000000000f2', '60000000-0000-4000-8000-000000000002', 'Costela Flat',  'flat-prod', 50, 'BRL', 'active', 500)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- Z1 — CEP inside a zone quotes that zone, with its rate and ETA
-- ---------------------------------------------------------------------------
\echo --- Z1 CEP dentro da faixa
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.shop_quote_shipping(
    '60000000-0000-4000-8000-000000000001', '22041-001', 50) LIMIT 1;

  IF FOUND AND r.name = 'Rio de Janeiro' AND r.rate = 8.00
     AND r.eta_min_days = 0 AND r.eta_max_days = 1 AND NOT r.free THEN
    RAISE NOTICE 'Z1 PASS — % a R$ % (% a % dias)', r.name, r.rate, r.eta_min_days, r.eta_max_days;
  ELSE
    RAISE NOTICE 'Z1 FAIL — zona=% rate=% eta=%-%', r.name, r.rate, r.eta_min_days, r.eta_max_days;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Z2 — a CEP outside every zone is not served, and the ORDER is refused
--      (a coverage rule the RPC does not enforce is only decoration)
-- ---------------------------------------------------------------------------
\echo --- Z2 CEP fora de toda faixa
DO $$
DECLARE v_options int; v_state text; v_order uuid;
BEGIN
  SELECT count(*) INTO v_options FROM public.shop_quote_shipping(
    '60000000-0000-4000-8000-000000000001', '90000-000', 50);

  BEGIN
    v_order := public.shop_place_order(
      '60000000-0000-4000-8000-000000000001',
      '[{"product_id":"60000000-0000-4000-8000-0000000000f1","quantity":1}]'::jsonb,
      NULL, 'QA Fora', 'fora@zone.test', 'BRL', NULL, 0, NULL,
      '{"postal_code":"90000000","street":"Rua Distante","city":"Porto Alegre","state":"RS"}'::jsonb,
      'pix');
    v_state := 'no-error';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;

  IF v_options = 0 AND v_state = '22023' THEN
    RAISE NOTICE 'Z2 PASS — sem cotacao e pedido recusado (22023)';
  ELSE
    RAISE NOTICE 'Z2 FAIL — options=% sqlstate=%', v_options, v_state;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Z3 — a tenant with NO zones keeps the 0015 flat rate untouched.
--      This is the rollout promise: no live store changes price on deploy day.
-- ---------------------------------------------------------------------------
\echo --- Z3 loja sem zonas mantem o comportamento de 0015
DO $$
DECLARE v_cheap numeric; v_rich numeric; v_order uuid; v_ship numeric;
BEGIN
  -- flat 25, free above 300
  v_cheap := public.shop_shipping_for('60000000-0000-4000-8000-000000000002', 100, '90000-000');
  v_rich  := public.shop_shipping_for('60000000-0000-4000-8000-000000000002', 400, NULL);

  -- and an order to an address nobody covers still goes through for this store
  v_order := public.shop_place_order(
    '60000000-0000-4000-8000-000000000002',
    '[{"product_id":"60000000-0000-4000-8000-0000000000f2","quantity":1}]'::jsonb,
    NULL, 'QA Flat', 'flat@zone.test', 'BRL', NULL, 0, NULL,
    '{"postal_code":"90000000","street":"Rua Distante","city":"Porto Alegre","state":"RS"}'::jsonb,
    'pix');
  SELECT shipping_total INTO v_ship FROM public.plg_shop_orders WHERE id = v_order;

  IF v_cheap = 25.00 AND v_rich = 0 AND v_ship = 25.00 THEN
    RAISE NOTICE 'Z3 PASS — flat 25, gratis acima de 300, pedido aceito (frete %)', v_ship;
  ELSE
    RAISE NOTICE 'Z3 FAIL — cheap=% rich=% pedido=%', v_cheap, v_rich, v_ship;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Z4 — the zone's own free_above beats the store-wide one
-- ---------------------------------------------------------------------------
\echo --- Z4 free_above da zona vence o global
DO $$
DECLARE r record; v_sp numeric;
BEGIN
  -- Rio zone: free above 150. Store-wide setting has NO free_above at all.
  SELECT * INTO r FROM public.shop_quote_shipping(
    '60000000-0000-4000-8000-000000000001', '22041-001', 200) LIMIT 1;
  -- SP zone has no free_above of its own, so a big order still pays.
  v_sp := public.shop_shipping_for('60000000-0000-4000-8000-000000000001', 5000, '04101-000');

  IF r.rate = 0 AND r.free AND v_sp = 29.90 THEN
    RAISE NOTICE 'Z4 PASS — Rio gratis acima de 150, SP segue cobrando %', v_sp;
  ELSE
    RAISE NOTICE 'Z4 FAIL — rio=% free=% sp=%', r.rate, r.free, v_sp;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Z5 — THE INVARIANT: what was quoted is what the order charges.
--
-- This is the regression that matters most. 0017 exists because the screen and
-- the server computed shipping from different subtotals; now the screen shows a
-- quote while the order recomputes from scratch, which is the same trap with a
-- new shape. Quote and order must agree to the cent.
-- ---------------------------------------------------------------------------
\echo --- Z5 cotacao == frete gravado
DO $$
DECLARE v_quote numeric; v_order uuid; v_ship numeric; v_sub numeric;
BEGIN
  -- 2 x 50 = 100, no discount, so the quote subtotal is the order subtotal.
  SELECT q.rate INTO v_quote FROM public.shop_quote_shipping(
    '60000000-0000-4000-8000-000000000001', '22041-001', 100) q LIMIT 1;

  v_order := public.shop_place_order(
    '60000000-0000-4000-8000-000000000001',
    '[{"product_id":"60000000-0000-4000-8000-0000000000f1","quantity":2}]'::jsonb,
    NULL, 'QA Cotacao', 'cotacao@zone.test', 'BRL', NULL, 0, NULL,
    '{"postal_code":"22041001","street":"Av Atlantica","number":"1702","district":"Copacabana","city":"Rio de Janeiro","state":"RJ"}'::jsonb,
    'pix');

  SELECT shipping_total, subtotal INTO v_ship, v_sub
    FROM public.plg_shop_orders WHERE id = v_order;

  IF v_quote = v_ship AND v_sub = 100 THEN
    RAISE NOTICE 'Z5 PASS — cotado % e cobrado % (subtotal %)', v_quote, v_ship, v_sub;
  ELSE
    RAISE NOTICE 'Z5 FAIL — cotado % mas cobrado % (subtotal %)', v_quote, v_ship, v_sub;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Z6 — a forged p_shipping_total is still ignored (do not regress 0015)
-- ---------------------------------------------------------------------------
\echo --- Z6 frete forjado pelo cliente segue ignorado
DO $$
DECLARE v_order uuid; v_ship numeric;
BEGIN
  v_order := public.shop_place_order(
    '60000000-0000-4000-8000-000000000001',
    '[{"product_id":"60000000-0000-4000-8000-0000000000f1","quantity":1}]'::jsonb,
    NULL, 'QA Forja', 'forja@zone.test', 'BRL', NULL,
    999999.00,   -- <- the client's number
    NULL,
    '{"postal_code":"22041001","street":"Av Atlantica","city":"Rio de Janeiro","state":"RJ"}'::jsonb,
    'pix');
  SELECT shipping_total INTO v_ship FROM public.plg_shop_orders WHERE id = v_order;

  IF v_ship = 8.00 THEN
    RAISE NOTICE 'Z6 PASS — frete forjado ignorado, cobrado % (zona do Rio)', v_ship;
  ELSE
    RAISE NOTICE 'Z6 FAIL — frete do cliente vazou: %', v_ship;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Z7 — overlapping zones resolve to the cheapest, deterministically
-- ---------------------------------------------------------------------------
\echo --- Z7 faixas sobrepostas escolhem a mais barata
DO $$
DECLARE r record; v_count int; v_again numeric;
BEGIN
  -- 01310-100 falls inside BOTH 'São Paulo capital' (29.90) and 'SP promocional' (19.90).
  SELECT count(*) INTO v_count FROM public.shop_quote_shipping(
    '60000000-0000-4000-8000-000000000001', '01310-100', 50);
  SELECT * INTO r FROM public.shop_quote_shipping(
    '60000000-0000-4000-8000-000000000001', '01310-100', 50) LIMIT 1;
  v_again := public.shop_shipping_for('60000000-0000-4000-8000-000000000001', 50, '01310100');

  IF v_count = 2 AND r.rate = 19.90 AND v_again = 19.90 THEN
    RAISE NOTICE 'Z7 PASS — 2 opcoes, mais barata (%) escolhida pelos dois caminhos', r.rate;
  ELSE
    RAISE NOTICE 'Z7 FAIL — count=% primeira=% shipping_for=%', v_count, r.rate, v_again;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Z8 — a CEP typed with punctuation, or short, behaves sanely
-- ---------------------------------------------------------------------------
\echo --- Z8 normalizacao do CEP digitado
DO $$
DECLARE v_masked numeric; v_plain numeric; v_short int;
BEGIN
  v_masked := public.shop_shipping_for('60000000-0000-4000-8000-000000000001', 50, '22.041-001');
  v_plain  := public.shop_shipping_for('60000000-0000-4000-8000-000000000001', 50, '22041001');
  SELECT count(*) INTO v_short FROM public.shop_quote_shipping(
    '60000000-0000-4000-8000-000000000001', '2204', 50);

  IF v_masked = v_plain AND v_masked = 8.00 AND v_short = 0 THEN
    RAISE NOTICE 'Z8 PASS — mascara ignorada, CEP incompleto nao cota';
  ELSE
    RAISE NOTICE 'Z8 FAIL — masked=% plain=% short=%', v_masked, v_plain, v_short;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Z9 (0022) — the quote carries the inputs, so a client can re-resolve it
--
-- Without base_rate/free_above the storefront had to fall back to the flat rate
-- whenever the cart changed, and the flat rate is a DIFFERENT zone's price:
-- quoted 18, cart displayed 8, order charged 18.
-- ---------------------------------------------------------------------------
\echo --- Z9 a cotacao expoe base_rate e free_above
DO $$
DECLARE r record; v_derived numeric; v_server numeric;
BEGIN
  -- Quote for an empty cart (subtotal 0), then re-derive for a 200 cart the way
  -- the browser does, and compare against what the server charges at 200.
  SELECT * INTO r FROM public.shop_quote_shipping(
    '60000000-0000-4000-8000-000000000001', '22041-001', 0) LIMIT 1;

  v_derived := CASE WHEN r.free_above IS NOT NULL AND 200 >= r.free_above
                    THEN 0 ELSE r.base_rate END;
  v_server  := public.shop_shipping_for('60000000-0000-4000-8000-000000000001', 200, '22041001');

  IF r.base_rate = 8.00 AND r.free_above = 150.00 AND v_derived = v_server AND v_derived = 0 THEN
    RAISE NOTICE 'Z9 PASS — base % / gratis acima de %, cliente e servidor derivam % em um carrinho de 200',
      r.base_rate, r.free_above, v_derived;
  ELSE
    RAISE NOTICE 'Z9 FAIL — base=% free_above=% derivado=% servidor=%',
      r.base_rate, r.free_above, v_derived, v_server;
  END IF;
END $$;
