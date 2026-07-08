-- ============================================================================
-- @fayz-ai/courses — course platform tables (the "fayz-course" central DB)
-- Courses, modules, lessons, offers, customers, enrollments, progress, orders,
-- subscriptions, creator Stripe accounts, payouts, payment events.
-- Tenant-scoped via RLS using public.user_tenant_ids() (from the saas_core spine).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.course_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Courses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_courses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  slug          text NOT NULL,
  title         text NOT NULL,
  subtitle      text,
  description   text,
  thumbnail_url text,
  price         numeric(12,2) NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'BRL',
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'archived')),
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS course_courses_tenant_idx ON public.course_courses (tenant_id);
CREATE INDEX IF NOT EXISTS course_courses_status_idx ON public.course_courses (tenant_id, status);
CREATE TRIGGER course_courses_updated_at BEFORE UPDATE ON public.course_courses
  FOR EACH ROW EXECUTE FUNCTION public.course_set_updated_at();

-- ----------------------------------------------------------------------------
-- Modules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_modules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  course_id  uuid NOT NULL REFERENCES public.course_courses(id) ON DELETE CASCADE,
  title      text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS course_modules_course_idx ON public.course_modules (course_id);
CREATE INDEX IF NOT EXISTS course_modules_tenant_idx ON public.course_modules (tenant_id);

-- ----------------------------------------------------------------------------
-- Lessons
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  course_id    uuid NOT NULL REFERENCES public.course_courses(id) ON DELETE CASCADE,
  module_id    uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  video_url    text NOT NULL DEFAULT '',
  duration_sec integer NOT NULL DEFAULT 600,
  sort_order   integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS course_lessons_course_idx ON public.course_lessons (course_id);
CREATE INDEX IF NOT EXISTS course_lessons_module_idx ON public.course_lessons (module_id);
CREATE INDEX IF NOT EXISTS course_lessons_tenant_idx ON public.course_lessons (tenant_id);

-- ----------------------------------------------------------------------------
-- Offers (pricing / order-bumps)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_offers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL,
  course_id          uuid NOT NULL REFERENCES public.course_courses(id) ON DELETE CASCADE,
  name               text NOT NULL,
  price              numeric(12,2) NOT NULL DEFAULT 0,
  currency           text NOT NULL DEFAULT 'BRL',
  kind               text NOT NULL DEFAULT 'one_time'
                     CHECK (kind IN ('one_time', 'subscription')),
  recurring_interval text CHECK (recurring_interval IN ('month', 'year')),
  is_default         boolean NOT NULL DEFAULT false,
  is_order_bump      boolean NOT NULL DEFAULT false,
  sort_order         integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS course_offers_course_idx ON public.course_offers (course_id);
CREATE INDEX IF NOT EXISTS course_offers_tenant_idx ON public.course_offers (tenant_id);

