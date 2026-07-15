-- Marketing Plugin: multi-platform accounts + per-post targets.
-- An account is a brand/profile that publishes to MANY platforms (Instagram,
-- YouTube, TikTok, ...). Posts optionally narrow the target platforms; an
-- empty array means "inherit the account's platforms".

ALTER TABLE public.plg_marketing_social_accounts
  ADD COLUMN IF NOT EXISTS platforms text[] NOT NULL DEFAULT '{instagram}';

-- Backfill from the legacy single-platform column, then drop it (also drops
-- its CHECK constraint — the platform list is UI-driven from here on).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plg_marketing_social_accounts' AND column_name = 'platform'
  ) THEN
    UPDATE public.plg_marketing_social_accounts
      SET platforms = ARRAY[platform]
      WHERE platform IS NOT NULL AND platforms = '{instagram}';
    ALTER TABLE public.plg_marketing_social_accounts DROP COLUMN platform;
  END IF;
END $$;

ALTER TABLE public.plg_marketing_content_posts
  ADD COLUMN IF NOT EXISTS platforms text[] NOT NULL DEFAULT '{}';
