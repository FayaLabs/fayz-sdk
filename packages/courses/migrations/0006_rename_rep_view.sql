-- ============================================================================
-- 0006_rename_rep_view.sql — standardize the courses reporting view onto the
-- plugin report-view convention `plg_<plugin>_rep_<métrica>`:
--
--   rep_course_revenue → plg_courses_rep_revenue
--
-- Legacy-pool remediation ONLY: 0004_reports_views.sql now creates the prefixed
-- name directly. A view holds no data, so this drops the legacy view and (re)creates
-- the canonical one with the same definition, grants and security_invoker setting.
-- Idempotent: DROP IF EXISTS + CREATE OR REPLACE.
-- ============================================================================

DROP VIEW IF EXISTS public.rep_course_revenue;

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
