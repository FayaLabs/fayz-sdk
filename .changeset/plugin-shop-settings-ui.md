---
"@fayz-ai/plugin-shop": patch
---

Replace the near-empty shop settings stub with a real config UI (ShopSettings): Store (currency, locale), Catalog (show out-of-stock, track inventory, require SKU), Checkout (guest checkout, discount codes) and Notifications groups — using SettingsGroup/ToggleRow/SelectRow. Fixes the blank `settings/shop` page.
