-- ============================================================================
-- @fayz-ai/shop — orders, customers and categories become CORE records
-- ----------------------------------------------------------------------------
-- Third and largest application of the same rule 0009 and 0012 followed: a
-- domain entity lives in core, a plugin only extends it. plg_shop_orders,
-- plg_shop_customers and plg_shop_categories each duplicated a core table that
-- was sitting empty:
--
--   plg_shop_customers   → people      (kind = 'customer')
--   plg_shop_orders      → orders      (kind = 'shop')
--   plg_shop_order_items → order_items
--   plg_shop_categories  → categories  (kind = 'shop')
--
-- EXPAND phase only. Nothing is dropped and no reader changes: the shop tables
-- keep every column they had, gain a link to their core counterpart, and a
-- trigger keeps the two in step. The SDK can then migrate table by table, and a
-- later CONTRACT migration removes the duplicated columns once nothing reads
-- them. Doing expand and contract in one step is how a migration becomes
-- unrollbackable.
--
-- Ids are PRESERVED throughout, exactly as in 0009: plg_shop_order_items,
-- plg_shop_fulfillments and every RPC already reference these uuids, and
-- reissuing them would rewrite live history.
--
-- Two guards carried over from 0009, both learned the hard way:
--   • rows whose tenant has no `tenants` row are skipped (products.tenant_id and
--     friends have a FK; the plg_ tables never did);
--   • order items whose product did not make it into core get product_id NULL
--     rather than failing the whole migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Customers → people
-- ----------------------------------------------------------------------------
INSERT INTO public.people (
  id, tenant_id, kind, name, email, phone, notes, is_active, metadata, created_at, updated_at
)
SELECT
  c.id,
  c.tenant_id,
  'customer',
  NULLIF(btrim(concat_ws(' ', c.first_name, c.last_name)), ''),
  c.email,
  c.phone,
  c.notes,
  true,
  jsonb_build_object('source', 'shop', 'orders_count', c.orders_count, 'total_spent', c.total_spent),
  c.created_at,
  c.updated_at
FROM public.plg_shop_customers c
WHERE EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
  -- people.name is NOT NULL; a customer with neither name nor email cannot be
  -- represented and is left behind rather than invented as 'Unknown'.
  AND NULLIF(btrim(concat_ws(' ', c.first_name, c.last_name)), '') IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.plg_shop_customers
  ADD COLUMN IF NOT EXISTS person_id uuid;

UPDATE public.plg_shop_customers c
   SET person_id = c.id
 WHERE c.person_id IS NULL
   AND EXISTS (SELECT 1 FROM public.people p WHERE p.id = c.id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plg_shop_customers_person_fk') THEN
    ALTER TABLE public.plg_shop_customers
      ADD CONSTRAINT plg_shop_customers_person_fk
      FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Categories → categories (kind = 'shop')
-- ----------------------------------------------------------------------------
INSERT INTO public.categories (
  id, tenant_id, kind, name, slug, parent_id, sort_order, is_active, metadata, created_at
)
SELECT
  c.id, c.tenant_id, 'shop', c.name, c.slug, c.parent_id, c.sort_order, true,
  jsonb_build_object('source', 'shop', 'description', c.description),
  c.created_at
FROM public.plg_shop_categories c
WHERE EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = c.tenant_id)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Orders → orders (kind = 'shop')
--    Core carries the identity and the money everyone agrees on; the shop
--    extension keeps what only a storefront has (payment/fulfilment status,
--    shipping total, coupon code, delivery snapshot).
-- ----------------------------------------------------------------------------
INSERT INTO public.orders (
  id, tenant_id, kind, reference_number, status, party_id,
  subtotal, discount, tax, total, currency, notes, metadata, created_at, updated_at
)
SELECT
  o.id,
  o.tenant_id,
  'shop',
  o.order_number::text,
  o.status,
  -- Only link a party that actually made it into people.
  (SELECT p.id FROM public.people p WHERE p.id = o.customer_id),
  o.subtotal, o.discount_total, o.tax_total, o.total, o.currency, o.notes,
  jsonb_build_object(
    'source', 'shop',
    'financial_status', o.financial_status,
    'fulfillment_status', o.fulfillment_status,
    'shipping_total', o.shipping_total,
    'discount_code', o.discount_code,
    'customer_email', o.customer_email
  ),
  o.created_at, o.updated_at
FROM public.plg_shop_orders o
WHERE EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = o.tenant_id)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.plg_shop_orders
  ADD COLUMN IF NOT EXISTS order_id uuid;

