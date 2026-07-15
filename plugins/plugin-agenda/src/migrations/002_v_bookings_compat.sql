-- Where 000b preserved the legacy beauty view, re-create v_bookings as a
-- thin alias over it so live pre-M5 clients that SELECT v_bookings by name
-- keep their full legacy column set. Dropped for good once the beauty app
-- ships on v_appointments (M5 follow-up).

DO $compat$
BEGIN
  IF to_regclass('public.v_bookings_legacy_beauty') IS NOT NULL
     AND to_regclass('public.v_bookings') IS NULL THEN
    EXECUTE 'CREATE VIEW public.v_bookings WITH (security_invoker = true) AS SELECT * FROM public.v_bookings_legacy_beauty';
    EXECUTE 'GRANT SELECT ON public.v_bookings TO authenticated, service_role';
    EXECUTE 'REVOKE SELECT ON public.v_bookings FROM anon';
  END IF;
END $compat$;
