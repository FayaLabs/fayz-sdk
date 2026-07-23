-- plugin-agenda 013: one booking read model — v_appointments.
--
-- Three views described the same 34 rows:
--
--   v_bookings                 → thin alias over the legacy view (002 compat shim)
--   v_bookings_legacy_beauty   → the pre-pools shape, still feeding 5 rep_* views
--   v_appointments             → the canonical name, and the only one the SDK reads
--
-- The school pool already had only v_appointments; the salon pool carried all
-- three. Same data, three names, and reports quietly wired to the oldest one.
--
-- v_appointments was a strict SUBSET, so it could not simply absorb them. It
-- gains the 7 columns it lacked — most importantly `services`, the order_items
-- aggregate that 4 of the 5 reports depend on. That also retires a documented
-- N+1: getBookingById fetches order_items in a second round-trip precisely
-- because this view had no line items (see plugin-agenda/src/data/supabase.ts).
--
-- Deliberately NOT copied from the legacy view:
--   • total_duration_minutes — legacy sums order_items durations, the canonical
--     measures the slot. They disagree, no report reads it, and the SDK relies
--     on the canonical meaning. Kept as-is.
--   • client_name — the canonical COALESCEs with metadata->>'title' so blocks
--     and personal events show a label instead of NULL. Kept as-is (an
--     improvement the legacy shape never had).

-- 1. v_appointments becomes the superset. Columns are APPENDED: CREATE OR
--    REPLACE VIEW cannot reorder or drop, and the SDK selects '*'.
CREATE OR REPLACE VIEW public.v_appointments
WITH (security_invoker = true) AS
 SELECT b.id,
    b.tenant_id,
    b.kind,
    b.starts_at,
    b.ends_at,
    b.status,
    b.notes,
    b.order_id,
    b.location_id,
    b.metadata,
    b.created_at,
    b.updated_at,
    b.party_id AS client_id,
    COALESCE(pc.name, (b.metadata ->> 'title'::text)) AS client_name,
    pc.phone AS client_phone,
    pc.email AS client_email,
    pc.avatar_url AS client_avatar_url,
    b.assignee_id AS professional_id,
    ps.name AS professional_name,
    ps.avatar_url AS professional_avatar_url,
    l.name AS location_name,
    o.total AS order_total,
    o.status AS order_status,
    ((EXTRACT(epoch FROM (COALESCE(b.ends_at, b.starts_at) - b.starts_at)))::integer / 60) AS total_duration_minutes,
    -- appended:
    o.reference_number,
    o.status AS stage,
    (o.metadata ->> 'direction'::text) AS direction,
    ( SELECT json_agg(json_build_object('id', oi.id, 'serviceId', oi.service_id,
                                        'name', oi.name, 'durationMinutes', oi.duration_minutes,
                                        'price', oi.unit_price, 'assigneeId', oi.assignee_id)
                      ORDER BY oi.sort_order)
        FROM order_items oi
       WHERE (oi.order_id = b.order_id)) AS services,
    inv.status AS payment_status,
    inv.paid AS order_paid,
    inv.balance AS order_balance
   FROM (((((appointments b
     LEFT JOIN people pc ON ((pc.id = b.party_id)))
     LEFT JOIN people ps ON ((ps.id = b.assignee_id)))
     LEFT JOIN locations l ON ((l.id = b.location_id)))
     LEFT JOIN orders o ON ((o.id = b.order_id)))
     LEFT JOIN v_invoice_balances inv ON ((inv.invoice_id = b.order_id)));

-- 2. Repoint the reports off the legacy view. Bodies are unchanged
--    except for the source relation.

CREATE OR REPLACE VIEW public.rep_appointments_by_period AS
SELECT tenant_id,
    id AS booking_id,
    (starts_at)::date AS date,
    starts_at,
    client_id,
    client_name,
    professional_id,
    professional_name,
    COALESCE(((services -> 0) ->> 'name'::text), ((services -> 0) ->> 'serviceName'::text)) AS service_name,
    status,
    order_total AS revenue,
    created_at,
    updated_at
   FROM v_appointments b;