UPDATE public.plg_shop_orders o
   SET order_id = o.id
 WHERE o.order_id IS NULL
   AND EXISTS (SELECT 1 FROM public.orders c WHERE c.id = o.id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plg_shop_orders_order_fk') THEN
    ALTER TABLE public.plg_shop_orders
      ADD CONSTRAINT plg_shop_orders_order_fk
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Order items → order_items.
--    sku and image_url have no core column; they go to metadata rather than
--    being dropped, because the order item is a historical document.
-- ----------------------------------------------------------------------------
INSERT INTO public.order_items (
  id, order_id, product_id, name, quantity, unit_price, discount, total, metadata, created_at
)
SELECT
  i.id,
  i.order_id,
  (SELECT p.id FROM public.products p WHERE p.id = i.product_id),
  i.name, i.quantity, i.unit_price, 0, i.total,
  jsonb_strip_nulls(jsonb_build_object('source', 'shop', 'sku', i.sku, 'image_url', i.image_url)),
  i.created_at
FROM public.plg_shop_order_items i
WHERE EXISTS (SELECT 1 FROM public.orders o WHERE o.id = i.order_id)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. Keep core in step while the shop tables are still the writers.
--    Same one-directional mirror 0009 uses for products. The CONTRACT migration
--    reverses authority and deletes these.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_mirror_customer_to_person()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text := NULLIF(btrim(concat_ws(' ', NEW.first_name, NEW.last_name)), '');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.tenant_id) OR v_name IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.people (id, tenant_id, kind, name, email, phone, notes, is_active, metadata)
  VALUES (NEW.id, NEW.tenant_id, 'customer', v_name, NEW.email, NEW.phone, NEW.notes, true,
          jsonb_build_object('source','shop','orders_count',NEW.orders_count,'total_spent',NEW.total_spent))
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
        notes = EXCLUDED.notes, metadata = EXCLUDED.metadata, updated_at = now();

  IF NEW.person_id IS NULL THEN NEW.person_id := NEW.id; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plg_shop_customers_mirror ON public.plg_shop_customers;
CREATE TRIGGER plg_shop_customers_mirror
  BEFORE INSERT OR UPDATE ON public.plg_shop_customers
  FOR EACH ROW EXECUTE FUNCTION public.shop_mirror_customer_to_person();

CREATE OR REPLACE FUNCTION public.shop_mirror_order_to_core()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.tenant_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.orders (
    id, tenant_id, kind, reference_number, status, party_id,
    subtotal, discount, tax, total, currency, notes, metadata
  ) VALUES (
    NEW.id, NEW.tenant_id, 'shop', NEW.order_number::text, NEW.status,
    (SELECT p.id FROM public.people p WHERE p.id = NEW.customer_id),
    NEW.subtotal, NEW.discount_total, NEW.tax_total, NEW.total, NEW.currency, NEW.notes,
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
        total = EXCLUDED.total, notes = EXCLUDED.notes,
        metadata = EXCLUDED.metadata, updated_at = now();

  IF NEW.order_id IS NULL THEN NEW.order_id := NEW.id; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plg_shop_orders_mirror ON public.plg_shop_orders;
CREATE TRIGGER plg_shop_orders_mirror
  BEFORE INSERT OR UPDATE ON public.plg_shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.shop_mirror_order_to_core();

CREATE OR REPLACE FUNCTION public.shop_mirror_order_item_to_core()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = NEW.order_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.order_items (
    id, order_id, product_id, name, quantity, unit_price, discount, total, metadata
  ) VALUES (
    NEW.id, NEW.order_id,
    (SELECT p.id FROM public.products p WHERE p.id = NEW.product_id),
    NEW.name, NEW.quantity, NEW.unit_price, 0, NEW.total,
    jsonb_strip_nulls(jsonb_build_object('source','shop','sku',NEW.sku,'image_url',NEW.image_url))
  )
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, quantity = EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price, total = EXCLUDED.total,
        metadata = EXCLUDED.metadata;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plg_shop_order_items_mirror ON public.plg_shop_order_items;
CREATE TRIGGER plg_shop_order_items_mirror
  AFTER INSERT OR UPDATE ON public.plg_shop_order_items
  FOR EACH ROW EXECUTE FUNCTION public.shop_mirror_order_item_to_core();

-- ----------------------------------------------------------------------------
-- 6. Now that an order exists in core, the payment ledger can point at it
--    properly instead of carrying the id in metadata (0012's stopgap).
-- ----------------------------------------------------------------------------
UPDATE public.transactions t
   SET order_id = (t.metadata->>'shop_order_id')::uuid
 WHERE t.kind = 'shop_payment'
   AND t.order_id IS NULL
   AND t.metadata->>'shop_order_id' IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = (t.metadata->>'shop_order_id')::uuid);

-- ----------------------------------------------------------------------------
-- 7. Report what stayed behind, so the gap is visible instead of assumed empty.
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_c int; v_o int; v_i int;
BEGIN
  SELECT count(*) INTO v_c FROM public.plg_shop_customers WHERE person_id IS NULL;
  SELECT count(*) INTO v_o FROM public.plg_shop_orders   WHERE order_id  IS NULL;
  SELECT count(*) INTO v_i FROM public.plg_shop_order_items i
   WHERE NOT EXISTS (SELECT 1 FROM public.order_items c WHERE c.id = i.id);

  RAISE NOTICE 'shop→core: % cliente(s), % pedido(s) e % item(ns) NAO migrados (tenant sem linha em tenants, ou cliente sem nome nem email).',
    v_c, v_o, v_i;
END $$;
