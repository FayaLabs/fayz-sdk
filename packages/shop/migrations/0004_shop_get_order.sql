-- ============================================================================
-- 0004 — shop_get_order: anon-readable order confirmation by uuid capability.
--
-- Guest storefront checkouts have no auth session, and 0002's RLS (correctly)
-- hides plg_shop_orders from anon. The order uuid — returned only to the buyer by
-- shop_place_order — acts as the read capability: whoever holds it may read
-- THAT order (whitelisted columns + items), nothing else. Same pattern as
-- e-commerce "order status" links.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.shop_get_order(p_order_id uuid)
RETURNS jsonb
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
  WHERE o.id = p_order_id;
$$;

REVOKE ALL ON FUNCTION public.shop_get_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_get_order(uuid) TO anon, authenticated, service_role;
