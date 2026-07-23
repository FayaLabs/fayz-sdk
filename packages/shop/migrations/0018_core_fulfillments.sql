-- ============================================================================
-- fulfilment, tracking and order timeline — in core, not in the plugin
-- ----------------------------------------------------------------------------
-- orders.fulfillment_status has been an enum with nothing behind it: no carrier,
-- no tracking code, no shipped date, and no way to express "3 of the 5 items
-- went out today, the rest on Friday". A single column cannot carry a shipment,
-- and a store selling physical goods eventually ships partially.
--
-- These live in public (not plg_shop_*) for the same reason addresses and orders
-- do: a shipment is a domain fact. A service business dispatching a technician
-- and a store shipping a parcel are the same record with a different carrier.
--
--   public.fulfillments        what left, with whom, when, under which tracking
--   public.fulfillment_items   WHICH items and how many — this is what makes
--                              partial shipping expressible
--   public.order_events        the timeline: every status change, who caused it
--
-- plg_shop_orders.fulfillment_status stays, but becomes DERIVED: a trigger
-- recomputes it from the shipments, so list screens stay fast and the two can
-- never disagree. Writing it by hand is what lets a status drift from reality.
--
-- Additive and idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fulfillments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  order_id              uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','in_transit','delivered','failed','returned','cancelled')),
  carrier               text,          -- Correios, Jadlog, motoboy próprio…
  service               text,          -- PAC, SEDEX, same-day…
  tracking_code         text,
  tracking_url          text,
  shipped_at            timestamptz,
  estimated_delivery_at timestamptz,
  delivered_at          timestamptz,
  address_id            uuid REFERENCES public.addresses(id) ON DELETE SET NULL,
  notes                 text,
  metadata              jsonb NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fulfillments_order_idx  ON public.fulfillments (order_id);
CREATE INDEX IF NOT EXISTS fulfillments_tenant_idx ON public.fulfillments (tenant_id);
-- Support asks "where is code X" far more often than "what shipped for order Y".
CREATE INDEX IF NOT EXISTS fulfillments_tracking_idx
  ON public.fulfillments (tracking_code) WHERE tracking_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.fulfillment_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id uuid NOT NULL REFERENCES public.fulfillments(id) ON DELETE CASCADE,
  order_item_id  uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity       numeric NOT NULL CHECK (quantity > 0),
  UNIQUE (fulfillment_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS fulfillment_items_order_item_idx
  ON public.fulfillment_items (order_item_id);

CREATE TABLE IF NOT EXISTS public.order_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  order_id   uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind       text NOT NULL,   -- placed | paid | refunded | fulfillment_created |
                              -- in_transit | delivered | cancelled | note
  message    text,
  data       jsonb NOT NULL DEFAULT '{}',
  created_by uuid,            -- auth.uid() when a human did it; null for system
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_events_order_idx
  ON public.order_events (order_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- Derive the shop's fulfillment_status from the shipments.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_fulfillment_status(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ordered numeric; v_shipped numeric; v_status text;
BEGIN
  SELECT COALESCE(sum(quantity), 0) INTO v_ordered
    FROM public.order_items WHERE order_id = p_order_id;

  SELECT COALESCE(sum(fi.quantity), 0) INTO v_shipped
    FROM public.fulfillment_items fi
    JOIN public.fulfillments f ON f.id = fi.fulfillment_id
    JOIN public.order_items oi ON oi.id = fi.order_item_id
   WHERE oi.order_id = p_order_id
     AND f.status <> 'cancelled';

  v_status := CASE
    WHEN v_shipped <= 0 THEN 'unfulfilled'
    WHEN v_shipped >= v_ordered THEN 'fulfilled'
    ELSE 'partially_fulfilled'
  END;

  UPDATE public.plg_shop_orders
     SET fulfillment_status = v_status
   WHERE id = p_order_id AND fulfillment_status IS DISTINCT FROM v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfillment_items_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order uuid;
BEGIN
  SELECT oi.order_id INTO v_order
    FROM public.order_items oi
   WHERE oi.id = COALESCE(NEW.order_item_id, OLD.order_item_id);
  IF v_order IS NOT NULL THEN PERFORM public.refresh_fulfillment_status(v_order); END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS fulfillment_items_sync ON public.fulfillment_items;
CREATE TRIGGER fulfillment_items_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.fulfillment_items
  FOR EACH ROW EXECUTE FUNCTION public.fulfillment_items_sync();

CREATE OR REPLACE FUNCTION public.fulfillment_status_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_fulfillment_status(NEW.order_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events (tenant_id, order_id, kind, message, data, created_by)
    VALUES (NEW.tenant_id, NEW.order_id, 'fulfillment_created',
            COALESCE(NEW.carrier, 'Envio') || COALESCE(' · ' || NEW.tracking_code, ''),
            jsonb_build_object('fulfillment_id', NEW.id, 'status', NEW.status), auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events (tenant_id, order_id, kind, message, data, created_by)
    VALUES (NEW.tenant_id, NEW.order_id, NEW.status,
            COALESCE(NEW.carrier, 'Envio') || COALESCE(' · ' || NEW.tracking_code, ''),
            jsonb_build_object('fulfillment_id', NEW.id, 'from', OLD.status, 'to', NEW.status), auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fulfillments_sync ON public.fulfillments;
CREATE TRIGGER fulfillments_sync
  AFTER INSERT OR UPDATE ON public.fulfillments
  FOR EACH ROW EXECUTE FUNCTION public.fulfillment_status_sync();

-- Payment transitions land on the same timeline, so one query tells the whole
-- story of an order instead of two half-stories.
CREATE OR REPLACE FUNCTION public.shop_order_financial_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.financial_status IS DISTINCT FROM OLD.financial_status
     AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = NEW.id) THEN
    INSERT INTO public.order_events (tenant_id, order_id, kind, message, data, created_by)
    VALUES (NEW.tenant_id, NEW.id, NEW.financial_status, NULL,
            jsonb_build_object('from', OLD.financial_status, 'to', NEW.financial_status,
                               'total', NEW.total, 'method', NEW.payment_method_kind),
            auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plg_shop_orders_financial_event ON public.plg_shop_orders;
CREATE TRIGGER plg_shop_orders_financial_event
  AFTER UPDATE OF financial_status ON public.plg_shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.shop_order_financial_event();

-- ----------------------------------------------------------------------------
-- RLS — operational data: tenant members only. A buyer's own tracking is served
-- through the order capability RPC, not by granting table access.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fulfillments','order_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_member_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids())) WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))',
      t || '_member_all', t);
  END LOOP;
END $$;

-- fulfillment_items has no tenant_id of its own; it is reached through its
-- shipment, so the policy joins rather than duplicating the column.
ALTER TABLE public.fulfillment_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fulfillment_items_member_all ON public.fulfillment_items;
CREATE POLICY fulfillment_items_member_all ON public.fulfillment_items
  FOR ALL TO authenticated
  USING (fulfillment_id IN (
    SELECT id FROM public.fulfillments WHERE tenant_id IN (SELECT public.user_tenant_ids())))
  WITH CHECK (fulfillment_id IN (
    SELECT id FROM public.fulfillments WHERE tenant_id IN (SELECT public.user_tenant_ids())));

GRANT ALL ON public.fulfillments, public.fulfillment_items, public.order_events
  TO authenticated, service_role;
