-- Durable, provider-neutral booking events and integration-safe commands.
-- Events are written in the same transaction as saas_core.bookings changes.

CREATE TABLE IF NOT EXISTS saas_core.domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  origin text NOT NULL DEFAULT 'agenda',
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS domain_events_tenant_occurred
  ON saas_core.domain_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS domain_events_aggregate
  ON saas_core.domain_events (aggregate_type, aggregate_id, occurred_at DESC);

ALTER TABLE saas_core.domain_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON saas_core.domain_events FROM anon, authenticated;
GRANT SELECT, INSERT ON saas_core.domain_events TO service_role;

COMMENT ON TABLE saas_core.domain_events IS
  'Immutable integration events. Consumers must use an extension-specific durable outbox.';

CREATE OR REPLACE FUNCTION saas_core.booking_event_context(row_data jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(row_data->'metadata'->'_integration', '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION saas_core.emit_booking_domain_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = saas_core, public
AS $$
DECLARE
  record_data jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  previous_data jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
  context_data jsonb := saas_core.booking_event_context(record_data);
  emitted_type text;
  correlation uuid;
BEGIN
  emitted_type := CASE
    WHEN TG_OP = 'INSERT' THEN 'booking.created'
    WHEN TG_OP = 'DELETE' THEN 'booking.deleted'
    WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN 'booking.cancelled'
    WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'booking.status_changed'
    ELSE 'booking.updated'
  END;

  BEGIN
    correlation := NULLIF(context_data->>'correlationId', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    correlation := NULL;
  END;

  INSERT INTO saas_core.domain_events (
    tenant_id, aggregate_type, aggregate_id, event_type, origin,
    correlation_id, payload
  ) VALUES (
    (record_data->>'tenant_id')::uuid,
    'booking',
    (record_data->>'id')::uuid,
    emitted_type,
    COALESCE(NULLIF(current_setting('app.booking_origin', true), ''), NULLIF(context_data->>'origin', ''), 'agenda'),
    COALESCE(NULLIF(current_setting('app.booking_correlation_id', true), '')::uuid, correlation, gen_random_uuid()),
    jsonb_strip_nulls(jsonb_build_object(
      'booking', record_data - 'tenant_id',
      'previous', previous_data - 'tenant_id'
    ))
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_booking_domain_event ON saas_core.bookings;
CREATE TRIGGER trg_emit_booking_domain_event
  AFTER INSERT OR UPDATE OR DELETE ON saas_core.bookings
  FOR EACH ROW EXECUTE FUNCTION saas_core.emit_booking_domain_event();

CREATE OR REPLACE FUNCTION saas_core.assert_booking_command_access(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = saas_core, public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND p_tenant_id NOT IN (SELECT saas_core.user_tenant_ids()) THEN
    RAISE EXCEPTION 'tenant access denied' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION saas_core.command_update_booking(
  p_tenant_id uuid,
  p_booking_id uuid,
  p_patch jsonb,
  p_origin text,
  p_correlation_id uuid DEFAULT gen_random_uuid()
)
RETURNS saas_core.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = saas_core, public
AS $$
DECLARE
  result saas_core.bookings;
  allowed_patch jsonb;
BEGIN
  PERFORM saas_core.assert_booking_command_access(p_tenant_id);
  PERFORM set_config('app.booking_origin', p_origin, true);
  PERFORM set_config('app.booking_correlation_id', p_correlation_id::text, true);
  -- Only the explicit keys read below are applied. Keeping JSON null values is
  -- intentional: integrations must be able to clear optional fields.
  allowed_patch := COALESCE(p_patch, '{}'::jsonb);

  UPDATE saas_core.bookings b SET
    starts_at = COALESCE((allowed_patch->>'starts_at')::timestamptz, b.starts_at),
    ends_at = CASE WHEN allowed_patch ? 'ends_at' THEN (allowed_patch->>'ends_at')::timestamptz ELSE b.ends_at END,
    status = COALESCE(allowed_patch->>'status', b.status),
    notes = CASE WHEN allowed_patch ? 'notes' THEN allowed_patch->>'notes' ELSE b.notes END,
    party_id = CASE WHEN allowed_patch ? 'party_id' THEN (allowed_patch->>'party_id')::uuid ELSE b.party_id END,
    assignee_id = CASE WHEN allowed_patch ? 'assignee_id' THEN (allowed_patch->>'assignee_id')::uuid ELSE b.assignee_id END,
    location_id = CASE WHEN allowed_patch ? 'location_id' THEN (allowed_patch->>'location_id')::uuid ELSE b.location_id END
  WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id
  RETURNING b.* INTO result;

  IF result.id IS NULL THEN RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002'; END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION saas_core.command_import_external_block(
  p_tenant_id uuid,
  p_assignee_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_title text,
  p_external_id text,
  p_origin text,
  p_correlation_id uuid DEFAULT gen_random_uuid()
)
RETURNS saas_core.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = saas_core, public
AS $$
DECLARE result saas_core.bookings;
BEGIN
  PERFORM saas_core.assert_booking_command_access(p_tenant_id);
  PERFORM set_config('app.booking_origin', p_origin, true);
  PERFORM set_config('app.booking_correlation_id', p_correlation_id::text, true);

  SELECT * INTO result FROM saas_core.bookings
   WHERE tenant_id = p_tenant_id
     AND metadata->>'googleCalendarEventId' = p_external_id
   LIMIT 1;

  IF result.id IS NOT NULL THEN
    RETURN saas_core.command_update_booking(p_tenant_id, result.id,
      jsonb_build_object('starts_at', p_starts_at, 'ends_at', p_ends_at, 'notes', p_title),
      p_origin, p_correlation_id);
  END IF;

  INSERT INTO saas_core.bookings (
    tenant_id, kind, assignee_id, starts_at, ends_at, status, notes, metadata
  ) VALUES (
    p_tenant_id, 'block', p_assignee_id, p_starts_at, p_ends_at, 'confirmed', p_title,
    jsonb_build_object('googleCalendarEventId', p_external_id, 'source', p_origin)
  ) RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION saas_core.command_delete_external_booking(
  p_tenant_id uuid,
  p_external_id text,
  p_origin text,
  p_correlation_id uuid DEFAULT gen_random_uuid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = saas_core, public
AS $$
DECLARE target_id uuid;
BEGIN
  PERFORM saas_core.assert_booking_command_access(p_tenant_id);
  PERFORM set_config('app.booking_origin', p_origin, true);
  PERFORM set_config('app.booking_correlation_id', p_correlation_id::text, true);
  SELECT id INTO target_id FROM saas_core.bookings
   WHERE tenant_id = p_tenant_id AND metadata->>'googleCalendarEventId' = p_external_id LIMIT 1;
  IF target_id IS NULL THEN RETURN false; END IF;
  DELETE FROM saas_core.bookings WHERE id = target_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION saas_core.command_link_external_event(
  p_tenant_id uuid,
  p_booking_id uuid,
  p_external_id text,
  p_origin text,
  p_correlation_id uuid DEFAULT gen_random_uuid()
)
RETURNS saas_core.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = saas_core, public
AS $$
DECLARE result saas_core.bookings;
BEGIN
  PERFORM saas_core.assert_booking_command_access(p_tenant_id);
  PERFORM set_config('app.booking_origin', p_origin, true);
  PERFORM set_config('app.booking_correlation_id', p_correlation_id::text, true);
  UPDATE saas_core.bookings b SET metadata = COALESCE(b.metadata, '{}') || jsonb_build_object(
    'googleCalendarEventId', p_external_id,
    'googleCalendarSyncedAt', now()
  ) WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id
  RETURNING b.* INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002'; END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION saas_core.command_update_booking(uuid, uuid, jsonb, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION saas_core.command_import_external_block(uuid, uuid, timestamptz, timestamptz, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION saas_core.command_delete_external_booking(uuid, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION saas_core.command_link_external_event(uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION saas_core.command_update_booking(uuid, uuid, jsonb, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION saas_core.command_import_external_block(uuid, uuid, timestamptz, timestamptz, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION saas_core.command_delete_external_booking(uuid, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION saas_core.command_link_external_event(uuid, uuid, text, text, uuid) TO authenticated, service_role;
