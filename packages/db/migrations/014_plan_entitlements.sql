-- ============================================================================
-- 014_plan_entitlements.sql — plans carry machine-readable entitlements.
--
-- public.plans shipped with `features jsonb` as DISPLAY BULLETS only — nothing
-- in the pool encodes what a plan actually gates. Server-side enforcement (the
-- agent RPCs' role→plan→limit guard, and eventually RLS defense-in-depth)
-- needs the SAME `{features: {id: bool}, limits: {key: number}}` structure the
-- client resolves from `config.billing` (@fayz-ai/core PlanEntitlements; -1 =
-- unlimited, absent feature = allowed).
--
-- Writer: the app's plan catalog is code (billing.ts) → synced into this table
-- (transitionally by the app seed, then by the Fayz platform on
-- `fayz manifest sync` — the manifest carries billing.plans verbatim).
--
-- `hidden` retires the "qa-free-test plans visible on SubscriptionPage" debt:
-- QA/internal plans stay selectable by id but are never rendered.
--
-- Guarded + idempotent: no-op when the pool predates public.plans (legacy
-- saas_core pools run their app-local mirror of this ALTER instead).
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.plans') IS NOT NULL THEN
    ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS entitlements jsonb NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
  END IF;
END $$;
