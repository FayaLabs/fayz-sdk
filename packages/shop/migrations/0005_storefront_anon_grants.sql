-- 009_anon_hardening revokes anon SELECT on ALL tables; 0002 creates the anon
-- catalog RLS policies but never re-grants the table privilege, so storefronts
-- get "permission denied for table plg_shop_products" (found live on the
-- ecommerce pool via artorious). RLS still scopes anon to the ACTIVE catalog —
-- the grant is the missing outer layer. authenticated included for fresh pools
-- where plg_ tables are born after 008's blanket grant.

GRANT SELECT ON public.plg_shop_products, public.plg_shop_product_images, public.plg_shop_categories
  TO anon, authenticated;

GRANT ALL ON public.plg_shop_products, public.plg_shop_product_images, public.plg_shop_categories,
  public.plg_shop_customers, public.plg_shop_orders, public.plg_shop_order_items, public.plg_shop_discounts
  TO authenticated, service_role;
