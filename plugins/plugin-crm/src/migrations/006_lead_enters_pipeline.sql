-- plugin-crm 006: every lead lands on the board, guaranteed by the database.
--
-- The bug this closes: the leads LIST reads v_leads (public.people WHERE
-- kind='lead') while the PIPELINE reads v_deals (public.orders WHERE kind='deal'
-- + plg_crm_deal_extensions). A lead is a person; a card is an order. Nothing
-- created the second from the first — create_public_lead never touches orders —
-- so form leads landed in the list and the board stayed empty. Forever, not
-- intermittently. plg_crm_deal_extensions.lead_id has existed since 001 and was
-- NULL on every row in the pool: the link was designed and never wired.
--
-- Why a TRIGGER and not application code: a lead reaches people through at
-- least four independent writers today — the anon RPC create_public_lead, the
-- agent's generic createRecord, CSV import, and the CRM's own form. Putting the
-- board insert in any one of them leaves the other three silently broken, and
-- the next writer added leaves a fifth. Here it cannot be forgotten or bypassed,
-- including by a direct SQL insert.
--
-- Idempotent by construction: a UNIQUE index on deal_extensions.lead_id means a
-- second attempt for the same lead is a no-op, so re-running the backfill or
-- replaying the migration cannot double-card anyone.

-- ---------------------------------------------------------------------------
-- 1. One card per lead, enforced by the database rather than by the trigger
--    remembering to check.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS plg_crm_deal_extensions_lead_idx
  ON public.plg_crm_deal_extensions (lead_id) WHERE lead_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 1b. The default board, as a callable function instead of 004's one-shot loop.
