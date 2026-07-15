-- plg_shop_orders has no metadata column (0006 assumed one and the RPC failed
-- at runtime with 42703). Re-emit shop_confirm_payment stamping the payment
-- reference into notes-free schema: keep the transition guard only. 0006 is
-- ledgered, so the correction ships as a new file (CREATE OR REPLACE).

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
  SET financial_status = 'paid'
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
