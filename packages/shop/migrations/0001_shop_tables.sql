-- ============================================================================
-- @fayz/shop — ecommerce tables
-- Products, categories, orders, customers, discounts. Tenant-scoped via RLS
-- using public.user_tenant_ids() (defined in 20260201000004_plugin_rls.sql).
-- ============================================================================

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.shop_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  name        text NOT NULL,
  slug        text NOT NULL,
  description text,
  parent_id   uuid REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS shop_categories_tenant_idx ON public.shop_categories (tenant_id);

-- ----------------------------------------------------------------------------
-- Products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  name             text NOT NULL,
  slug             text NOT NULL,
  description      text,
  price            numeric(12,2) NOT NULL DEFAULT 0,
  compare_at_price numeric(12,2),
  currency         text NOT NULL DEFAULT 'BRL',
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('draft', 'active', 'archived')),
  inventory_count  integer NOT NULL DEFAULT 0,
  sku              text,
  sort_order       integer NOT NULL DEFAULT 0,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  category_id      uuid REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  is_physical      boolean NOT NULL DEFAULT true,
  weight           numeric(10,3),
  weight_unit      text NOT NULL DEFAULT 'kg',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS shop_products_tenant_idx   ON public.shop_products (tenant_id);
CREATE INDEX IF NOT EXISTS shop_products_status_idx   ON public.shop_products (tenant_id, status);
CREATE INDEX IF NOT EXISTS shop_products_category_idx ON public.shop_products (category_id);

CREATE TRIGGER shop_products_updated_at
  BEFORE UPDATE ON public.shop_products
  FOR EACH ROW EXECUTE FUNCTION public.shop_set_updated_at();

-- ----------------------------------------------------------------------------
-- Product images
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL,
  url        text NOT NULL,
  alt_text   text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_product_images_product_idx ON public.shop_product_images (product_id);
CREATE INDEX IF NOT EXISTS shop_product_images_tenant_idx  ON public.shop_product_images (tenant_id);

-- ----------------------------------------------------------------------------
-- Customers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_customers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  first_name   text NOT NULL,
  last_name    text NOT NULL DEFAULT '',
  email        text,
  phone        text,
  notes        text,
  orders_count integer NOT NULL DEFAULT 0,
  total_spent  numeric(12,2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_customers_tenant_idx ON public.shop_customers (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS shop_customers_tenant_email_idx
  ON public.shop_customers (tenant_id, email) WHERE email IS NOT NULL;

CREATE TRIGGER shop_customers_updated_at
  BEFORE UPDATE ON public.shop_customers
  FOR EACH ROW EXECUTE FUNCTION public.shop_set_updated_at();

-- ----------------------------------------------------------------------------
-- Orders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL,
  order_number       bigint GENERATED ALWAYS AS IDENTITY,
  status             text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'archived', 'cancelled')),
  financial_status   text NOT NULL DEFAULT 'pending'
                     CHECK (financial_status IN ('pending', 'paid', 'partially_paid', 'refunded', 'partially_refunded', 'voided')),
  fulfillment_status text NOT NULL DEFAULT 'unfulfilled'
                     CHECK (fulfillment_status IN ('unfulfilled', 'partially_fulfilled', 'fulfilled')),
  currency           text NOT NULL DEFAULT 'BRL',
  subtotal           numeric(12,2) NOT NULL DEFAULT 0,
  tax_total          numeric(12,2) NOT NULL DEFAULT 0,
  discount_total     numeric(12,2) NOT NULL DEFAULT 0,
  shipping_total     numeric(12,2) NOT NULL DEFAULT 0,
  total              numeric(12,2) NOT NULL DEFAULT 0,
  customer_id        uuid REFERENCES public.shop_customers(id) ON DELETE SET NULL,
  customer_name      text,
  customer_email     text,
  discount_code      text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_orders_tenant_idx   ON public.shop_orders (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_customer_idx ON public.shop_orders (customer_id);

CREATE TRIGGER shop_orders_updated_at
  BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.shop_set_updated_at();

-- Keep customer aggregates (orders_count, total_spent) in sync
CREATE OR REPLACE FUNCTION public.shop_refresh_customer_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cust uuid;
BEGIN
  cust := COALESCE(NEW.customer_id, OLD.customer_id);
  IF cust IS NOT NULL THEN
    UPDATE public.shop_customers c SET
      orders_count = (SELECT count(*) FROM public.shop_orders o
                      WHERE o.customer_id = cust AND o.status <> 'cancelled'),
      total_spent  = (SELECT COALESCE(sum(o.total), 0) FROM public.shop_orders o
                      WHERE o.customer_id = cust AND o.financial_status IN ('paid', 'partially_paid'))
    WHERE c.id = cust;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER shop_orders_customer_stats
  AFTER INSERT OR UPDATE OR DELETE
  ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.shop_refresh_customer_stats();

-- ----------------------------------------------------------------------------
-- Order items (tenant scoping inherited from parent order)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  name       text NOT NULL,
  sku        text,
  quantity   integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total      numeric(12,2) NOT NULL DEFAULT 0,
  image_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_order_items_order_idx ON public.shop_order_items (order_id);

-- ----------------------------------------------------------------------------
-- Discounts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_discounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  title             text NOT NULL,
  code              text,
  type              text NOT NULL DEFAULT 'percentage'
                    CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y')),
  method            text NOT NULL DEFAULT 'code' CHECK (method IN ('code', 'automatic')),
  value             numeric(12,2) NOT NULL DEFAULT 0,
  usage_limit       integer,
  once_per_customer boolean NOT NULL DEFAULT false,
  starts_at         timestamptz NOT NULL DEFAULT now(),
  ends_at           timestamptz,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'scheduled', 'expired', 'disabled')),
  times_used        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_discounts_tenant_idx ON public.shop_discounts (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS shop_discounts_tenant_code_idx
  ON public.shop_discounts (tenant_id, code) WHERE code IS NOT NULL;

CREATE TRIGGER shop_discounts_updated_at
  BEFORE UPDATE ON public.shop_discounts
  FOR EACH ROW EXECUTE FUNCTION public.shop_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — tenant isolation via public.user_tenant_ids()
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shop_categories', 'shop_products', 'shop_product_images',
    'shop_customers', 'shop_orders', 'shop_discounts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t || '_delete', t);
  END LOOP;
END $$;

-- Order items scope through their parent order
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shop_order_items_all ON public.shop_order_items;
CREATE POLICY shop_order_items_all ON public.shop_order_items
  FOR ALL TO authenticated
  USING (order_id IN (
    SELECT id FROM public.shop_orders WHERE tenant_id IN (SELECT public.user_tenant_ids())
  ))
  WITH CHECK (order_id IN (
    SELECT id FROM public.shop_orders WHERE tenant_id IN (SELECT public.user_tenant_ids())
  ));

-- ----------------------------------------------------------------------------
-- Storage bucket for product images (public read, tenant-scoped writes)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS shop_images_read ON storage.objects;
CREATE POLICY shop_images_read ON storage.objects
  FOR SELECT USING (bucket_id = 'shop-images');

DROP POLICY IF EXISTS shop_images_write ON storage.objects;
CREATE POLICY shop_images_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-images'
    AND (storage.foldername(name))[1] IN (SELECT public.user_tenant_ids()::text)
  );

DROP POLICY IF EXISTS shop_images_delete ON storage.objects;
CREATE POLICY shop_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-images'
    AND (storage.foldername(name))[1] IN (SELECT public.user_tenant_ids()::text)
  );
