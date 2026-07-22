-- ============================================================================
-- 017_core_addresses.sql — public.addresses becomes part of the SPINE.
-- ----------------------------------------------------------------------------
-- The address book was already declared "core" by @fayz-ai/shop's 0012
-- ("move address/payment concepts OUT of the plugin, into core"), but the SQL
-- physically shipped inside the shop package. Consequence, live today: any app
-- that does not install @fayz-ai/shop has no addresses table, while the person
-- archetype's "Endereços" tab (packages/saas AddressesTab) queries it
-- unconditionally — beauty-saas, dentist-saas, agency-os and every other
-- non-shop vertical render "Could not find the table 'public.addresses'".
--
-- An address is not e-commerce. It is where a client is delivered to, where a
-- supplier is collected from, where a staff member lives, where a unit of the
-- business sits. It belongs beside `people` and `locations`, in the spine.
--
-- Replay safety (this file runs on pools that already have the table, via shop
-- 0012, AND on pools that have never seen it):
--   • CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS — additive only
--   • the owner_type CHECK is dropped and rebuilt WIDER, never narrower, so a
--     pool holding 'shop_customer' rows keeps them valid
--   • no DROP of data, no DROP of the shop's own policies
-- Ordering: the spine runs BEFORE plugin migrations (cli buildMigrationPlan
-- ① spine → ④ plugin), so on a fresh shop pool this file creates the table and
-- shop 0012's own CREATE ... IF NOT EXISTS degrades to a no-op.
--
-- `owner_type` stays text rather than a FK because the owner is polymorphic:
-- a core `people` row, a `locations` row, the tenant itself, or — until the
-- shop's customer table is folded into `people` — a plg_shop_customers row.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  owner_type   text NOT NULL DEFAULT 'person',
  owner_id     uuid,
  kind         text NOT NULL DEFAULT 'both',
  label        text,          -- "Casa", "Trabalho", "Depósito"
  recipient    text,          -- quem recebe, se não for o próprio dono
  phone        text,
  postal_code  text NOT NULL, -- CEP
  street       text NOT NULL,
  number       text,
  complement   text,
  district     text,          -- bairro
  city         text NOT NULL,
  state        text NOT NULL, -- UF
  country      text NOT NULL DEFAULT 'BR',
  is_default   boolean NOT NULL DEFAULT false,
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.addresses IS
  'Core address book. N addresses per owner (person, location, tenant), tenant-scoped. Owned by @fayz-ai/db — plugins read it, none of them own it.';

-- Pools provisioned by shop 0012 predate `metadata`/'both' defaults; add what
-- is missing rather than assuming the 0012 shape.
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'person',
  ADD COLUMN IF NOT EXISTS owner_id   uuid,
  ADD COLUMN IF NOT EXISTS kind       text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS label      text,
  ADD COLUMN IF NOT EXISTS recipient  text,
  ADD COLUMN IF NOT EXISTS phone      text,
  ADD COLUMN IF NOT EXISTS number     text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS district   text,
  ADD COLUMN IF NOT EXISTS metadata   jsonb NOT NULL DEFAULT '{}';

-- ----------------------------------------------------------------------------
-- 2. Constraints — rebuilt WIDER than shop 0012's.
--    'staff' and 'partner' are person kinds and already covered by 'person';
--    what 0012 lacked is nothing — this only re-asserts the same set so a pool
--    that never ran 0012 gets it, and a pool that did is left unchanged.
-- ----------------------------------------------------------------------------
ALTER TABLE public.addresses DROP CONSTRAINT IF EXISTS addresses_owner_type_check;
ALTER TABLE public.addresses
  ADD CONSTRAINT addresses_owner_type_check
  CHECK (owner_type IN ('person', 'shop_customer', 'location', 'tenant'));

ALTER TABLE public.addresses DROP CONSTRAINT IF EXISTS addresses_kind_check;
ALTER TABLE public.addresses
  ADD CONSTRAINT addresses_kind_check
  CHECK (kind IN ('shipping', 'billing', 'both'));

CREATE INDEX IF NOT EXISTS addresses_tenant_idx ON public.addresses (tenant_id);
CREATE INDEX IF NOT EXISTS addresses_owner_idx  ON public.addresses (owner_type, owner_id);
-- One default per owner per kind, enforced here rather than trusting every
-- caller to clear the previous one.
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_idx
  ON public.addresses (owner_type, owner_id, kind) WHERE is_default;

DROP TRIGGER IF EXISTS addresses_updated_at ON public.addresses;
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS — tenant members manage their tenant's rows. Anon gets nothing.
--    The shop's extra `addresses_self_read` policy (a signed-in storefront
--    customer reading their own rows) is left untouched: it is additive, and
--    shop 0012 runs after this file.
-- ----------------------------------------------------------------------------
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addresses_member_all" ON public.addresses;
CREATE POLICY "addresses_member_all" ON public.addresses FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

GRANT ALL ON public.addresses TO authenticated, service_role;
REVOKE ALL ON public.addresses FROM anon;
