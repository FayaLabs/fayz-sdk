-- ============================================================================
-- @fayz-ai/courses — reporting views for @fayz-ai/plugin-reports
-- One row per course (zero-filled for courses with no paid orders yet),
-- mirroring the revenue-by-course aggregation the hand-rolled ReportsPage
-- used to compute client-side.
--
-- Naming: plugin-owned report views follow `plg_<plugin>_rep_<métrica>` — the
-- Ring 1 `plg_<plugin>_` ownership prefix plus a `rep_` marker for the reporting
-- surface consumed by plugin-reports. Legacy pools created the unprefixed
-- `rep_course_revenue`; 0006_rename_rep_view.sql drops + recreates it under the
-- new name (views hold no data, so a recreate is safe).
-- ============================================================================

CREATE OR REPLACE VIEW public.plg_courses_rep_revenue AS
SELECT
  cc.tenant_id,
  cc.id AS course_id,
  cc.title,
  cc.currency,
  count(co.id) AS sales_count,
  coalesce(sum(co.total), 0) AS revenue,
  cc.created_at
FROM public.plg_courses_courses cc
LEFT JOIN public.plg_courses_orders co
  ON co.course_id = cc.id AND co.financial_status = 'paid'
GROUP BY cc.tenant_id, cc.id, cc.title, cc.currency, cc.created_at;

ALTER VIEW public.plg_courses_rep_revenue SET (security_invoker = true);

GRANT SELECT ON public.plg_courses_rep_revenue TO authenticated;
