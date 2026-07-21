-- ---------------------------------------------------------------------------
-- 003_plg_rename.sql — standardize the Google Calendar connector objects onto
-- the platform `plg_<plugin>_` prefix (DATA-MODEL.md Ring 1).
--
--   calendar_integrations → plg_calendar_integrations
--   calendar_channels     → plg_calendar_channels
--   calendar_sync_log     → plg_calendar_sync_log
--
-- Legacy-pool remediation ONLY: 001/002 now create the prefixed names directly,
-- so fresh installs never reach a rename branch. Fully idempotent and guarded —
-- every RENAME fires only when the old object exists and the new one does not,
-- so re-running (or running on an already-prefixed pool) is a no-op.
--
-- A table RENAME preserves its data, RLS state, policies, grants, indexes,
-- constraints and triggers (they follow the table), so §1 only renames the
-- table + the explicitly-named indexes. §2 then re-points the SECURITY DEFINER
-- gcal_* functions whose bodies hard-code the old table names.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- §1 — Guarded table + index renames.
-- ===========================================================================
DO $$
BEGIN
  IF to_regclass('public.calendar_integrations') IS NOT NULL
     AND to_regclass('public.plg_calendar_integrations') IS NULL THEN
    ALTER TABLE public.calendar_integrations RENAME TO plg_calendar_integrations;
  END IF;

  IF to_regclass('public.calendar_channels') IS NOT NULL
     AND to_regclass('public.plg_calendar_channels') IS NULL THEN
    ALTER TABLE public.calendar_channels RENAME TO plg_calendar_channels;
  END IF;

  IF to_regclass('public.calendar_sync_log') IS NOT NULL
     AND to_regclass('public.plg_calendar_sync_log') IS NULL THEN
    ALTER TABLE public.calendar_sync_log RENAME TO plg_calendar_sync_log;
  END IF;

  -- Named indexes do not follow a table rename automatically.
  IF to_regclass('public.idx_calendar_integrations_tenant') IS NOT NULL
     AND to_regclass('public.idx_plg_calendar_integrations_tenant') IS NULL THEN
    ALTER INDEX public.idx_calendar_integrations_tenant RENAME TO idx_plg_calendar_integrations_tenant;
  END IF;

  IF to_regclass('public.idx_calendar_channels_tenant') IS NOT NULL
     AND to_regclass('public.idx_plg_calendar_channels_tenant') IS NULL THEN
    ALTER INDEX public.idx_calendar_channels_tenant RENAME TO idx_plg_calendar_channels_tenant;
  END IF;

  IF to_regclass('public.idx_calendar_channels_integration') IS NOT NULL
     AND to_regclass('public.idx_plg_calendar_channels_integration') IS NULL THEN
    ALTER INDEX public.idx_calendar_channels_integration RENAME TO idx_plg_calendar_channels_integration;
  END IF;
END $$;

