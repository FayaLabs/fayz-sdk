-- ============================================================================
-- 016_agent_guard_actor.sql — the actor cannot be spoofed by a signed-in caller.
--
-- agent_* RPCs receive p_actor_user_id explicitly because the Fayz broker
-- (service_role, no JWT) injects the verified actor server-side. But the same
-- functions are EXECUTE-granted to `authenticated` so the surface can call
-- them client-plane before S4 — and there, p_actor comes from the client. A
-- signed-in user passing SOMEONE ELSE's id would borrow their role.
--
-- Rule added at the top of agent_guard (every write RPC's first call): when
-- the caller carries a JWT identity (auth.uid() not null), p_actor MUST be
-- that identity. Service-role/broker calls (auth.uid() null) are unaffected.
-- New file rather than editing 015 — applied migrations are never edited
-- (ledger rule); CREATE OR REPLACE supersedes the body.
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
  -- ── actor integrity: a JWT caller can only act as themselves ─────────────
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_actor_user_id THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'role',
                              'upgradeUrl', '/settings/subscription');
  END IF;

  -- ── membership + role ────────────────────────────────────────────────────
  SELECT tm.role INTO v_role
  FROM tenant_members tm
  WHERE tm.tenant_id = p_tenant_id AND tm.user_id = p_actor_user_id;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'role',
                              'upgradeUrl', '/settings/subscription');
  END IF;

  IF v_role <> 'owner' THEN
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
    IF v_feature_flag IS NOT NULL AND v_feature_flag = to_jsonb(false) THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'plan',
                                'upgradeUrl', '/settings/subscription');
    END IF;

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

  RETURN NULL;
END;
$$;
