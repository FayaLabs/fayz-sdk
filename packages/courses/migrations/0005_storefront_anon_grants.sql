-- Same gap as shop/0005: 009_anon_hardening revokes anon SELECT everywhere and
-- 0002's anon catalog policies were left without the outer table GRANT.
-- (The generic anon write-privilege revoke lives in spine 011.)

GRANT SELECT ON public.plg_courses_courses, public.plg_courses_modules,
  public.plg_courses_lessons, public.plg_courses_offers
  TO anon, authenticated;

GRANT ALL ON public.plg_courses_courses, public.plg_courses_modules,
  public.plg_courses_lessons, public.plg_courses_offers, public.plg_courses_customers,
  public.plg_courses_enrollments, public.plg_courses_progress, public.plg_courses_orders,
  public.plg_courses_subscriptions, public.plg_courses_payment_events,
  public.plg_courses_payouts, public.plg_courses_creator_accounts
  TO authenticated, service_role;
