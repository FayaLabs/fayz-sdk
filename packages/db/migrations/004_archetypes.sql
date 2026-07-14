-- ============================================================================
-- core archetype tables (public schema)
-- Shared base entities that project-specific tables extend via FK
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. people — any human entity (staff, customer, supplier, professional)
-- ---------------------------------------------------------------------------
CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  document_number text,
  avatar_url text,
  date_of_birth date,
  address text,
  city text,
  state text,
  country text DEFAULT 'BR',
  postal_code text,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX people_tenant_kind ON public.people(tenant_id, kind);
CREATE TRIGGER people_updated_at BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 2. categories — generic taxonomy (species, menu categories, regions)
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  slug text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  icon text,
  color text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX categories_tenant_kind ON public.categories(tenant_id, kind);
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 3. products — physical/trackable items (menu items, equipment, ingredients)
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
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
  stock numeric,
  min_stock numeric,
  status text DEFAULT 'active',
  is_active boolean DEFAULT true,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_tenant ON public.products(tenant_id);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. services — intangible offerings (exam types, consultations)
-- ---------------------------------------------------------------------------
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric,
  cost numeric,
  currency text DEFAULT 'BRL',
  duration_minutes integer,
  image_url text,
  status text DEFAULT 'active',
  is_active boolean DEFAULT true,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX services_tenant ON public.services(tenant_id);
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 5. orders — business orders/jobs
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  reference_number text,
  status text DEFAULT 'draft',
  party_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  currency text DEFAULT 'BRL',
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_tenant_kind ON public.orders(tenant_id, kind);
CREATE INDEX orders_status ON public.orders(tenant_id, status);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 6. order_items — line items for orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_items_order ON public.order_items(order_id);

-- ---------------------------------------------------------------------------
-- 7. transactions — financial movements (payments, refunds, expenses)
-- ---------------------------------------------------------------------------
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  party_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'BRL',
  payment_method text,
  reference text,
  status text DEFAULT 'completed',
  transacted_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transactions_tenant_kind ON public.transactions(tenant_id, kind);
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 8. appointments — reservations/appointments
-- ---------------------------------------------------------------------------
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  party_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  status text DEFAULT 'pending',
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointments_tenant_kind ON public.appointments(tenant_id, kind);
CREATE INDEX appointments_starts ON public.appointments(tenant_id, starts_at);
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 9. appointment_items — services within an appointment
--    (booking_id column name preserved for parity with converted pools —
--     the in-place converter renames the table, not the FK column)
-- ---------------------------------------------------------------------------
CREATE TABLE public.appointment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  name text NOT NULL,
  duration_minutes integer,
  price numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointment_items_booking ON public.appointment_items(booking_id);

-- ---------------------------------------------------------------------------
-- 10. schedules — recurring availability/shifts
-- ---------------------------------------------------------------------------
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  assignee_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  day_of_week smallint,
  specific_date date,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX schedules_tenant_kind ON public.schedules(tenant_id, kind);
CREATE INDEX schedules_assignee ON public.schedules(assignee_id, day_of_week);
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- RLS policies — tenant isolation for all archetype tables
-- ============================================================================

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'people', 'categories', 'products', 'services',
    'orders', 'transactions', 'appointments', 'schedules'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))',
      tbl, tbl
    );
  END LOOP;

  -- Child tables (order_items, appointment_items) — RLS via parent FK
  FOREACH tbl IN ARRAY ARRAY['order_items', 'appointment_items']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- order_items: access via parent order's tenant
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())));
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())));
CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())));
CREATE POLICY "order_items_delete" ON public.order_items FOR DELETE TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())));

-- appointment_items: access via parent appointment's tenant
CREATE POLICY "appointment_items_select" ON public.appointment_items FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())));
CREATE POLICY "appointment_items_insert" ON public.appointment_items FOR INSERT TO authenticated
  WITH CHECK (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())));
CREATE POLICY "appointment_items_update" ON public.appointment_items FOR UPDATE TO authenticated
  USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())));
CREATE POLICY "appointment_items_delete" ON public.appointment_items FOR DELETE TO authenticated
  USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())));

-- Grant access to archetype tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
