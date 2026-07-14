// Physical table names for @fayz-ai/shop. Renamed to the plg_shop_* industry-pool
// prefix (was shop_*) when the core DB moved into the public schema. RPC function
// names (shop_place_order, shop_get_order, shop_resolve_customer) are unchanged.
export const T = {
  products: 'plg_shop_products',
  productImages: 'plg_shop_product_images',
  categories: 'plg_shop_categories',
  orders: 'plg_shop_orders',
  orderItems: 'plg_shop_order_items',
  customers: 'plg_shop_customers',
  discounts: 'plg_shop_discounts',
} as const
