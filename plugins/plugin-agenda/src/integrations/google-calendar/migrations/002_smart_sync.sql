-- ---------------------------------------------------------------------------
-- Google Calendar SMART SYNC — multi-calendar de-para + loop-safe two-way sync
-- ---------------------------------------------------------------------------
-- Builds on 001_google_calendar.sql. Where 001 modelled a single calendar per
-- tenant (plg_calendar_integrations, one outbound trigger, a pull template), 002
-- makes the sync vertical-agnostic and bidirectional-safe:
--
--   §1  public.plg_calendar_channels — de-para: one Google calendar → one sync
--                                       target (whole tenant / assignee / service
--                                       / location), per direction + import mode
--   §2  fn_gcal_push_booking (REPLACE)— loop-prevention guard + correlation id
--   §3  plg_calendar_sync_log         — correlation_id + channel_id_ref columns
--   §4  inbound write functions       — the ONLY path Google→booking writes take
--                                       (gcal_import_event / gcal_apply_event_patch
--                                        / gcal_unlink_channel), SECURITY DEFINER,
--                                       service_role-only
--   §5  get_available_slots (REPLACE) — tenant-wide imported blocks now also
--                                       remove slots for every professional
--   §6  pg_cron template              — per-channel pull
--
-- Idempotent / re-runnable: IF NOT EXISTS, CREATE OR REPLACE, DROP … IF EXISTS.
-- Written against the canonical public names (appointments uses starts_at/ends_at,
-- metadata jsonb, party_id/assignee_id — see packages/db 004_archetypes.sql).
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- §1 — plg_calendar_channels: multi-calendar de-para (vertical-agnostic)
--   target_kind NULL  → whole tenant agenda (agency-os): every professional
--   target_kind 'assignee' → calendar maps to one professional (school: teacher)
--   target_kind 'service' | 'location' → clinic-style mapping
--   import_mode 'block'       → inbound events become opaque busy blocks
--   import_mode 'appointment' → inbound events become real appointments
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.plg_calendar_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.plg_calendar_integrations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  google_calendar_id text NOT NULL,
  summary text,
  color text,
  direction text NOT NULL DEFAULT 'bidirectional'
    CHECK (direction IN ('inbound','outbound','bidirectional','off')),
  target_kind text CHECK (target_kind IN ('assignee','service','location')),
  target_id uuid,
  import_mode text NOT NULL DEFAULT 'block'
    CHECK (import_mode IN ('block','appointment')),
  sync_token text,
  channel_id text,
  resource_id text,
  channel_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, google_calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_plg_calendar_channels_tenant      ON public.plg_calendar_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_calendar_channels_integration ON public.plg_calendar_channels(integration_id);

ALTER TABLE public.plg_calendar_channels ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_calendar_channels TO authenticated;
-- service_role bypasses RLS, but this table is born after 004's blanket grant,
-- so grant it explicitly (the inbound functions run as definer/service_role).
GRANT ALL ON public.plg_calendar_channels TO service_role;

DROP TRIGGER IF EXISTS plg_calendar_channels_updated_at ON public.plg_calendar_channels;
CREATE TRIGGER plg_calendar_channels_updated_at BEFORE UPDATE ON public.plg_calendar_channels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: tenant isolation (padrão 001) + explicit service_role FOR ALL policy
-- (matches the vigente service_role policy pattern from 001_core payment_events).
DROP POLICY IF EXISTS plg_calendar_channels_rls ON public.plg_calendar_channels;
CREATE POLICY plg_calendar_channels_rls ON public.plg_calendar_channels
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

