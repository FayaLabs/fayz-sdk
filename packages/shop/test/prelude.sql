-- Minimal Supabase surface so the shop migrations can run on a bare Postgres.
-- Only what packages/shop/migrations actually references.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- Swappable stand-in for the JWT claim: tests set app.uid to impersonate.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.uid', true), '')::uuid;
$$;

-- Tenant membership, normally from 20260201000004_plugin_rls.sql.
CREATE OR REPLACE FUNCTION public.user_tenant_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant', true), '')::uuid;
$$;

-- Core tenancy. products.tenant_id REFERENCES this — and plg_shop_products
-- deliberately does NOT, which is how the pool ended up with shop tenants that
-- have no tenants row. The bench must carry the FK or it cannot reproduce that.
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  vertical_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tenants (id, name, slug)
VALUES ('10000000-0000-4000-8000-000000000104', 'Artorius Steakhouse', 'artorious-shop')
ON CONFLICT (id) DO NOTHING;

-- Core categories. products.category_id references THIS, not plg_shop_categories
-- — the two taxonomies are separate, which the backfill has to respect.
-- Column list mirrors the live pool exactly (id, tenant_id, kind, name, slug,
-- parent_id, icon, color, sort_order, is_active, metadata, timestamps). A
-- shorter stand-in here hid a missing `kind` and let a broken migration pass.
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text,
  name text NOT NULL,
  slug text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  icon text,
  color text,
  sort_order integer,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The canonical product, owned by the core/inventory schema (saas-core
-- 20260402 line). Mirrored here so the shop migrations can be tested in
-- isolation. Column list and constraints match the live pool.
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  sku text,
  price numeric,
  cost numeric,
  currency text DEFAULT 'BRL',
  unit text,
  image_url text,
  stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  status text,
  is_active boolean DEFAULT true,
  tags text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text,
  name text
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(name, '/');
$$;

-- Core domain tables the pool already has (all empty there). Mirrored so the
-- shop migrations can be tested against the real target shape.
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text, name text NOT NULL, email text, phone text, document_number text,
  address text, city text, state text, country text, postal_code text,
  tags text[], is_active boolean DEFAULT true, notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text, reference_number text, status text,
  party_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  assignee_id uuid, location_id uuid,
  subtotal numeric(12,2), discount numeric(12,2), tax numeric(12,2),
  total numeric(12,2), currency text DEFAULT 'BRL',
  due_at timestamptz, completed_at timestamptz, notes text, tags text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  service_id uuid, name text NOT NULL, description text,
  quantity numeric DEFAULT 1, unit_price numeric(12,2),
  discount numeric(12,2), total numeric(12,2), sort_order integer,
  metadata jsonb DEFAULT '{}', duration_minutes integer, assignee_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text, order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  party_id uuid, amount numeric(12,2), currency text DEFAULT 'BRL',
  payment_method text, reference text, status text,
  transacted_at timestamptz, notes text, metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
