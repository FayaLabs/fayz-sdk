-- ============================================================================
-- 000b_gphx_quarantine.sql — salon pool (gphx) ONLY pre-step
--
-- PRE-STEP: on the salon pool this file MUST be applied BEFORE
-- 000_core_v1_convert.sql. A legacy 0-row public.appointments (from the old
-- bespoke beauty schema) would otherwise collide with — and silently block —
-- the core bookings->appointments rename, which only fires when its target
-- (public.appointments) is free.
--
-- This moves ONLY that legacy public.appointments into a legacy_beauty schema.
-- It deliberately leaves public.clients and public.staff_members alone: those
-- are live extension tables that do not collide with any core rename.
--
-- Guard: acts only when BOTH public.appointments AND saas_core.bookings exist.
-- The presence of saas_core.bookings proves the core rename has not happened,
-- so this public.appointments must be the legacy beauty table (not core).
-- Fully idempotent + a no-op on every non-salon pool.
-- ============================================================================

DO $quarantine$
BEGIN
  IF to_regclass('public.appointments') IS NOT NULL
     AND to_regclass('saas_core.bookings') IS NOT NULL THEN
    CREATE SCHEMA IF NOT EXISTS legacy_beauty;
    ALTER TABLE public.appointments SET SCHEMA legacy_beauty;
  END IF;
END;
$quarantine$;
