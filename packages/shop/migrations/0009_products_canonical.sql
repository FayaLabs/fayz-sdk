-- ============================================================================
-- @fayz-ai/shop — one product, many plugins (phase A: additive, non-breaking)
-- ----------------------------------------------------------------------------
-- The `plg_` prefix means "plugin table", but plg_shop_products has been the
-- ONLY product entity: it carries identity (name, sku), stock (inventory_count)
-- AND storefront presentation (slug, compare_at_price, sort_order). Meanwhile
-- public.products — the canonical product the inventory/financial plugins read —
-- sits completely empty. That is why Estoque › Produtos and Loja › Produtos show
-- different things: they are different tables, and only one was ever populated.
--
-- Target shape:
--
--   public.products            identity + cost + stock, one row per real product
--   plg_shop_products          storefront extension, linked by product_id
--   plg_shop_catalog (view)    the ONLY thing anon may read
--
-- This migration is deliberately ADDITIVE. It backfills, links and exposes, but
-- drops nothing: the SDK still reads plg_shop_products' own columns, so the
-- storefront and admin keep working untouched while the code catches up. Column
-- removal is a later migration, after the readers move to the view.
--
-- Stock authority during phase A stays with plg_shop_products.inventory_count,
-- because shop_place_order decrements it inside the order transaction. A trigger
-- mirrors it into products.stock so the inventory screens stop lying. Phase B
-- flips authority to products.stock and the mirror is removed.
--
-- Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Backfill the canonical product, PRESERVING ids.
--    Ids must be preserved: plg_shop_order_items.product_id and
--    plg_shop_product_images.product_id already point at them, and rewriting
--    those would rewrite order history.
-- ----------------------------------------------------------------------------
--    products.tenant_id REFERENCES tenants(id); plg_shop_products.tenant_id does
--    NOT. The pool therefore contains shop rows whose tenant was never created,
--    and backfilling them raises 23503. Those are skipped and reported rather
--    than inventing a tenants row on their behalf — a store with no tenant is a
--    data problem to look at, not something a migration should paper over.
--    category_id is deliberately NOT copied: products.category_id references
--    public.categories, while plg_shop_products.category_id references
--    plg_shop_categories. Two different namespaces — copying the id across
--    raises 23503. Mapping the taxonomies is its own migration.
INSERT INTO public.products (
  id, tenant_id, name, description, sku,
  price, currency, stock, status, is_active, metadata, created_at, updated_at
)
SELECT
  p.id,
  p.tenant_id,
  p.name,
  p.description,
  p.sku,
  p.price,
  p.currency,
  p.inventory_count,
  p.status,
  (p.status = 'active'),
  p.metadata,
  p.created_at,
  p.updated_at
FROM public.plg_shop_products p
WHERE EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = p.tenant_id)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE v_orphans text;
BEGIN
  SELECT string_agg(DISTINCT p.tenant_id::text, ', ') INTO v_orphans
    FROM public.plg_shop_products p
   WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = p.tenant_id);

  IF v_orphans IS NOT NULL THEN
    RAISE WARNING 'shop: skipped products of tenant(s) with no tenants row: %. Create the tenant and re-run this migration (it is idempotent).', v_orphans;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. The link the plugin table always should have had.
--    1:1 for now (a storefront row extends exactly one product), enforced by the
--    unique index rather than by making product_id the PK, so existing rows and
--    foreign keys keep working.
-- ----------------------------------------------------------------------------
ALTER TABLE public.plg_shop_products
  ADD COLUMN IF NOT EXISTS product_id uuid;

-- Only link rows that actually got a canonical product: an orphan-tenant row
-- has none, and pointing its product_id at a missing id would make the FK below
-- unaddable. Orphans keep product_id NULL until their tenant is created and this
-- migration is re-run.
UPDATE public.plg_shop_products s
   SET product_id = s.id
 WHERE s.product_id IS NULL
   AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = s.id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'plg_shop_products_product_fk'
       AND conrelid = 'public.plg_shop_products'::regclass
  ) THEN
    ALTER TABLE public.plg_shop_products
      ADD CONSTRAINT plg_shop_products_product_fk
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS plg_shop_products_product_uidx
  ON public.plg_shop_products (product_id);

