-- 0000_plg_rename.sql — rename legacy shop_ tables to plg_shop_
-- for pools provisioned before the industry-pool rename. Guarded: fires only when
-- legacy name exists and target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.shop_categories') IS NOT NULL AND to_regclass('public.plg_shop_categories') IS NULL THEN
    ALTER TABLE public.shop_categories RENAME TO plg_shop_categories;
  END IF;
  IF to_regclass('public.shop_products') IS NOT NULL AND to_regclass('public.plg_shop_products') IS NULL THEN
    ALTER TABLE public.shop_products RENAME TO plg_shop_products;
  END IF;
  IF to_regclass('public.shop_product_images') IS NOT NULL AND to_regclass('public.plg_shop_product_images') IS NULL THEN
    ALTER TABLE public.shop_product_images RENAME TO plg_shop_product_images;
  END IF;
  IF to_regclass('public.shop_customers') IS NOT NULL AND to_regclass('public.plg_shop_customers') IS NULL THEN
    ALTER TABLE public.shop_customers RENAME TO plg_shop_customers;
  END IF;
  IF to_regclass('public.shop_orders') IS NOT NULL AND to_regclass('public.plg_shop_orders') IS NULL THEN
    ALTER TABLE public.shop_orders RENAME TO plg_shop_orders;
  END IF;
  IF to_regclass('public.shop_order_items') IS NOT NULL AND to_regclass('public.plg_shop_order_items') IS NULL THEN
    ALTER TABLE public.shop_order_items RENAME TO plg_shop_order_items;
  END IF;
  IF to_regclass('public.shop_discounts') IS NOT NULL AND to_regclass('public.plg_shop_discounts') IS NULL THEN
    ALTER TABLE public.shop_discounts RENAME TO plg_shop_discounts;
  END IF;
END $$;
