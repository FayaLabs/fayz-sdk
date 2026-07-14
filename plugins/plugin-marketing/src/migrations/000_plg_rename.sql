-- 000_plg_rename.sql — rename legacy marketing tables to plg_marketing_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when legacy
-- name exists and target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.mkt_social_accounts') IS NOT NULL AND to_regclass('public.plg_marketing_social_accounts') IS NULL THEN
    ALTER TABLE public.mkt_social_accounts RENAME TO plg_marketing_social_accounts;
  END IF;
  IF to_regclass('public.mkt_content_plans') IS NOT NULL AND to_regclass('public.plg_marketing_content_plans') IS NULL THEN
    ALTER TABLE public.mkt_content_plans RENAME TO plg_marketing_content_plans;
  END IF;
  IF to_regclass('public.mkt_content_posts') IS NOT NULL AND to_regclass('public.plg_marketing_content_posts') IS NULL THEN
    ALTER TABLE public.mkt_content_posts RENAME TO plg_marketing_content_posts;
  END IF;
END $$;