--     Same pipeline and stages 004 seeds; idempotent per tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_seed_default_pipeline(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pipeline uuid;
BEGIN
  SELECT id INTO v_pipeline
    FROM public.plg_crm_pipelines
   WHERE tenant_id = p_tenant_id
   ORDER BY is_default DESC, created_at ASC
   LIMIT 1;
  IF v_pipeline IS NOT NULL THEN
    RETURN v_pipeline;
  END IF;

  INSERT INTO public.plg_crm_pipelines (tenant_id, name, is_default, is_active)
  VALUES (p_tenant_id, 'Sales Pipeline', true, true)
  RETURNING id INTO v_pipeline;

  INSERT INTO public.plg_crm_pipeline_stages
    (tenant_id, pipeline_id, name, "order", color, probability, is_won, is_lost)
  VALUES
    (p_tenant_id, v_pipeline, 'New',         0, '#6366f1', 10,  false, false),
    (p_tenant_id, v_pipeline, 'Contacted',   1, '#3b82f6', 25,  false, false),
    (p_tenant_id, v_pipeline, 'Qualified',   2, '#f59e0b', 50,  false, false),
    (p_tenant_id, v_pipeline, 'Proposal',    3, '#f97316', 75,  false, false),
    (p_tenant_id, v_pipeline, 'Negotiation', 4, '#8b5cf6', 90,  false, false),
    (p_tenant_id, v_pipeline, 'Won',         5, '#22c55e', 100, true,  false),
    (p_tenant_id, v_pipeline, 'Lost',        6, '#ef4444', 0,   false, true);

  RETURN v_pipeline;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. The lead → card projection, shared by the trigger and the backfill so the
--    two can never drift apart.
--
--    Placement is the tenant's DEFAULT pipeline, lowest `order` stage that is
--    neither won nor lost (the "New" column). A tenant with no pipeline yet is
--    skipped rather than failing: the lead must still be captured — losing a
--    real customer enquiry because a board was not configured would be a far
--    worse bug than a missing card. 004 seeds a default pipeline for every
--    tenant, so this is the empty-tenant edge, not the normal path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_place_lead_on_board(p_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead     public.people%ROWTYPE;
  v_pipeline uuid;
  v_stage    uuid;
  v_prob     numeric;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_lead FROM public.people WHERE id = p_lead_id;
  IF NOT FOUND OR v_lead.kind <> 'lead' THEN
    RETURN NULL;
  END IF;

  -- Already on the board (re-run, or a card made by hand): nothing to do.
  IF EXISTS (SELECT 1 FROM public.plg_crm_deal_extensions WHERE lead_id = p_lead_id) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_pipeline
    FROM public.plg_crm_pipelines
   WHERE tenant_id = v_lead.tenant_id
   ORDER BY is_default DESC, created_at ASC
   LIMIT 1;

  -- No board yet? Build the default one and carry on.
  --
  -- 004 seeds the default pipeline as a ONE-SHOT backfill with no trigger, so
  -- every tenant created after it ran has none — 3 of the 8 tenants in this pool
  -- were in that state. Their board renders blank no matter how many leads
  -- arrive, and it would punch a hole straight through the guarantee this
  -- migration exists to make: a lead in such a tenant would be captured and then
  -- silently skipped for want of a stage to sit in.
  --
  -- Seeded here, on demand, rather than from a trigger on public.tenants: the
  -- board is the CRM's own concern, and a plugin has no business attaching
  -- itself to tenant creation in a core table.
  IF v_pipeline IS NULL THEN
    v_pipeline := public.crm_seed_default_pipeline(v_lead.tenant_id);
  END IF;
  IF v_pipeline IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, probability INTO v_stage, v_prob
    FROM public.plg_crm_pipeline_stages
   WHERE pipeline_id = v_pipeline AND NOT is_won AND NOT is_lost
   ORDER BY "order" ASC
   LIMIT 1;
  IF v_stage IS NULL THEN
    RETURN NULL;
  END IF;

  -- The card's money value comes from the lead when the form captured one;
  -- 0 otherwise. `notes` is the deal TITLE (v_deals maps o.notes -> title), so
  -- it carries the lead's name, not the lead's message.
  INSERT INTO public.orders (
    tenant_id, kind, status, total, currency, party_id, notes, tags, metadata
  ) VALUES (
    v_lead.tenant_id,
    'deal',
    'open',
    COALESCE((v_lead.metadata ->> 'value')::numeric, 0),
    'BRL',
    v_lead.id,
    v_lead.name,
    COALESCE(v_lead.tags, '{}'),
    jsonb_build_object(
      'contactName', v_lead.name,
      'createdFrom', 'lead',
      -- Which form produced it, when there was one: lets the board be filtered
      -- by campaign without re-joining people.
      'formId', v_lead.metadata ->> 'formId'
    )
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.plg_crm_deal_extensions (
    order_id, tenant_id, pipeline_id, stage_id, probability, lead_id
  ) VALUES (
    v_order_id, v_lead.tenant_id, v_pipeline, v_stage, COALESCE(v_prob, 0), v_lead.id
  )
  -- Concurrent inserts for the same lead: the unique index above turns the
  -- loser into a no-op instead of an error the trigger would propagate back to
  -- the form submission.
  ON CONFLICT (lead_id) WHERE lead_id IS NOT NULL DO NOTHING;

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION public.crm_place_lead_on_board(uuid) IS
  'Projects a people row of kind=lead onto the tenant default pipeline as an orders(kind=deal) + deal_extension. Idempotent per lead.';

-- ---------------------------------------------------------------------------
-- 3. The trigger. AFTER INSERT so a failure here can never roll back the lead
--    itself, and EXCEPTION-guarded for the same reason: capturing the enquiry
--    is the part that must not fail. A board that missed a card is recoverable
--    (step 4 re-runs); a lost lead is not.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_lead_to_board()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.kind = 'lead' THEN
    BEGIN
      PERFORM public.crm_place_lead_on_board(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'crm_lead_to_board: lead % captured but not placed on the board: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS people_lead_to_board ON public.people;
CREATE TRIGGER people_lead_to_board
  AFTER INSERT ON public.people
  FOR EACH ROW
  WHEN (NEW.kind = 'lead')
  EXECUTE FUNCTION public.crm_lead_to_board();

-- A person PROMOTED to lead later (kind edited from contact/customer) must land
-- on the board too — otherwise the guarantee holds only for the insert path.
DROP TRIGGER IF EXISTS people_promoted_to_lead_to_board ON public.people;
CREATE TRIGGER people_promoted_to_lead_to_board
  AFTER UPDATE OF kind ON public.people
  FOR EACH ROW
  WHEN (NEW.kind = 'lead' AND OLD.kind IS DISTINCT FROM 'lead')
  EXECUTE FUNCTION public.crm_lead_to_board();

-- ---------------------------------------------------------------------------
-- 4. Realtime, so an open board updates itself instead of waiting for a reload.
--
--    The trigger above writes the card with no client involved, so the browser
--    has nothing to react to unless the change is streamed. The pool's
--    supabase_realtime publication was EMPTY — every .subscribe() in the SDK
--    was silently receiving nothing — so the table is added explicitly rather
--    than assumed. FOR EACH ROW replica identity stays default (PK): the
--    handler refetches the board, so the payload's contents are irrelevant.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'plg_crm_deal_extensions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plg_crm_deal_extensions;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Backfill every lead that predates the trigger. Idempotent via step 2's
--    own guard, so replaying this migration adds nothing.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT p.id
      FROM public.people p
      LEFT JOIN public.plg_crm_deal_extensions de ON de.lead_id = p.id
     WHERE p.kind = 'lead' AND de.id IS NULL
     ORDER BY p.created_at
  LOOP
    IF public.crm_place_lead_on_board(r.id) IS NOT NULL THEN
      n := n + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'crm 006 backfill: % lead(s) placed on the board', n;
END $$;
