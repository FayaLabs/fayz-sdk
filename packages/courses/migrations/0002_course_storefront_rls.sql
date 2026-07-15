-- ============================================================================
-- @fayz-ai/courses — storefront (student-facing) RLS
-- Public catalog reads for PUBLISHED courses (+ their modules/lessons/offers),
-- and customer-scoped reads of enrollments/progress via plg_courses_customers.auth_user_id.
-- The creator-side tenant policies from 0001 remain; these are additive.
-- ============================================================================

-- Published catalog is world-readable (anon + authenticated), regardless of tenant.
DROP POLICY IF EXISTS plg_courses_courses_public_read ON public.plg_courses_courses;
CREATE POLICY plg_courses_courses_public_read ON public.plg_courses_courses
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS plg_courses_modules_public_read ON public.plg_courses_modules;
CREATE POLICY plg_courses_modules_public_read ON public.plg_courses_modules
  FOR SELECT TO anon, authenticated
  USING (course_id IN (SELECT id FROM public.plg_courses_courses WHERE status = 'published'));

DROP POLICY IF EXISTS plg_courses_lessons_public_read ON public.plg_courses_lessons;
CREATE POLICY plg_courses_lessons_public_read ON public.plg_courses_lessons
  FOR SELECT TO anon, authenticated
  USING (course_id IN (SELECT id FROM public.plg_courses_courses WHERE status = 'published'));

DROP POLICY IF EXISTS plg_courses_offers_public_read ON public.plg_courses_offers;
CREATE POLICY plg_courses_offers_public_read ON public.plg_courses_offers
  FOR SELECT TO anon, authenticated
  USING (course_id IN (SELECT id FROM public.plg_courses_courses WHERE status = 'published'));

-- A student reads their own customer row / enrollments / progress (by auth.uid()).
DROP POLICY IF EXISTS plg_courses_customers_self_read ON public.plg_courses_customers;
CREATE POLICY plg_courses_customers_self_read ON public.plg_courses_customers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS plg_courses_enrollments_self_read ON public.plg_courses_enrollments;
CREATE POLICY plg_courses_enrollments_self_read ON public.plg_courses_enrollments
  FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.plg_courses_customers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS plg_courses_progress_self ON public.plg_courses_progress;
CREATE POLICY plg_courses_progress_self ON public.plg_courses_progress
  FOR ALL TO authenticated
  USING (enrollment_id IN (
    SELECT e.id FROM public.plg_courses_enrollments e
    JOIN public.plg_courses_customers c ON c.id = e.customer_id
    WHERE c.auth_user_id = auth.uid()
  ))
  WITH CHECK (enrollment_id IN (
    SELECT e.id FROM public.plg_courses_enrollments e
    JOIN public.plg_courses_customers c ON c.id = e.customer_id
    WHERE c.auth_user_id = auth.uid()
  ));
