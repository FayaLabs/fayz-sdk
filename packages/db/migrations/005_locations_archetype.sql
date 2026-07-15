-- Bring public.locations in line with other archetype tables
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'branch',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Migrate settings → metadata for existing rows (if settings column still exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'settings') THEN
    UPDATE public.locations SET metadata = settings WHERE metadata = '{}' AND settings != '{}';
    ALTER TABLE public.locations DROP COLUMN settings;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS locations_tenant_kind ON public.locations(tenant_id, kind);
