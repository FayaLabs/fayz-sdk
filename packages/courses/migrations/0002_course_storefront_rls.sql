-- ============================================================================
-- @fayz-ai/courses — storefront (student-facing) RLS
-- Public catalog reads for PUBLISHED courses (+ their modules/lessons/offers),
-- and customer-scoped reads of enrollments/progress via course_customers.auth_user_id.
-- The creator-side tenant policies from 0001 remain; these are additive.
-- ============================================================================

-- Published catalog is world-readable (anon + authenticated), regardless of tenant.
DROP POLICY IF EXISTS course_courses_public_read ON public.course_courses;
CREATE POLICY course_courses_public_read ON public.course_courses
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS course_modules_public_read ON public.course_modules;
CREATE POLICY course_modules_public_read ON public.course_modules
  FOR SELECT TO anon, authenticated
  USING (course_id IN (SELECT id FROM public.course_courses WHERE status = 'published'));

DROP POLICY IF EXISTS course_lessons_public_read ON public.course_lessons;
CREATE POLICY course_lessons_public_read ON public.course_lessons
  FOR SELECT TO anon, authenticated
  USING (course_id IN (SELECT id FROM public.course_courses WHERE status = 'published'));

DROP POLICY IF EXISTS course_offers_public_read ON public.course_offers;
CREATE POLICY course_offers_public_read ON public.course_offers
  FOR SELECT TO anon, authenticated
  USING (course_id IN (SELECT id FROM public.course_courses WHERE status = 'published'));

-- A student reads their own customer row / enrollments / progress (by auth.uid()).
DROP POLICY IF EXISTS course_customers_self_read ON public.course_customers;
CREATE POLICY course_customers_self_read ON public.course_customers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS course_enrollments_self_read ON public.course_enrollments;
CREATE POLICY course_enrollments_self_read ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.course_customers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS course_progress_self ON public.course_progress;
CREATE POLICY course_progress_self ON public.course_progress
  FOR ALL TO authenticated
  USING (enrollment_id IN (
    SELECT e.id FROM public.course_enrollments e
    JOIN public.course_customers c ON c.id = e.customer_id
    WHERE c.auth_user_id = auth.uid()
  ))
  WITH CHECK (enrollment_id IN (
    SELECT e.id FROM public.course_enrollments e
    JOIN public.course_customers c ON c.id = e.customer_id
    WHERE c.auth_user_id = auth.uid()
  ));