-- ===========================================================================
-- §2 — Re-point the inbound SECURITY DEFINER writers at the prefixed names.
-- These bodies are byte-identical to 002_smart_sync.sql except the calendar_*
-- table references, which now read plg_calendar_*. gcal_apply_event_patch and
-- gcal_stamp_outbound only touch public.appointments (unaffected by the rename)
-- and are re-asserted here for completeness so all four writers stay in step.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.gcal_import_event(
  p_tenant_id   uuid,
  p_channel_id  uuid,
  p_event_id    text,
  p_etag        text,
  p_summary     text,
  p_starts_at   timestamptz,
  p_ends_at     timestamptz,
  p_all_day     boolean,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch          record;
  v_kind        text;
  v_assignee    uuid;
  v_location    uuid;
  v_ends        timestamptz;
  v_meta        jsonb;
  v_existing    uuid;
  v_appt        uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_event_id IS NULL OR p_starts_at IS NULL THEN
    RAISE EXCEPTION 'gcal_import_event: tenant, event id and start are required';
  END IF;

  PERFORM set_config('app.booking_origin', 'google', true);

  SELECT c.import_mode, c.target_kind, c.target_id
    INTO v_ch
  FROM plg_calendar_channels c
  WHERE c.id = p_channel_id AND c.tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'gcal_import_event: unknown channel for tenant'; END IF;

  v_kind     := CASE WHEN v_ch.import_mode = 'appointment' THEN 'appointment' ELSE 'block' END;
  v_assignee := CASE WHEN v_ch.target_kind = 'assignee' THEN v_ch.target_id ELSE NULL END;
  v_location := CASE WHEN v_ch.target_kind = 'location' THEN v_ch.target_id ELSE NULL END;

  v_ends := COALESCE(
    p_ends_at,
    CASE WHEN COALESCE(p_all_day, false) THEN p_starts_at + interval '1 day' ELSE p_starts_at END
  );

  v_meta := jsonb_build_object(
    'syncOrigin', 'google',
    'googleCalendarEventId', p_event_id,
    'gcalEtag', p_etag,
    'gcalChannelId', p_channel_id::text,
    'allDay', COALESCE(p_all_day, false),
    'title', p_summary,
    'source', 'google_import'
  );

  SELECT b.id INTO v_existing
  FROM appointments b
  WHERE b.tenant_id = p_tenant_id
    AND b.metadata->>'googleCalendarEventId' = p_event_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE appointments b
    SET kind        = v_kind,
        assignee_id = v_assignee,
        location_id = v_location,
        starts_at   = p_starts_at,
        ends_at     = v_ends,
        status      = 'scheduled',
        notes       = COALESCE(p_description, p_summary),
        metadata    = COALESCE(b.metadata, '{}'::jsonb) || v_meta,
        updated_at  = now()
    WHERE b.id = v_existing
    RETURNING b.id INTO v_appt;
  ELSE
    INSERT INTO appointments (tenant_id, kind, assignee_id, location_id,
                              starts_at, ends_at, status, notes, metadata)
    VALUES (p_tenant_id, v_kind, v_assignee, v_location,
            p_starts_at, v_ends, 'scheduled', COALESCE(p_description, p_summary), v_meta)
    RETURNING id INTO v_appt;
  END IF;

  RETURN v_appt;
END $$;

CREATE OR REPLACE FUNCTION public.gcal_apply_event_patch(
  p_tenant_id uuid,
  p_event_id  text,
  p_etag      text,
  p_starts_at timestamptz,
  p_ends_at   timestamptz,
  p_summary   text,
  p_cancelled boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt      uuid;
  v_curr_etag text;
BEGIN
  IF p_tenant_id IS NULL OR p_event_id IS NULL THEN
    RAISE EXCEPTION 'gcal_apply_event_patch: tenant and event id are required';
  END IF;

  PERFORM set_config('app.booking_origin', 'google', true);

  SELECT b.id, b.metadata->>'gcalEtag'
    INTO v_appt, v_curr_etag
  FROM appointments b
  WHERE b.tenant_id = p_tenant_id
    AND b.metadata->>'googleCalendarEventId' = p_event_id
  LIMIT 1;

  IF v_appt IS NULL THEN RETURN NULL; END IF;
  IF p_etag IS NOT NULL AND p_etag = v_curr_etag THEN
    RETURN NULL;
  END IF;

  IF COALESCE(p_cancelled, false) THEN
    UPDATE appointments b
    SET status     = 'cancelled',
        metadata   = COALESCE(b.metadata, '{}'::jsonb)
                     || jsonb_build_object('syncOrigin', 'google', 'gcalEtag', p_etag),
        updated_at = now()
    WHERE b.id = v_appt;
  ELSE
    UPDATE appointments b
    SET starts_at  = COALESCE(p_starts_at, b.starts_at),
        ends_at    = COALESCE(p_ends_at, b.ends_at),
        notes      = COALESCE(p_summary, b.notes),
        metadata   = COALESCE(b.metadata, '{}'::jsonb)
                     || jsonb_build_object('syncOrigin', 'google',
                                           'gcalEtag', p_etag,
                                           'title', COALESCE(p_summary, b.metadata->>'title')),
        updated_at = now()
    WHERE b.id = v_appt;
  END IF;

  RETURN v_appt;
END $$;

CREATE OR REPLACE FUNCTION public.gcal_stamp_outbound(
  p_tenant_id   uuid,
  p_booking_id  uuid,
  p_event_id    text,
  p_etag        text DEFAULT NULL,
  p_calendar_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_booking_id IS NULL OR p_event_id IS NULL THEN
    RAISE EXCEPTION 'gcal_stamp_outbound: tenant, booking and event id are required';
  END IF;

  PERFORM set_config('app.booking_origin', 'google', true);

  UPDATE appointments b
  SET metadata   = COALESCE(b.metadata, '{}'::jsonb)
                   || jsonb_build_object('googleCalendarEventId', p_event_id,
                                         'gcalEtag', p_etag,
                                         'gcalSyncedAt', now())
                   || CASE WHEN p_calendar_id IS NULL THEN '{}'::jsonb
                           ELSE jsonb_build_object('gcalCalendarId', p_calendar_id) END,
      updated_at = now()
  WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id
  RETURNING b.id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.gcal_unlink_channel(
  p_channel_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE plg_calendar_channels c
  SET sync_token         = NULL,
      channel_id         = NULL,
      resource_id        = NULL,
      channel_expires_at = NULL,
      updated_at         = now()
  WHERE c.id = p_channel_id
  RETURNING c.id INTO v_id;
  RETURN v_id;
END $$;

-- Re-assert the service_role-only lock (idempotent; matches 002 §4).
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.gcal_import_event(uuid, uuid, text, text, text, timestamptz, timestamptz, boolean, text)',
    'public.gcal_apply_event_patch(uuid, text, text, timestamptz, timestamptz, text, boolean)',
    'public.gcal_stamp_outbound(uuid, uuid, text, text, text)',
    'public.gcal_unlink_channel(uuid)'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
