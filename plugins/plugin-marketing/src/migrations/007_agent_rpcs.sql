-- ============================================================================
-- plugin-marketing 007: server-plane agent write RPC.
--
-- public.agent_marketing_create_campaign — guarded campaign create for the
-- assistant. Mirrors agent_agenda_create_appointment (agenda 005):
--   * actor-authorized: public.agent_guard (spine 015) runs role→plan→limit
--     BEFORE anything — denial comes back as structured jsonb;
--   * channel is validated against the tenant's plg_marketing_channels rows
--     (key or label, case/punctuation-insensitive); when the tenant has no
--     channel rows yet (surface not opened → lazy seed not run) the raw key is
--     accepted as-is;
--   * audited: audit_logs row with the acting user.
--
-- Contract (all agent_* RPCs): (p_tenant_id, p_actor_user_id, p_payload jsonb)
-- → jsonb {ok:true, id, record:{...}} | {ok:false, denial:{...}} | {ok:false,
-- error text}. GRANT authenticated+service_role — NEVER anon.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agent_marketing_create_campaign(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_denial jsonb;
  v_used int;
  v_name text;
  v_channel_raw text;
  v_channel_key text;
  v_status text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_spend numeric;
  v_has_channels boolean;
  v_id uuid;
BEGIN
  -- ── payload ──────────────────────────────────────────────────────────────
  v_name := left(trim(p_payload->>'name'), 200);
  v_channel_raw := trim(p_payload->>'channel_key');
  v_status := COALESCE(NULLIF(trim(p_payload->>'status'), ''), 'draft');
  v_spend := COALESCE(NULLIF(p_payload->>'spend', '')::numeric, 0);
  BEGIN
    v_starts := NULLIF(p_payload->>'starts_at', '')::timestamptz;
    v_ends := NULLIF(p_payload->>'ends_at', '')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid payload: ' || SQLERRM);
  END;
  IF v_name IS NULL OR v_name = '' OR v_channel_raw IS NULL OR v_channel_raw = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'name and channel_key are required');
  END IF;
  IF v_status NOT IN ('active', 'paused', 'ended', 'draft') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status must be one of active|paused|ended|draft');
  END IF;

  -- ── authorization: role → plan → campaigns_active cap ────────────────────
  SELECT count(*) INTO v_used FROM plg_marketing_campaigns c
  WHERE c.tenant_id = p_tenant_id AND c.status = 'active';
  v_denial := agent_guard(p_tenant_id, p_actor_user_id,
                          'marketing', 'create', 'campaigns_active', v_used,
                          CASE WHEN v_status = 'active' THEN 1 ELSE 0 END);
  IF v_denial IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'denial', v_denial);
  END IF;

  -- ── channel resolution (key or label, normalized) ────────────────────────
  SELECT EXISTS (SELECT 1 FROM plg_marketing_channels ch WHERE ch.tenant_id = p_tenant_id)
    INTO v_has_channels;
  IF v_has_channels THEN
    SELECT ch.channel_key INTO v_channel_key
    FROM plg_marketing_channels ch
    WHERE ch.tenant_id = p_tenant_id
      AND (
        regexp_replace(lower(ch.channel_key), '[^a-z0-9]', '', 'g')
          = regexp_replace(lower(v_channel_raw), '[^a-z0-9]', '', 'g')
        OR regexp_replace(lower(ch.label), '[^a-z0-9]', '', 'g')
          = regexp_replace(lower(v_channel_raw), '[^a-z0-9]', '', 'g')
      )
    LIMIT 1;
    IF v_channel_key IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error',
        'unknown channel "' || v_channel_raw || '" — valid channels: ' ||
        COALESCE((SELECT string_agg(ch.channel_key, ', ' ORDER BY ch.channel_key)
                  FROM plg_marketing_channels ch WHERE ch.tenant_id = p_tenant_id), ''));
    END IF;
  ELSE
    v_channel_key := v_channel_raw;
  END IF;

  -- ── write + audit ────────────────────────────────────────────────────────
  INSERT INTO plg_marketing_campaigns (tenant_id, name, channel_key, status, starts_at, ends_at, spend)
  VALUES (p_tenant_id, v_name, v_channel_key, v_status, COALESCE(v_starts, now()), v_ends, v_spend)
  RETURNING id INTO v_id;

  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_user_id, 'agent.createCampaign', 'marketing_campaign', v_id::text,
          jsonb_build_object('payload', p_payload));

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'record', jsonb_build_object(
      'id', v_id,
      'name', v_name,
      'channel_key', v_channel_key,
      'status', v_status,
      'starts_at', COALESCE(v_starts, now()),
      'spend', v_spend
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.agent_marketing_create_campaign(uuid, uuid, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.agent_marketing_create_campaign(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_marketing_create_campaign(uuid, uuid, jsonb)
  TO authenticated, service_role;
