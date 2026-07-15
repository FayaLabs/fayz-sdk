-- Salon-only unblock: the pre-pools beauty deployment built rep_* report
-- views on top of its (wider) v_bookings view, so 001's cleanup DROP cannot
-- run there. Renaming keeps the dependents attached (they track the OID) and
-- frees the name for 001; 002_v_bookings_compat re-creates v_bookings as a
-- thin alias for live pre-M5 clients. No-op on fresh pools and on pools whose
-- v_bookings has no dependents (001's DROP handles those).

DO $rename$
BEGIN
  IF to_regclass('public.v_bookings') IS NOT NULL
     AND to_regclass('public.v_bookings_legacy_beauty') IS NULL
     AND EXISTS (
       SELECT 1 FROM pg_depend d
       JOIN pg_rewrite rw ON rw.oid = d.objid
       JOIN pg_class dep ON dep.oid = rw.ev_class
       JOIN pg_class ref ON ref.oid = d.refobjid
       WHERE ref.relname = 'v_bookings' AND dep.relname <> 'v_bookings'
     ) THEN
    EXECUTE 'ALTER VIEW public.v_bookings RENAME TO v_bookings_legacy_beauty';
  END IF;
END $rename$;