-- ----------------------------------------------------------------------------
-- 3. Keep the canonical product in step while the shop still owns the data.
--
--    Every column the two tables SHARE is mirrored, not just stock: a merchant
--    renaming a product or fixing its price in Loja › Produtos must not leave
--    Estoque › Produtos showing the old value. Storefront-only columns (slug,
--    compare_at_price, sort_order, weight…) are not mirrored — they have no
--    counterpart and belong to the extension.
--
--    One direction only (shop → products): a bidirectional pair would recurse.
--    Phase B flips authority to products and deletes this trigger along with the
--    duplicated columns.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shop_mirror_to_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- INSERT also covers rows created before this trigger existed, because the
  -- backfill above ran first and every shop row now has a products counterpart.
  UPDATE public.products
     SET name        = NEW.name,
         description = NEW.description,
         sku         = NEW.sku,
         price       = NEW.price,
         currency    = NEW.currency,
         status      = NEW.status,
         is_active   = (NEW.status = 'active'),
         stock       = NEW.inventory_count,
         updated_at  = now()
   WHERE id = COALESCE(NEW.product_id, NEW.id)
     AND (name, description, sku, price, currency, status, is_active, stock)
         IS DISTINCT FROM
         (NEW.name, NEW.description, NEW.sku, NEW.price, NEW.currency,
          NEW.status, (NEW.status = 'active'), NEW.inventory_count);
  RETURN NEW;
END;
$$;

-- Superseded name from an earlier draft of this file.
DROP TRIGGER IF EXISTS plg_shop_products_mirror_stock ON public.plg_shop_products;
DROP FUNCTION IF EXISTS public.shop_mirror_stock_to_product();

DROP TRIGGER IF EXISTS plg_shop_products_mirror ON public.plg_shop_products;
CREATE TRIGGER plg_shop_products_mirror
  AFTER INSERT OR UPDATE ON public.plg_shop_products
  FOR EACH ROW EXECUTE FUNCTION public.shop_mirror_to_product();

-- A shop row created AFTER this migration has no canonical product yet; create
-- it, then let the trigger keep it in step.
CREATE OR REPLACE FUNCTION public.shop_ensure_canonical_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Same orphan guard as the backfill: a shop row may carry a tenant_id that
  -- has no tenants row (nothing enforces it on this table), and the FK on
  -- products would reject the insert. Skip instead of failing the write —
  -- refusing to save a product because of unrelated tenancy debt would be worse.
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.tenant_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.products (
    id, tenant_id, name, description, sku,
    price, currency, stock, status, is_active, metadata
  ) VALUES (
    COALESCE(NEW.product_id, NEW.id), NEW.tenant_id, NEW.name,
    NEW.description, NEW.sku, NEW.price, NEW.currency, NEW.inventory_count,
    NEW.status, (NEW.status = 'active'), NEW.metadata
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.product_id IS NULL THEN NEW.product_id := NEW.id; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plg_shop_products_ensure_product ON public.plg_shop_products;
CREATE TRIGGER plg_shop_products_ensure_product
  BEFORE INSERT ON public.plg_shop_products
  FOR EACH ROW EXECUTE FUNCTION public.shop_ensure_canonical_product();

-- ----------------------------------------------------------------------------
-- 4. The public catalogue view.
--
--    THIS IS THE SECURITY-CRITICAL PART. public.products carries `cost`, so it
--    must never be readable by anon — a storefront visitor with the publishable
--    key could otherwise read every tenant's margin. The view whitelists
--    columns explicitly and is the only catalogue surface anon is granted.
--
--    security_invoker = off (the default for views) means the view runs with the
--    owner's rights, so anon does not need SELECT on the underlying tables.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.plg_shop_catalog AS
SELECT
  p.id,
  p.tenant_id,
  c.slug,
  p.name,
  p.description,
  c.price,
  c.compare_at_price,
  c.currency,
  c.status,
  c.inventory_count,
  p.sku,
  c.sort_order,
  c.metadata,
  p.category_id,
  c.is_physical,
  c.weight,
  c.weight_unit,
  p.created_at,
  p.updated_at
FROM public.plg_shop_products c
JOIN public.products p ON p.id = COALESCE(c.product_id, c.id)
WHERE c.status = 'active';

COMMENT ON VIEW public.plg_shop_catalog IS
  'Storefront-safe product projection. Never expose public.products directly to anon: it carries cost/margin.';

REVOKE ALL ON public.plg_shop_catalog FROM PUBLIC;
GRANT SELECT ON public.plg_shop_catalog TO anon, authenticated, service_role;