DROP POLICY IF EXISTS plg_calendar_channels_service ON public.plg_calendar_channels;
CREATE POLICY plg_calendar_channels_service ON public.plg_calendar_channels
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===========================================================================
-- §2 — Outbound trigger with loop-prevention + correlation id.
-- CREATE OR REPLACE of 001's fn_gcal_push_booking. Same pg_net → edge function
-- payload (app.gcal_sync_url / app.gcal_service_key), but now:
--   * SKIP the push when the write itself came from the Google sync, detected by
--     the TRANSACTION-LOCAL GUC app.booking_origin = 'google' — set by every §4
--     writer via set_config(..., true) and gone when the transaction ends.
--     This is what stops the Google→booking→Google→… echo loop.
--     Deliberately NOT a persistent metadata check: a sticky marker
--     (metadata.syncOrigin) would permanently mute pushes for imported events,
--     so a later admin edit would never reach Google. metadata.syncOrigin is
--     kept by §4 as provenance only — this trigger does not read it.
--   * carry a correlation_id so both directions can be stitched in the sync log
--     (from GUC app.booking_correlation_id, else a fresh uuid — design ported
--      from PR #7).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fn_gcal_push_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  url  text := current_setting('app.gcal_sync_url', true);
  key  text := current_setting('app.gcal_service_key', true);
  rec  record := COALESCE(NEW, OLD);
  op   text := lower(TG_OP);
  corr text := NULLIF(current_setting('app.booking_correlation_id', true), '');
BEGIN
  -- Loop guard: never bounce a Google-originated write back to Google.
  -- Transaction-local GUC only (see §2 header for why not persistent metadata).
  IF current_setting('app.booking_origin', true) = 'google' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF url IS NULL OR url = '' THEN RETURN COALESCE(NEW, OLD); END IF;

  PERFORM net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || COALESCE(key, '')),
    body := jsonb_build_object(
      'action', 'push_event',
      'op', op,
      'bookingId', rec.id,
      'tenantId', rec.tenant_id,
      'correlationId', COALESCE(corr, gen_random_uuid()::text)
    )
  );
  RETURN COALESCE(NEW, OLD);
END $$;

-- Re-assert the trigger (idempotent; unchanged from 001).
DROP TRIGGER IF EXISTS trg_gcal_push ON public.appointments;
CREATE TRIGGER trg_gcal_push
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.fn_gcal_push_booking();

-- ===========================================================================
-- §3 — sync log: correlate the two directions + reference the source channel.
-- ===========================================================================
ALTER TABLE public.plg_calendar_sync_log
  ADD COLUMN IF NOT EXISTS correlation_id uuid;
ALTER TABLE public.plg_calendar_sync_log
  ADD COLUMN IF NOT EXISTS channel_id_ref uuid
    REFERENCES public.plg_calendar_channels(id) ON DELETE SET NULL;
-- Unlinked future events seen during a pull (import-wizard candidates), so the
-- log can show "N eventos aguardando import" without re-hitting Google.
ALTER TABLE public.plg_calendar_sync_log
  ADD COLUMN IF NOT EXISTS discovered integer;

-- ===========================================================================
-- §4 — Inbound write path (Google → booking). THE single entry point used by
-- the edge function (scheduled pull, webhook, and the import wizard). All three
-- functions are SECURITY DEFINER with SET search_path = public and are granted
-- to service_role ONLY (anon/authenticated explicitly revoked) — they bypass the
-- tenant RLS on purpose and must never be reachable from the anon/authenticated
-- PostgREST surface. Every writer sets the TRANSACTION-LOCAL GUC
-- app.booking_origin='google' (set_config ..., true) so §2's trigger suppresses
-- the echo for THIS write only; metadata.syncOrigin is provenance, not a guard.
-- ===========================================================================

