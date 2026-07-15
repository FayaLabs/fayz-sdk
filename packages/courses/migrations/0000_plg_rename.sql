-- 0000_plg_rename.sql — rename legacy course_ tables to plg_courses_
-- for pools provisioned before the industry-pool rename. Guarded: fires only when
-- legacy name exists and target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.course_courses') IS NOT NULL AND to_regclass('public.plg_courses_courses') IS NULL THEN
    ALTER TABLE public.course_courses RENAME TO plg_courses_courses;
  END IF;
  IF to_regclass('public.course_modules') IS NOT NULL AND to_regclass('public.plg_courses_modules') IS NULL THEN
    ALTER TABLE public.course_modules RENAME TO plg_courses_modules;
  END IF;
  IF to_regclass('public.course_lessons') IS NOT NULL AND to_regclass('public.plg_courses_lessons') IS NULL THEN
    ALTER TABLE public.course_lessons RENAME TO plg_courses_lessons;
  END IF;
  IF to_regclass('public.course_offers') IS NOT NULL AND to_regclass('public.plg_courses_offers') IS NULL THEN
    ALTER TABLE public.course_offers RENAME TO plg_courses_offers;
  END IF;
  IF to_regclass('public.course_customers') IS NOT NULL AND to_regclass('public.plg_courses_customers') IS NULL THEN
    ALTER TABLE public.course_customers RENAME TO plg_courses_customers;
  END IF;
  IF to_regclass('public.course_enrollments') IS NOT NULL AND to_regclass('public.plg_courses_enrollments') IS NULL THEN
    ALTER TABLE public.course_enrollments RENAME TO plg_courses_enrollments;
  END IF;
  IF to_regclass('public.course_progress') IS NOT NULL AND to_regclass('public.plg_courses_progress') IS NULL THEN
    ALTER TABLE public.course_progress RENAME TO plg_courses_progress;
  END IF;
  IF to_regclass('public.course_orders') IS NOT NULL AND to_regclass('public.plg_courses_orders') IS NULL THEN
    ALTER TABLE public.course_orders RENAME TO plg_courses_orders;
  END IF;
  IF to_regclass('public.course_subscriptions') IS NOT NULL AND to_regclass('public.plg_courses_subscriptions') IS NULL THEN
    ALTER TABLE public.course_subscriptions RENAME TO plg_courses_subscriptions;
  END IF;
  IF to_regclass('public.course_creator_accounts') IS NOT NULL AND to_regclass('public.plg_courses_creator_accounts') IS NULL THEN
    ALTER TABLE public.course_creator_accounts RENAME TO plg_courses_creator_accounts;
  END IF;
  IF to_regclass('public.course_payouts') IS NOT NULL AND to_regclass('public.plg_courses_payouts') IS NULL THEN
    ALTER TABLE public.course_payouts RENAME TO plg_courses_payouts;
  END IF;
  IF to_regclass('public.course_payment_events') IS NOT NULL AND to_regclass('public.plg_courses_payment_events') IS NULL THEN
    ALTER TABLE public.course_payment_events RENAME TO plg_courses_payment_events;
  END IF;
END $$;
