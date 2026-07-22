-- ============================================================================
-- plugin-agenda 008: agent_agenda_create_appointment honors schedule exceptions.
--
-- Same precedence fix as 007, applied to the agent write path: professional
-- resolution now goes through agenda_working_windows (007 §1), so a date the
-- admin closed (day-off sentinel) or re-opened with custom hours ("horário
-- especial") binds the agent exactly like it binds the public site. Everything
-- else is byte-identical to 006 (LOCAL-time input, free-professional pick,
-- advisory lock, audit). Requires 007. Supersedes 006's function body.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agent_agenda_create_appointment(
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
  v_client_id uuid;
  v_service_id uuid;
  v_professional uuid;
  v_starts timestamptz;
  v_starts_raw text;
  v_notes text;
  v_service record;
  v_client record;
  v_ends timestamptz;
  v_tz text;
  v_order uuid;
  v_booking uuid;
BEGIN
  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo') INTO v_tz
  FROM tenants t WHERE t.id = p_tenant_id;
  IF v_tz IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown tenant');
  END IF;

  -- ── payload ──────────────────────────────────────────────────────────────
  BEGIN
    v_client_id    := (p_payload->>'client_id')::uuid;
    v_service_id   := (p_payload->>'service_id')::uuid;
    v_professional := (p_payload->>'professional_id')::uuid;
    v_starts_raw   := p_payload->>'starts_at';
    IF v_starts_raw ~ '(Z|[+-][0-9]{2}:?[0-9]{2})$' THEN
      v_starts := v_starts_raw::timestamptz;              -- explicit offset
    ELSE
      v_starts := (v_starts_raw::timestamp) AT TIME ZONE v_tz;  -- tenant-local
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid payload: ' || SQLERRM);
  END;
  v_notes := left(p_payload->>'notes', 500);
  IF v_client_id IS NULL OR v_service_id IS NULL OR v_starts IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'client_id, service_id and starts_at are required');
  END IF;
  IF v_starts <= now() OR v_starts > now() + interval '365 days' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'starts_at must be in the future (max 1 year)');
  END IF;

  -- ── authorization: role → plan → bookings_month cap ──────────────────────
  SELECT count(*) INTO v_used FROM appointments b
  WHERE b.tenant_id = p_tenant_id
    AND b.created_at >= date_trunc('month', now());
  v_denial := agent_guard(p_tenant_id, p_actor_user_id,
                          'appointments', 'create', 'bookings_month', v_used, 1);
  IF v_denial IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'denial', v_denial);
  END IF;

  -- ── invariants ───────────────────────────────────────────────────────────
  SELECT p.id, p.name INTO v_client
  FROM people p
  WHERE p.id = v_client_id AND p.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown client for this tenant');
  END IF;

  SELECT s.id, s.name, s.price, COALESCE(s.duration_minutes, 30) AS duration_minutes
    INTO v_service
  FROM services s
  WHERE s.id = v_service_id AND s.tenant_id = p_tenant_id
    AND s.is_active AND s.status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown or inactive service');
  END IF;

  v_ends := v_starts + make_interval(mins => v_service.duration_minutes);

  -- exception-aware windows (007); still prefer a professional who is FREE at
  -- the slot when the user did not name one
  SELECT w.assignee_id INTO v_professional
  FROM agenda_working_windows(
         p_tenant_id, (v_starts AT TIME ZONE v_tz)::date, v_professional) w
  WHERE (v_starts AT TIME ZONE v_tz)::time >= w.win_start
    AND (v_ends AT TIME ZONE v_tz)::time <= w.win_end
    AND NOT EXISTS (
      SELECT 1 FROM appointments b
      WHERE b.tenant_id = p_tenant_id
        AND b.assignee_id = w.assignee_id
        AND b.status NOT IN ('cancelled', 'no_show')
        AND b.starts_at < v_ends
        AND COALESCE(b.ends_at, b.starts_at) > v_starts
    )
  ORDER BY w.assignee_id
  LIMIT 1;
  IF v_professional IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'no professional is available at that slot (outside working hours or already booked). Suggest a different time. Times are tenant-local, tz ' || v_tz);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || v_professional::text, 0));
  IF EXISTS (
    SELECT 1 FROM appointments b
    WHERE b.tenant_id = p_tenant_id
      AND b.assignee_id = v_professional
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.starts_at < v_ends
      AND COALESCE(b.ends_at, b.starts_at) > v_starts
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slot no longer available');
  END IF;

  -- ── write + audit ────────────────────────────────────────────────────────
  INSERT INTO orders (tenant_id, kind, status, party_id, assignee_id, subtotal, total, notes, metadata)
  VALUES (p_tenant_id, 'appointment', 'scheduled', v_client_id, v_professional,
          v_service.price, v_service.price, v_notes,
          jsonb_build_object('source', 'agent', 'serviceNames', v_service.name))
  RETURNING id INTO v_order;

  INSERT INTO appointments (tenant_id, kind, party_id, assignee_id, order_id,
                            starts_at, ends_at, status, notes, metadata)
  VALUES (p_tenant_id, 'appointment', v_client_id, v_professional, v_order,
          v_starts, v_ends, 'scheduled', v_notes,
          jsonb_build_object('source', 'agent', 'serviceNames', v_service.name))
  RETURNING id INTO v_booking;

  INSERT INTO order_items (order_id, service_id, name, quantity, unit_price, total,
                           sort_order, duration_minutes, assignee_id)
  VALUES (v_order, v_service.id, v_service.name, 1, v_service.price, v_service.price,
          0, v_service.duration_minutes, v_professional);

  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_user_id, 'agent.createAppointment', 'appointment', v_booking::text,
          jsonb_build_object('payload', p_payload, 'order_id', v_order));

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_booking,
    'record', jsonb_build_object(
      'ref', jsonb_build_object('id', v_booking, 'resource', 'appointments',
                                'archetype', 'schedule:appointment'),
      'starts_at', v_starts,
      'ends_at', v_ends,
      'starts_at_local', to_char(v_starts AT TIME ZONE v_tz, 'YYYY-MM-DD (Dy) HH24:MI') || ' ' || v_tz,
      'ends_at_local', to_char(v_ends AT TIME ZONE v_tz, 'HH24:MI'),
      'client_name', v_client.name,
      'service_name', v_service.name,
      'price', v_service.price,
      'status', 'scheduled'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb)
  TO authenticated, service_role;