-- gcal_import_event: create (or idempotently update) a booking from a Google
-- event, honouring the channel's import_mode + target mapping.
--   kind        = 'block' | 'appointment'      (from channel.import_mode)
--   assignee_id = channel.target_id when target_kind='assignee', else NULL
--                 (NULL = tenant-wide → blocks every professional, see §5)
--   location_id = channel.target_id when target_kind='location', else NULL
--   status      = 'scheduled'
-- No order is created — an external import is not a sale. Idempotent on
-- (tenant_id, metadata.googleCalendarEventId): update in place if seen before.
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

  -- Transaction-local: §2's trigger skips the echo for this write only.
  PERFORM set_config('app.booking_origin', 'google', true);

  -- Resolve the channel mapping (must belong to the same tenant).
  SELECT c.import_mode, c.target_kind, c.target_id
    INTO v_ch
  FROM plg_calendar_channels c
  WHERE c.id = p_channel_id AND c.tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'gcal_import_event: unknown channel for tenant'; END IF;

  v_kind     := CASE WHEN v_ch.import_mode = 'appointment' THEN 'appointment' ELSE 'block' END;
  v_assignee := CASE WHEN v_ch.target_kind = 'assignee' THEN v_ch.target_id ELSE NULL END;
  v_location := CASE WHEN v_ch.target_kind = 'location' THEN v_ch.target_id ELSE NULL END;

  -- All-day events without an explicit end block the whole day so §5 excludes it.
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

  -- Idempotency: has this event already been imported for the tenant?
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

-- gcal_apply_event_patch: apply an inbound reschedule/cancel to an already-linked
-- booking. Located by metadata.googleCalendarEventId. Echo suppression: if the
-- stored gcalEtag already equals the incoming etag, this is our own write coming
-- back — skip and return NULL. Every real write re-stamps syncOrigin='google'.
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

  -- Transaction-local: §2's trigger skips the echo for this write only.
  PERFORM set_config('app.booking_origin', 'google', true);

  SELECT b.id, b.metadata->>'gcalEtag'
    INTO v_appt, v_curr_etag
  FROM appointments b
  WHERE b.tenant_id = p_tenant_id
    AND b.metadata->>'googleCalendarEventId' = p_event_id
  LIMIT 1;

  IF v_appt IS NULL THEN RETURN NULL; END IF;                 -- not linked here
  IF p_etag IS NOT NULL AND p_etag = v_curr_etag THEN
    RETURN NULL;                                              -- echo: nothing changed
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

