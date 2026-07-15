-- Mock/dev payment seam: the storefront's mock Pix flow marks the order paid
-- from the client. Anon rightly has no UPDATE grant on plg_shop_orders (011
-- hardening), so expose a narrow RPC instead: the order uuid is the
-- capability (same contract as shop_get_order) and only the
-- pending->paid transition of an open order is allowed.
-- Production PSPs must NOT use this — real confirmation arrives via webhook
-- with service_role (see course_confirm_payment for the shape).

CREATE OR REPLACE FUNCTION public.shop_confirm_payment(
  p_order_id uuid,
  p_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order jsonb;
BEGIN
  UPDATE public.plg_shop_orders
  SET financial_status = 'paid',
      metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object('paymentConfirmedAt', now(), 'paymentReference', p_reference, 'paymentSeam', 'mock')
  WHERE id = p_order_id
    AND status = 'open'
    AND financial_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found or not pending' USING ERRCODE = 'P0002';
  END IF;

  SELECT to_jsonb(o) INTO v_order FROM public.plg_shop_orders o WHERE o.id = p_order_id;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.shop_confirm_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_confirm_payment(uuid, text) TO anon, authenticated, service_role;
