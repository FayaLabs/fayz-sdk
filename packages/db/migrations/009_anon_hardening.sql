-- ============================================================================
-- 009: anon hardening — close 008's blanket grants for the anon role.
--
-- 008_grants.sql grants SELECT on all tables and EXECUTE on all functions to
-- anon. RLS (policies are TO authenticated) already returns zero rows for
-- table reads, but EXECUTE on SECURITY DEFINER functions like
-- create_tenant_with_owner is a real abuse surface on projects that serve
-- public (anon-key) pages. Revoke everything; anon-facing surfaces must grant
-- themselves explicitly (e.g. plugin-agenda's public booking RPCs/views).
--
-- Apply AFTER 008 and BEFORE plugin migrations that grant anon access.
-- ============================================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA saas_core FROM anon;

REVOKE SELECT ON ALL TABLES IN SCHEMA saas_core FROM anon;
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

-- Future objects: don't default-grant anon anything.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA saas_core REVOKE EXECUTE ON FUNCTIONS FROM anon;