-- gcal_stamp_outbound: after the edge function creates the Google event for an
-- outbound push, it stamps the fresh event id/etag back onto the appointment.
-- Bookkeeping only — must not re-fire §2's trigger, hence the GUC. Does NOT set
-- metadata.syncOrigin (the booking's provenance is still the app/site).
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

  -- Transaction-local: §2's trigger skips the echo for this write only.
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

-- gcal_unlink_channel: forget the incremental cursor + Google watch bookkeeping
-- for a channel (used on disconnect / re-watch). Leaves the mapping row in place.
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

-- Lock the inbound writers to service_role only.
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

-- ===========================================================================
-- §5 — get_available_slots: imported Google blocks must remove availability.
-- CREATE OR REPLACE keeping the EXACT signature (anon + admin both call it, and
-- it is graded on the same shape as plugin-agenda/src/migrations/001_public_booking.sql).
--
-- Conceptual diff vs 001 — ONE condition in the overlap NOT EXISTS:
--   before:  AND b.assignee_id = c.assignee_id
--   after:   AND (b.assignee_id = c.assignee_id
--                 OR (b.assignee_id IS NULL AND b.kind = 'block'))
-- Rationale: a tenant-wide BLOCK imported from Google (target_kind NULL →
-- assignee_id IS NULL, kind 'block', see §4) must busy-out the slot for EVERY
-- professional. Restricted to kind='block' so an unassigned admin appointment
-- keeps the 001 behaviour (blocks nobody). Per-assignee rows keep matching on
-- assignee_id.
-- Everything else is byte-identical to 001: the status filter already covers
-- "any non-cancelled kind" (no_show also excluded), and the p_assignee_id-NULL
-- fan-out across staff via day_schedules is preserved untouched.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_tenant_id uuid,
  p_date date,
  p_duration_minutes integer,
  p_assignee_id uuid DEFAULT NULL,
  p_slot_interval integer DEFAULT 30
) RETURNS TABLE (slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
BEGIN
  -- tight validation: this function is anon-callable
  IF p_duration_minutes IS NULL OR p_duration_minutes NOT BETWEEN 5 AND 480 THEN
    RAISE EXCEPTION 'invalid duration';
  END IF;
  IF p_slot_interval IS NULL OR p_slot_interval NOT BETWEEN 5 AND 240 THEN
    RAISE EXCEPTION 'invalid interval';
  END IF;
  IF p_date IS NULL OR p_date < current_date OR p_date > current_date + 90 THEN
    RETURN;
  END IF;

  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo') INTO v_tz
  FROM tenants t WHERE t.id = p_tenant_id;
  IF v_tz IS NULL THEN RETURN; END IF;  -- unknown tenant → empty, not an error

  RETURN QUERY
  WITH day_schedules AS (
    SELECT sc.assignee_id, sc.starts_at AS win_start, sc.ends_at AS win_end
    FROM schedules sc
    WHERE sc.tenant_id = p_tenant_id
      AND sc.kind = 'working_hours'
      AND sc.is_active
      AND (p_assignee_id IS NULL OR sc.assignee_id = p_assignee_id)
      AND (
        sc.specific_date = p_date
        OR (sc.specific_date IS NULL AND sc.day_of_week = EXTRACT(dow FROM p_date)::smallint)
      )
  ),
  candidate AS (
    SELECT
      ds.assignee_id,
      gs                                              AS s_start,
      gs + make_interval(mins => p_duration_minutes)  AS s_end
    FROM day_schedules ds
    CROSS JOIN LATERAL generate_series(
      (p_date + ds.win_start) AT TIME ZONE v_tz,
      ((p_date + ds.win_end) AT TIME ZONE v_tz) - make_interval(mins => p_duration_minutes),
      make_interval(mins => p_slot_interval)
    ) AS gs
  )
  SELECT DISTINCT c.s_start, c.s_end
  FROM candidate c
  WHERE NOT EXISTS (
    SELECT 1 FROM appointments b
    WHERE b.tenant_id = p_tenant_id
      -- SMART SYNC: match this professional's own bookings OR any tenant-wide
      -- BLOCK (assignee_id IS NULL AND kind='block', e.g. imported from Google
      -- with a whole-tenant channel) — the latter busies the slot for every
      -- professional. Assignee-less rows of other kinds (an unassigned admin
      -- appointment) keep the 001 behaviour and do not block anyone.
      AND (b.assignee_id = c.assignee_id
           OR (b.assignee_id IS NULL AND b.kind = 'block'))
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.starts_at < c.s_end
      AND COALESCE(b.ends_at, b.starts_at) > c.s_start
  )
  ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_slots(uuid, date, integer, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date, integer, uuid, integer)
  TO anon, authenticated, service_role;

-- ===========================================================================
-- §6 — Inbound schedule (optional) — per-channel incremental pull.
-- Supersedes the single-calendar template in 001. Enable once per project after
-- setting app.gcal_sync_url / app.gcal_service_key (see 001 header). The edge
-- function fans out over active channels, using each channel's sync_token cursor:
--
--   SELECT cron.schedule('gcal-pull', '*/10 * * * *', $CRON$
--     SELECT net.http_post(
--       url := current_setting('app.gcal_sync_url'),
--       headers := jsonb_build_object(
--         'Content-Type','application/json',
--         'Authorization','Bearer '||current_setting('app.gcal_service_key')),
--       body := jsonb_build_object('action','pull_events'))
--   $CRON$);
--
-- Or drive one row per channel from SQL (tighter scoping / per-channel cadence):
--
--   SELECT cron.schedule('gcal-pull-'||ch.id::text, '*/10 * * * *', format($CRON$
--     SELECT net.http_post(
--       url := current_setting('app.gcal_sync_url'),
--       headers := jsonb_build_object(
--         'Content-Type','application/json',
--         'Authorization','Bearer '||current_setting('app.gcal_service_key')),
--       body := jsonb_build_object('action','pull_events','channelId',%L))
--   $CRON$, ch.id))
--   FROM public.plg_calendar_channels ch
--   WHERE ch.is_active AND ch.direction IN ('inbound','bidirectional');
-- ===========================================================================
