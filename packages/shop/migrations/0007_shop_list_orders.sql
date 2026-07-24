-- ============================================================================
-- 0007 — shop_list_orders: anon-readable order history by customer-id capability.
--
-- Guest storefront checkouts have no auth session, and 0002's RLS (correctly)
-- restricts plg_shop_orders reads to `authenticated` users linked via
-- plg_shop_customers.auth_user_id. The customer uuid — returned once to the
-- browser by shop_resolve_customer and persisted client-side — acts as the read
-- capability: whoever holds it may list THAT customer's orders, nothing else.
-- Same contract as shop_get_order's order-uuid-as-capability pattern.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.shop_list_orders(p_customer_id uuid, p_limit int DEFAULT 50)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(o.*) || jsonb_build_object(
    'items',
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(i.*) ORDER BY i.created_at)
       FROM public.plg_shop_order_items i
       WHERE i.order_id = o.id),
      '[]'::jsonb
    )
  )
  FROM public.plg_shop_orders o
  WHERE o.customer_id = p_customer_id
  ORDER BY o.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.shop_list_orders(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_list_orders(uuid, int) TO anon, authenticated, service_role;
