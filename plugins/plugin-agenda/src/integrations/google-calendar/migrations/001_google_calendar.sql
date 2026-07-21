-- ---------------------------------------------------------------------------
-- Google Calendar integration (bidirectional) — connection + audit + triggers
-- ---------------------------------------------------------------------------
-- Outbound (Fayz booking → Google event) fires from a trigger on public.appointments
-- via pg_net to the google-calendar-sync edge function (push_event). Inbound
-- (Google → booking) runs on a pg_cron schedule (pull_events) and/or a Google
-- watch-channel webhook. The booking↔event link is stored on
-- public.appointments.metadata.googleCalendarEventId (no schema change there).

-- Plugin-owned tables carry the platform `plg_<plugin>_` prefix (DATA-MODEL.md
-- Ring 1). Legacy pools provisioned under the old `calendar_*` names are migrated
-- by 003_plg_rename.sql; fresh installs are born with the prefixed names here.
CREATE TABLE IF NOT EXISTS public.plg_calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google',
  oauth_refresh_token text,
  oauth_access_token text,
  token_expires_at timestamptz,
  calendar_id text NOT NULL DEFAULT 'primary',
  -- Incremental pull cursor + Google watch channel bookkeeping.
  sync_token text,
  channel_id text,
  channel_resource_id text,
  channel_expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);
ALTER TABLE public.plg_calendar_integrations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_calendar_integrations_tenant ON public.plg_calendar_integrations(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_calendar_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  direction text NOT NULL,                 -- inbound | outbound
  trigger text,                            -- on-write | scheduled | webhook | manual
  status text NOT NULL DEFAULT 'success',  -- success | partial | error
  fetched integer NOT NULL DEFAULT 0,
  written integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS: tenant isolation.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['plg_calendar_integrations','plg_calendar_sync_log'])
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_rls') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids())) WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_rls', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Outbound trigger: booking change → edge function (push_event).
-- Requires pg_net + a configured function URL. Set once per project:
--   ALTER DATABASE postgres SET app.gcal_sync_url = 'https://<ref>.functions.supabase.co/google-calendar-sync';
--   ALTER DATABASE postgres SET app.gcal_service_key = '<service-role-key>';
-- Safe to skip in environments without pg_net — outbound also works via the
-- client-side withGoogleCalendarSync() decorator.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_gcal_push_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  url text := current_setting('app.gcal_sync_url', true);
  key text := current_setting('app.gcal_service_key', true);
  rec record := COALESCE(NEW, OLD);
  op  text := lower(TG_OP);
BEGIN
  IF url IS NULL OR url = '' THEN RETURN COALESCE(NEW, OLD); END IF;
  PERFORM net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || COALESCE(key, '')),
    body := jsonb_build_object('action', 'push_event', 'op', op, 'bookingId', rec.id, 'tenantId', rec.tenant_id)
  );
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_gcal_push ON public.appointments;
CREATE TRIGGER trg_gcal_push
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.fn_gcal_push_booking();

-- Inbound schedule (optional): pull external changes every 10 minutes.
--   SELECT cron.schedule('gcal-pull', '*/10 * * * *', $$
--     SELECT net.http_post(
--       url := current_setting('app.gcal_sync_url'),
--       headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||current_setting('app.gcal_service_key')),
--       body := jsonb_build_object('action','pull_events'));
--   $$);
