-- ============================================================================
-- @fayz-ai/courses — reporting views for @fayz-ai/plugin-reports
-- One row per course (zero-filled for courses with no paid orders yet),
-- mirroring the revenue-by-course aggregation the hand-rolled ReportsPage
-- used to compute client-side.
-- ============================================================================

CREATE OR REPLACE VIEW public.rep_course_revenue AS
SELECT
  cc.tenant_id,
  cc.id AS course_id,
  cc.title,
  cc.currency,
  count(co.id) AS sales_count,
  coalesce(sum(co.total), 0) AS revenue,
  cc.created_at
FROM public.course_courses cc
LEFT JOIN public.course_orders co
  ON co.course_id = cc.id AND co.financial_status = 'paid'
GROUP BY cc.tenant_id, cc.id, cc.title, cc.currency, cc.created_at;

ALTER VIEW public.rep_course_revenue SET (security_invoker = true);

GRANT SELECT ON public.rep_course_revenue TO authenticated;
