# Reuse & Abstraction Evaluation — 3 Ecommerces on One SDK

Written 2026-06-11, after building three storefronts on `@fayz-ai/storefront`:

| Store | Vertical | Template base | Personalization | Port | E2E |
|---|---|---|---|---|---|
| **Aurora Goods** (shopfront) | lifestyle goods | any of the 4 presets (env-switchable) | preset as-is | 5183 | 26 tests |
| **Tannat** (tannat-store) | wine club | `sertao` | burgundy palette, Cormorant Garamond, own copy/sections, own catalog, climate-shipping tone | 5184 | full journey |
| **PULSE** (pulse-store) | sneakers/street | `volt` | lime-on-black, Archivo Black + Space Grotesk, **pill radius**, **slider hero instead of split**, own catalog | 5185 | full journey |

## The numbers

- **Per-store source code: ~75–110 lines** (App.tsx config + catalog.ts) + copied build configs.
- **Shared engine: ~3,200 lines** in `@fayz-ai/storefront` + `@fayz-ai/shop`/`@fayz-ai/ui`/`@fayz-ai/auth`/`@fayz-ai/core`.
- **Zero components copied between stores.** Every pixel of all three stores renders from shared packages; stores contribute only data (config, catalog, copy).
- Both new stores' full purchase journeys (catalog → filters → cart → coupon → checkout → paid order → my purchases) **passed Playwright on the first run** — the strongest evidence the abstraction holds.

## Where reuse is genuinely cross-use-case (saas ↔ ecommerce)

1. **Auth** — the storefront customer session runs on the *same* `AuthAdapter` contract
   (`@fayz-ai/core`) and the *same* adapters (`createMockAuthAdapter`, `createSupabaseAuthAdapter`
   from `@fayz-ai/auth`) that `createSaasApp` uses for admin login. The storefront adds exactly one
   layer: `establishCustomerSession()` links the auth identity to a `ShopCustomer`. Checkout and
   the account page share that single path.
2. **Commerce data** — one `ShopProvider` contract serves the merchant admin
   (`@fayz-ai/plugin-shop` inside marketplace-saas) AND all customer storefronts. Same orders,
   same tables, mock or Supabase.
3. **Design tokens** — `StorefrontTheme` writes the same CSS custom properties
   (`--primary`, `--background`, `--button-radius`, `--font-family`) that `@fayz-ai/ui`'s preset and
   SaasTheme use. The HSL-triplet convention is identical, so the personalization mental model
   ("change 5 tokens, get a brand") carries across saas and ecommerce.
4. **Infra** — `getSupabaseClientOptional`/`setGlobalSupabaseClient`, `hashRouterAdapter`,
   the source-alias dev pattern, and the testid/e2e conventions are shared by every app type.

## Honest gaps (found while building stores 2–3)

1. **SaasTheme vs StorefrontTheme are parallel types, not one type.** Same convention,
   duplicated concept. Fix: extract a shared `ThemeTokens` base into `@fayz-ai/ui` that both extend.
2. **Build-config skeletons are copy-pasted** (vite.config/tsconfig/tailwind ×4 apps now).
   Drift risk is real — the port is the only intentional difference. Fix: `@fayz-ai/cli create-store`
   scaffold, or a shared `defineStorefrontVite()` helper the configs import.
3. **Storefront sections hand-roll buttons/inputs with tailwind classes instead of using
   `@fayz-ai/ui` Button/Input.** Justified short-term (admin primitives carry admin styling), but the
   right end state is variant support in the primitives themselves.
4. **Mock auth adapter's `signIn()` ignores the email** (always logs in the configured user);
   the storefront works around it by using `signUp()` for passwordless identity. Fix in
   `@fayz-ai/auth`: identity-bearing mock sign-in.
5. **localStorage keys are origin-global** (`fayz.shop.mock.orders.v1` etc.). Two stores on the
   same domain would share mock orders and carts. Fine across dev ports; needs a per-store
   namespace (from `config.name`) before hosting multiple stores on one origin.
6. **Checkout shipping address is serialized into `order.notes`** — `Order` has no address
   fields. Acceptable for templates; schema debt for real fulfillment.
7. **Catalogs are mock-only personalization.** A real store on Supabase seeds `shop_*` tables;
   `buildMockCatalog` output is intentionally shaped so it can become that seed script.

## Verdict

The reuse is structural, not cosmetic: data contracts (`ShopProvider`, `AuthAdapter`), token
system, routing, stores, sections and e2e selectors are all single-sourced. Adding a store costs
~100 lines of declarative config and inherits the entire purchase pipeline tested end-to-end.
The gaps above are consolidation work (one theme base, one scaffold, primitive variants) —
none of them require re-architecting.
