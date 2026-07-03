-- ============================================================================
-- @fayz-ai/courses — trusted checkout + payment confirmation
-- course_place_order: the ONLY path to create a checkout order. Re-reads the
--   offer price server-side (never trusts the client), computes the platform
--   fee from the creator account, creates a PENDING order, returns its id.
-- course_confirm_payment: called by the Stripe webhook (service_role) after
--   payment succeeds — marks the order paid, enrolls the student, and for a
--   subscription offer opens a subscription row.
-- Enrollment happens ONLY on confirmed payment.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.course_place_order(
  p_tenant_id      uuid,
  p_offer_id       uuid,
  p_customer_email text,
  p_customer_name  text DEFAULT NULL,
  p_payment_method text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer       public.course_offers%ROWTYPE;
  v_fee_bps     integer := 500;
  v_customer_id uuid;
  v_order_id    uuid;
  v_platform    numeric(12,2);
  v_email       text := NULLIF(lower(trim(p_customer_email)), '');
BEGIN
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'course_place_order: email required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_offer FROM public.course_offers
    WHERE id = p_offer_id AND tenant_id = p_tenant_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_place_order: offer % not found', p_offer_id USING ERRCODE = '23503';
  END IF;

  SELECT platform_fee_bps INTO v_fee_bps FROM public.course_creator_accounts WHERE tenant_id = p_tenant_id;
  v_fee_bps := COALESCE(v_fee_bps, 500);
  v_platform := round(v_offer.price * v_fee_bps / 10000.0, 2);

  -- Resolve / create the customer (find-or-create by tenant + email), linking
  -- auth.uid when the shopper is authenticated so their reads are RLS-scoped.
  SELECT id INTO v_customer_id FROM public.course_customers
    WHERE tenant_id = p_tenant_id AND lower(email) = v_email LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.course_customers (tenant_id, name, email, auth_user_id)
    VALUES (p_tenant_id, COALESCE(NULLIF(trim(p_customer_name), ''), v_email), v_email, auth.uid())
    RETURNING id INTO v_customer_id;
  ELSIF auth.uid() IS NOT NULL THEN
    UPDATE public.course_customers SET auth_user_id = auth.uid()
      WHERE id = v_customer_id AND auth_user_id IS NULL;
  END IF;

  INSERT INTO public.course_orders (
    tenant_id, course_id, offer_id, customer_id, customer_name, customer_email,
    currency, total, platform_fee, net_value, payment_method, financial_status
  ) VALUES (
    p_tenant_id, v_offer.course_id, v_offer.id, v_customer_id,
    NULLIF(trim(COALESCE(p_customer_name, '')), ''), v_email,
    v_offer.currency, v_offer.price, v_platform, round(v_offer.price - v_platform, 2),
    p_payment_method, 'pending'
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

-- Guest + authenticated shoppers may create orders only through this function.
GRANT EXECUTE ON FUNCTION public.course_place_order(uuid, uuid, text, text, text)
  TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.course_confirm_payment(
  p_order_id  uuid,
  p_stripe_pi text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.course_orders%ROWTYPE;
  v_offer public.course_offers%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.course_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_confirm_payment: order % not found', p_order_id USING ERRCODE = '23503';
  END IF;
  IF v_order.financial_status = 'paid' THEN
    RETURN; -- idempotent: webhook re-delivery is a no-op
  END IF;

  UPDATE public.course_orders
    SET financial_status = 'paid', stripe_payment_intent_id = COALESCE(p_stripe_pi, stripe_payment_intent_id)
    WHERE id = p_order_id;

  -- Grant access (idempotent thanks to the UNIQUE(course_id, customer_id)).
  IF v_order.customer_id IS NOT NULL THEN
    INSERT INTO public.course_enrollments (tenant_id, course_id, customer_id, status)
    VALUES (v_order.tenant_id, v_order.course_id, v_order.customer_id, 'active')
    ON CONFLICT (course_id, customer_id) DO UPDATE SET status = 'active';
  END IF;

  -- Subscription offer → open a subscription row.
  IF v_order.offer_id IS NOT NULL THEN
    SELECT * INTO v_offer FROM public.course_offers WHERE id = v_order.offer_id;
    IF FOUND AND v_offer.kind = 'subscription' THEN
      INSERT INTO public.course_subscriptions (
        tenant_id, course_id, offer_id, customer_id, customer_name, customer_email,
        currency, net_value, interval, status
      ) VALUES (
        v_order.tenant_id, v_order.course_id, v_order.offer_id, v_order.customer_id,
        v_order.customer_name, v_order.customer_email, v_order.currency, v_order.net_value,
        COALESCE(v_offer.recurring_interval, 'month'), 'active'
      );
    END IF;
  END IF;

  INSERT INTO public.course_payment_events (tenant_id, type, payload)
  VALUES (v_order.tenant_id, 'payment.confirmed',
          jsonb_build_object('order_id', p_order_id, 'stripe_payment_intent_id', p_stripe_pi));
END;
$$;

-- Only the service_role (Stripe webhook) may confirm payments.
REVOKE ALL ON FUNCTION public.course_confirm_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.course_confirm_payment(uuid, text) TO service_role;