-- ----------------------------------------------------------------------------
-- Customers (students)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_customers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  name         text NOT NULL DEFAULT '',
  email        text,
  auth_user_id uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_customers_tenant_idx ON public.course_customers (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS course_customers_tenant_email_idx
  ON public.course_customers (tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_customers_auth_idx ON public.course_customers (auth_user_id);

-- ----------------------------------------------------------------------------
-- Enrollments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  course_id    uuid NOT NULL REFERENCES public.course_courses(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES public.course_customers(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded')),
  access_group text NOT NULL DEFAULT 'default',
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, customer_id)
);
CREATE INDEX IF NOT EXISTS course_enrollments_tenant_idx   ON public.course_enrollments (tenant_id);
CREATE INDEX IF NOT EXISTS course_enrollments_customer_idx ON public.course_enrollments (customer_id);

-- ----------------------------------------------------------------------------
-- Progress
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  enrollment_id     uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  lesson_id         uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed         boolean NOT NULL DEFAULT false,
  last_position_sec integer NOT NULL DEFAULT 0,
  completed_at      timestamptz,
  UNIQUE (enrollment_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS course_progress_enrollment_idx ON public.course_progress (enrollment_id);

-- ----------------------------------------------------------------------------
-- Orders (sales ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_orders (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL,
  course_id                uuid NOT NULL REFERENCES public.course_courses(id) ON DELETE CASCADE,
  offer_id                 uuid REFERENCES public.course_offers(id) ON DELETE SET NULL,
  customer_id              uuid REFERENCES public.course_customers(id) ON DELETE SET NULL,
  customer_name            text,
  customer_email           text,
  currency                 text NOT NULL DEFAULT 'BRL',
  total                    numeric(12,2) NOT NULL DEFAULT 0,
  platform_fee             numeric(12,2) NOT NULL DEFAULT 0,
  net_value                numeric(12,2) NOT NULL DEFAULT 0,
  payment_method           text CHECK (payment_method IN ('card', 'pix', 'boleto')),
  financial_status         text NOT NULL DEFAULT 'pending'
                           CHECK (financial_status IN ('pending', 'paid', 'refunded', 'chargeback')),
  stripe_payment_intent_id text,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_orders_tenant_idx ON public.course_orders (tenant_id);
CREATE INDEX IF NOT EXISTS course_orders_course_idx ON public.course_orders (course_id);
CREATE INDEX IF NOT EXISTS course_orders_status_idx ON public.course_orders (tenant_id, financial_status);

-- ----------------------------------------------------------------------------
-- Subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL,
  course_id              uuid NOT NULL REFERENCES public.course_courses(id) ON DELETE CASCADE,
  offer_id               uuid REFERENCES public.course_offers(id) ON DELETE SET NULL,
  customer_id            uuid REFERENCES public.course_customers(id) ON DELETE SET NULL,
  customer_name          text,
  customer_email         text,
  currency               text NOT NULL DEFAULT 'BRL',
  net_value              numeric(12,2) NOT NULL DEFAULT 0,
  interval               text NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  status                 text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'canceled', 'past_due')),
  stripe_subscription_id text,
  started_at             timestamptz NOT NULL DEFAULT now(),
  canceled_at            timestamptz
);
CREATE INDEX IF NOT EXISTS course_subscriptions_tenant_idx ON public.course_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS course_subscriptions_status_idx ON public.course_subscriptions (tenant_id, status);

-- ----------------------------------------------------------------------------
-- Creator Stripe Connect accounts (1:1 tenant)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_creator_accounts (
  tenant_id         uuid PRIMARY KEY,
  stripe_account_id text,
  charges_enabled   boolean NOT NULL DEFAULT false,
  payouts_enabled   boolean NOT NULL DEFAULT false,
  default_currency  text NOT NULL DEFAULT 'BRL',
  platform_fee_bps  integer NOT NULL DEFAULT 500,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER course_creator_accounts_updated_at BEFORE UPDATE ON public.course_creator_accounts
  FOR EACH ROW EXECUTE FUNCTION public.course_set_updated_at();

-- ----------------------------------------------------------------------------
-- Payouts (projection of Stripe payouts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_payouts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  amount     numeric(12,2) NOT NULL DEFAULT 0,
  currency   text NOT NULL DEFAULT 'BRL',
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_payouts_tenant_idx ON public.course_payouts (tenant_id);

-- ----------------------------------------------------------------------------
-- Payment events (Stripe webhook log — service_role only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_payment_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid,
  type       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_payment_events_tenant_idx ON public.course_payment_events (tenant_id);

-- ----------------------------------------------------------------------------
-- RLS — creator-side tenant isolation via public.user_tenant_ids()
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'course_courses', 'course_modules', 'course_lessons', 'course_offers',
    'course_customers', 'course_enrollments', 'course_progress',
    'course_orders', 'course_subscriptions', 'course_creator_accounts', 'course_payouts'
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

-- Payment events: no client access (service_role bypasses RLS).
ALTER TABLE public.course_payment_events ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Storage bucket for course thumbnails + lesson videos (public read, tenant writes)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-media', 'course-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS course_media_read ON storage.objects;
CREATE POLICY course_media_read ON storage.objects
  FOR SELECT USING (bucket_id = 'course-media');

DROP POLICY IF EXISTS course_media_write ON storage.objects;
CREATE POLICY course_media_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-media'
    AND (storage.foldername(name))[1] IN (SELECT public.user_tenant_ids()::text)
  );