CREATE OR REPLACE VIEW public.rep_confirmation_queue AS
SELECT b.tenant_id,
    b.id AS booking_id,
    (b.starts_at)::date AS date,
    b.starts_at,
    b.client_id,
    b.client_name,
    b.professional_id,
    b.professional_name,
    COALESCE(((b.services -> 0) ->> 'name'::text), ((b.services -> 0) ->> 'serviceName'::text)) AS service_name,
    COALESCE(a.confirmation_status, 'pending'::text) AS confirmation_status,
    a.confirmation_channel,
    a.confirmation_sent_at,
    a.confirmed_at,
    b.created_at,
    b.updated_at
   FROM (v_appointments b
     LEFT JOIN legacy_pre_pools.appointments a ON ((a.booking_id = b.id)))
  WHERE ((b.status <> ALL (ARRAY['cancelled'::text, 'no_show'::text])) AND (b.starts_at >= (now() - '1 day'::interval)));

CREATE OR REPLACE VIEW public.rep_new_clients AS
SELECT c.tenant_id,
    c.id AS client_id,
    (c.created_at)::date AS date,
    c.name AS client_name,
    c.origin,
    first_booking.service_name AS first_service,
    c.created_at,
    c.updated_at
   FROM (v_clients c
     LEFT JOIN LATERAL ( SELECT COALESCE(((b.services -> 0) ->> 'name'::text), ((b.services -> 0) ->> 'serviceName'::text)) AS service_name
           FROM v_appointments b
          WHERE (b.client_id = c.id)
          ORDER BY b.starts_at
         LIMIT 1) first_booking ON (true));

CREATE OR REPLACE VIEW public.rep_revenue_by_professional AS
SELECT tenant_id,
    (starts_at)::date AS date,
    professional_id,
    COALESCE(professional_name, 'Sem profissional'::text) AS professional_name,
    (count(*))::integer AS appointment_count,
    (COALESCE(sum(NULLIF(order_total, (0)::numeric)), (0)::numeric))::numeric(14,2) AS total_revenue,
    (COALESCE(avg(NULLIF(order_total, (0)::numeric)), (0)::numeric))::numeric(14,2) AS avg_ticket,
    (0)::numeric(14,2) AS commission,
    max(updated_at) AS updated_at
   FROM v_appointments b
  WHERE (status <> ALL (ARRAY['cancelled'::text, 'no_show'::text]))
  GROUP BY tenant_id, ((starts_at)::date), professional_id, COALESCE(professional_name, 'Sem profissional'::text);

CREATE OR REPLACE VIEW public.rep_revenue_by_service AS
SELECT b.tenant_id,
    (b.starts_at)::date AS date,
    NULLIF((service_item.value ->> 'serviceId'::text), ''::text) AS service_id,
    COALESCE((service_item.value ->> 'name'::text), (service_item.value ->> 'serviceName'::text), 'Sem servico'::text) AS service_name,
    (count(DISTINCT b.id))::integer AS quantity,
    (COALESCE(sum((NULLIF((service_item.value ->> 'price'::text), ''::text))::numeric), (0)::numeric))::numeric(14,2) AS total_revenue,
    (COALESCE(avg((NULLIF((service_item.value ->> 'price'::text), ''::text))::numeric), (0)::numeric))::numeric(14,2) AS avg_ticket,
    max(b.updated_at) AS updated_at
   FROM (v_appointments b
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((b.services)::jsonb, '[]'::jsonb)) service_item(value))
  WHERE (b.status <> ALL (ARRAY['cancelled'::text, 'no_show'::text]))
  GROUP BY b.tenant_id, ((b.starts_at)::date), NULLIF((service_item.value ->> 'serviceId'::text), ''::text), COALESCE((service_item.value ->> 'name'::text), (service_item.value ->> 'serviceName'::text), 'Sem servico'::text);

-- 3. Retire the duplicates. v_bookings goes first: it reads the legacy view.
--    Nothing in the SDK references either name (checked: only migrations and a
--    README mention v_bookings).
DROP VIEW IF EXISTS public.v_bookings;
DROP VIEW IF EXISTS public.v_bookings_legacy_beauty;
