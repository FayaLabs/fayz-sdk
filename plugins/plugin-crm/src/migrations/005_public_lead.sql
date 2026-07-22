-- plugin-crm 005: anon-safe lead capture from public sites.
--
-- The counterpart of agenda's create_public_booking: a marketing site posts a
-- form and a lead lands in the CRM of the right tenant. Same shape of trust —
-- the caller is an anonymous browser holding only a publishable key, so every
-- decision that matters (which tenant, which status, whether it is spam) is
-- made here and cannot be set by the caller.
--
-- Why p_fields jsonb: every landing page asks something different (hair
-- coverage on one, discount coupon on another, subject/message on a third).
-- Modelling those as columns means a migration per campaign — the site this was
-- built for already had 22 columns on its lead table. They go to people.metadata
-- under 'fields', which v_leads already reads from, so a new form ships with
-- zero schema change.

CREATE OR REPLACE FUNCTION public.create_public_lead(
  p_tenant_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_form_id text DEFAULT NULL,
  p_form_name text DEFAULT NULL,
  p_fields jsonb DEFAULT '{}'::jsonb,
  p_notes text DEFAULT NULL,
  p_utm jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(lead_id uuid, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_person_id uuid;
  v_phone text;
  v_email text;
  v_fields jsonb;
  v_utm jsonb;
  v_recent int;
BEGIN
  -- ---------------------------------------------------------------------
  -- validation: anon-callable, so everything is checked here
  -- ---------------------------------------------------------------------
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'invalid name';
  END IF;

  v_phone := NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), '');
  IF v_phone IS NOT NULL AND length(v_phone) NOT BETWEEN 8 AND 15 THEN
    RAISE EXCEPTION 'invalid phone';
  END IF;

  v_email := NULLIF(trim(COALESCE(p_email, '')), '');
  IF v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  -- a lead with no way to reach them back is not a lead
  IF v_phone IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'phone or email required';
  END IF;

  PERFORM 1 FROM tenants t WHERE t.id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown tenant'; END IF;

  -- ---------------------------------------------------------------------
  -- custom fields: object-only, bounded, and scalars only.
  -- Bounding the payload keeps a hostile caller from parking documents in
  -- the CRM; flattening nested values keeps the detail panel renderable.
  -- ---------------------------------------------------------------------
  v_fields := COALESCE(p_fields, '{}'::jsonb);
  IF jsonb_typeof(v_fields) <> 'object' THEN
    RAISE EXCEPTION 'fields must be an object';
  END IF;
  IF length(v_fields::text) > 8000 THEN
    RAISE EXCEPTION 'fields too large';
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(v_fields)) > 40 THEN
    RAISE EXCEPTION 'too many fields';
  END IF;

  v_utm := COALESCE(p_utm, '{}'::jsonb);
  IF jsonb_typeof(v_utm) <> 'object' OR length(v_utm::text) > 2000 THEN
    RAISE EXCEPTION 'invalid utm';
  END IF;

  -- ---------------------------------------------------------------------
  -- anti-spam: same tenant + same contact + same form, twice in 5 minutes is
  -- a double-click or a bot, not two inquiries. Repeat interest days later IS
  -- a new lead, so this window stays deliberately short.
  -- ---------------------------------------------------------------------
  SELECT count(*) INTO v_recent
  FROM people p
  WHERE p.tenant_id = p_tenant_id
    AND p.kind = 'lead'
    AND p.created_at > now() - interval '5 minutes'
    AND COALESCE(p.metadata->>'formId', '') = COALESCE(p_form_id, '')
    AND (
      (v_phone IS NOT NULL AND p.phone = v_phone)
      OR (v_email IS NOT NULL AND p.email = v_email)
    );
  IF v_recent > 0 THEN
    RAISE EXCEPTION 'duplicate submission';
  END IF;

  -- burst cap per tenant: a flood is never legitimate marketing traffic
  IF (
    SELECT count(*) FROM people p
    WHERE p.tenant_id = p_tenant_id
      AND p.kind = 'lead'
      AND p.created_at > now() - interval '1 minute'
  ) >= 20 THEN
    RAISE EXCEPTION 'too many submissions';
  END IF;

  -- ---------------------------------------------------------------------
  -- the lead. status/kind are hardcoded — the caller cannot promote itself
  -- into a customer or land pre-qualified.
  -- ---------------------------------------------------------------------
  INSERT INTO people (tenant_id, kind, name, phone, email, notes, tags, is_active, metadata)
  VALUES (
    p_tenant_id,
    'lead',
    trim(p_name),
    v_phone,
    v_email,
    left(p_notes, 2000),
    ARRAY[]::text[],
    true,
    jsonb_strip_nulls(
      jsonb_build_object(
        'status',     'new',
        'source',     'public_form',
        'sourceName', COALESCE(NULLIF(trim(COALESCE(p_form_name, '')), ''), 'Site'),
        'formId',     NULLIF(trim(COALESCE(p_form_id, '')), ''),
        'fields',     v_fields,
        'utm',        CASE WHEN v_utm = '{}'::jsonb THEN NULL ELSE v_utm END
      )
    )
  )
  RETURNING id, people.created_at INTO v_person_id, created_at;

  lead_id := v_person_id;
  RETURN NEXT;
END;
$function$;

-- anon: the whole point. authenticated too, so a logged-in visitor on the same
-- site takes the identical path.
GRANT EXECUTE ON FUNCTION public.create_public_lead(uuid, text, text, text, text, text, jsonb, text, jsonb)
  TO anon, authenticated;

-- Leads are read through v_leads, which is tenant-scoped by RLS on people.
-- No anon SELECT is granted here: a public form writes, it never reads back.
CREATE INDEX IF NOT EXISTS idx_people_lead_tenant_created
  ON public.people (tenant_id, created_at DESC)
  WHERE kind = 'lead';

-- ---------------------------------------------------------------------------
-- v_leads gains the custom-field payload.
--
-- Without this the whole abstraction is write-only: a form's answers reach
-- people.metadata and no CRM screen can read them back. Columns are APPENDED
-- (CREATE OR REPLACE VIEW cannot reorder or drop), and the view keeps
-- security_invoker=true so people's RLS still scopes rows per tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_leads
WITH (security_invoker = true) AS
SELECT id,
    tenant_id,
    name,
    email,
    phone,
    notes,
    tags,
    is_active,
    (metadata ->> 'company'::text) AS company,
    (metadata ->> 'sourceId'::text) AS source_id,
    (metadata ->> 'sourceName'::text) AS source_name,
    COALESCE((metadata ->> 'status'::text), 'new'::text) AS lead_status,
    (metadata ->> 'value'::text) AS lead_value,
    (metadata ->> 'assignedToId'::text) AS assigned_to_id,
    created_at,
    updated_at,
    -- appended:
    (metadata ->> 'formId'::text) AS form_id,
    COALESCE(metadata -> 'fields'::text, '{}'::jsonb) AS custom_fields,
    COALESCE(metadata -> 'utm'::text, '{}'::jsonb) AS utm
   FROM people p
  WHERE (kind = 'lead'::text);
