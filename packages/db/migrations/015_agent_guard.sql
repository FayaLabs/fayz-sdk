-- ============================================================================
-- 015_agent_guard.sql — the role→plan→limit gate for agent_* RPCs.
--
-- Every server-plane agent write RPC (agent_<domain>_<verb>) calls this FIRST.
-- It is the SQL mirror of the shared TS engine (@fayz-ai/core/access
-- resolveAccess/resolveLimit): role first (owner bypasses role, NOT plan;
-- `manage` satisfies any action; tenant_role_overrides win over role grants),
-- then plan feature gate (only explicit false denies), then the plan cap for
-- p_limit_key (absent / -1 = unlimited). The RPC counts its own domain rows
-- and passes p_used — the guard never runs dynamic SQL.
--
-- Returns NULL when allowed, or the AgentDenial jsonb mirror when denied:
--   {"allowed":false,"reason":"role"|"plan"|"limit",
--    "limit":{"key":..,"max":..,"used":..},"upgradeUrl":"/settings/subscription"}
-- A parity test on the app side runs the same scenarios through the TS engine
-- and through this function — divergence is a bug.
--
-- Permission ids use the `category.action` catalog form; grants live in
-- role_permissions (+ per-tenant tenant_role_overrides with granted boolean).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agent_guard(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_feature text,
  p_action text,
  p_limit_key text DEFAULT NULL,
  p_used integer DEFAULT NULL,
  p_n integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_has boolean;
  v_override boolean;
  v_plan_id text;
  v_ent jsonb;
  v_feature_flag jsonb;
  v_cap numeric;
BEGIN
  -- ── membership + role ────────────────────────────────────────────────────
  SELECT tm.role INTO v_role
  FROM tenant_members tm
  WHERE tm.tenant_id = p_tenant_id AND tm.user_id = p_actor_user_id;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'role',
                              'upgradeUrl', '/settings/subscription');
  END IF;

  IF v_role <> 'owner' THEN
    -- per-tenant override wins in BOTH directions (grant or deny)
    SELECT tro.granted INTO v_override
    FROM tenant_role_overrides tro
    WHERE tro.tenant_id = p_tenant_id AND tro.role = v_role
      AND tro.permission_id IN (p_feature || '.' || p_action, p_feature || '.manage')
    ORDER BY (tro.permission_id = p_feature || '.' || p_action) DESC
    LIMIT 1;

    IF v_override IS NOT NULL THEN
      v_has := v_override;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role = v_role
          AND rp.permission_id IN (p_feature || '.' || p_action, p_feature || '.manage')
      ) INTO v_has;
    END IF;

    IF NOT v_has THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'role',
                                'upgradeUrl', '/settings/subscription');
    END IF;
  END IF;

  -- ── plan feature gate (owner does NOT bypass) ────────────────────────────
  SELECT t.plan INTO v_plan_id FROM tenants t WHERE t.id = p_tenant_id;
  SELECT p.entitlements INTO v_ent FROM plans p WHERE p.id = v_plan_id;

  IF v_ent IS NOT NULL THEN
    v_feature_flag := v_ent->'features'->p_feature;
    -- only an EXPLICIT false denies (additive plans — mirror isEntitledByPlan)
    IF v_feature_flag IS NOT NULL AND v_feature_flag = to_jsonb(false) THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'plan',
                                'upgradeUrl', '/settings/subscription');
    END IF;

    -- ── plan cap (mirror resolveLimit: absent / -1 = unlimited) ────────────
    IF p_limit_key IS NOT NULL AND p_used IS NOT NULL THEN
      v_cap := (v_ent->'limits'->>p_limit_key)::numeric;
      IF v_cap IS NOT NULL AND v_cap <> -1 AND (p_used + COALESCE(p_n, 1)) > v_cap THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'limit',
                                  'limit', jsonb_build_object('key', p_limit_key,
                                                              'max', v_cap,
                                                              'used', p_used),
                                  'upgradeUrl', '/settings/subscription');
      END IF;
    END IF;
  END IF;

  RETURN NULL; -- allowed
END;
$$;

REVOKE ALL ON FUNCTION public.agent_guard(uuid, uuid, text, text, text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.agent_guard(uuid, uuid, text, text, text, integer, integer)
  TO authenticated, service_role;
