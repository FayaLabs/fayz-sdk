# 17 — Progress Log

## 2026-06-15 01:31 UTC / 22:31 BRT — Resto generated-app provider leak closed

Resultado:

- `resto-saas` no longer fails the generated-app contract gate for direct Supabase runtime usage.
- Removed the orphan legacy `src/pages/Orders.tsx` page; `/orders` is already owned by `createRestoOrdersPlugin()`.
- Removed the unused generated Supabase runtime client; only type metadata remains for now as a migration warning.

Impacto:

- The Chef now demonstrates the intended seam: app-owned config registers a reusable private Orders engine instead of copying order business logic into a generated app page.
- This is a better proof than adding more restaurant screens because it validates the SDK/plugin boundary Fayz Agents must learn.

Risco:

- `resto-saas` still warns about the remaining `src/integrations/supabase` types folder. That is a cleanup signal, not a current gate blocker.

Proximo:

- Convert the remaining warning into an objective gate by deciding whether Supabase type metadata should move behind SDK-owned shared types.
- Continue the 1-4 route: objective dogfood status, SDK/app contract, agent guide, and generated-app gates before broad Fayz Agent integration.

Verification:

```bash
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/resto-saas
cd /Users/fayalabs/dev/fayz-app/resto-saas && npm run typecheck
cd /Users/fayalabs/dev/fayz-app/resto-saas && npm run build
```

## 2026-06-15 01:22 UTC / 22:22 BRT — Agent-safe generated app contract gate

Resultado:

- Added `pnpm check:generated-app <path>` as a reusable generated-app contract gate.
- Updated `docs/agent-guide.md` with the current operating contract for Fayz Agents:
  app-owned files first, SDK primitives second, override rather than fork, escalate repeated platform logic into SDK/internal packages, and gate every generated-app edit.
- Locked the next dogfood set as Beauty/BeautyPlace refactor, commerce shops, restaurant/The Chef, and marketplace/admin, with product depth allowed only when it clarifies SDK boundaries or reusable primitives.

Impacto:

- This starts moving the work from manual dogfood into an operational standard that Fayz Agents can follow.
- The gate catches the main drift risks before autonomous agents edit generated apps: internal public package deps, legacy package names, GitHub Packages auth, direct provider SDK imports, and browser-side secrets.

Risco:

- Existing dogfood apps may still warn/fail because they intentionally use local aliases or older provider files during migration. Treat those as migration signals, not blockers to the gate itself.

Proximo:

- Run the new gate across Beauty and shop apps, then use failures to define the next SDK/app cleanup slices.
- Continue product dogfood depth in Beauty and shops: Beauty service/client/agenda polish; shops order tracking, product variations, and brand-specific UX without forking storefront mechanics.

Verification:

```bash
pnpm check:public-surface
node --check scripts/check-generated-app-contract.mjs
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/shopfront
```

Calibration:

- `shopfront` passes the generated-app contract gate.
- `beauty-saas` now only keeps Supabase as a type-level compatibility warning through a Fayz-managed client wrapper; it should pass after gate calibration.
- `resto-saas` provider leak was closed in the 01:31 UTC slice; remaining warning is temporary Supabase type metadata.

## 2026-06-15 00:24 UTC / 21:24 BRT — Core high-conversion checkout baseline

Resultado:

- Moved the high-conversion checkout pattern into private `@fayz-ai/storefront` core instead of keeping it as Aurora-only app code.
- Default `/checkout` now uses focused shell chrome: no storefront header, cart drawer, nav menu, or footer distractions.
- Default checkout now has stepped contact/delivery/payment flow, saved-address selection, saved-card selection, and the existing `placeStorefrontOrder()` primitive.
- `shopfront` removed the custom Aurora checkout override and now inherits the SDK checkout baseline.

Impacto:

- Every storefront can get the conversion-focused checkout by default.
- Generated apps only customize checkout when they have a real differentiated workflow; the baseline is no longer copied per app.
- The route override seam remains available, but checkout optimization graduates into the reusable engine.

Risco:

- Saved addresses/cards are UI/demo primitives right now; production storage should be broker/account-backed before real payments.
- The old broad checkout e2e remains fixture-coupled and should be cleaned separately.

Proximo:

- Add account-backed customer address/payment method contracts behind the Fayz broker.
- Keep custom route overrides for exceptional workflows, not standard checkout behavior.

Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk && pnpm --filter @fayz-ai/storefront typecheck
cd /Users/fayalabs/dev/fayz-sdk && pnpm --filter @fayz-ai/storefront build
cd /Users/fayalabs/dev/fayz-app/shopfront && npm run typecheck
cd /Users/fayalabs/dev/fayz-app/shopfront && npm run build
cd /Users/fayalabs/dev/fayz-app/shopfront && VITE_FAYZ_SHOP_PROVIDER=mock npm run e2e -- e2e/route-overrides.spec.ts
```

## 2026-06-15 00:11 UTC / 21:11 BRT — FAY-1191/1192/1193 route override test gate

Resultado:

- Added focused `shopfront` e2e coverage for the new custom `/checkout` route.
- Added `VITE_FAYZ_SHOP_PROVIDER=mock` test override so the route proof does not create remote Supabase/Fayz shop orders.
- The test confirms the app-owned checkout renders and still completes an order through SDK/storefront primitives.

Impacto:

- The proof is now gated, not only smoke-tested.
- We can keep moving on generator guidance without treating ecommerce as a fixed template project.

Risco:

- The broader legacy checkout e2e remains provider/fixture-coupled and should be cleaned separately.

Proximo:

- Document the generator contract: `src/custom/*` for app-owned screens, `routes` in config, SDK/storefront primitives for workflows.
- Then decide the smallest The Chef/POS pressure test for route/workflow override, not a full vertical build.

Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/shopfront && npm run typecheck
cd /Users/fayalabs/dev/fayz-app/shopfront && npm run build
cd /Users/fayalabs/dev/fayz-app/shopfront && VITE_FAYZ_SHOP_PROVIDER=mock npm run e2e -- e2e/route-overrides.spec.ts
```

## 2026-06-15 00:03 UTC / 21:03 BRT — FAY-1191/1192/1193 storefront route override proof

Resultado:

- Added typed custom route definitions to private `@fayz-ai/storefront`.
- Custom routes match before SDK default pages, so a generated app can replace `/checkout` or add a new route.
- Added `placeStorefrontOrder()` as a checkout primitive so custom screens reuse SDK/storefront order/session/totals logic.
- Updated `shopfront` with app-owned `src/custom/AuroraCheckoutRoute.tsx` and a `/checkout` route override.

Impacto:

- This proves the desired seam: same storefront/shop engine, custom app-owned screen, no copy/paste checkout business logic.
- The app customization surface is editable by agents without touching SDK internals.
- `shop`/`storefront` remain private/internal boundaries; no public npm surface expansion.

Risco:

- Existing `shopfront` checkout e2e is provider/fixture-coupled. Against the Fayz shop provider it creates real order numbers like `#1/#2`; against mock mode it needs fixture/server isolation. Do not use that failure to weaken the route contract.

Proximo:

- Add a focused route-override test that asserts custom `/checkout` renders and `placeStorefrontOrder()` closes an order.
- Document generator guidance: app-owned custom routes live under `src/custom/*`, config wires `routes`, SDK owns primitives.
- Only after that decide whether The Chef needs a custom checkout/POS route proof.

Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk && pnpm --filter @fayz-ai/storefront typecheck
cd /Users/fayalabs/dev/fayz-sdk && pnpm --filter @fayz-ai/storefront build
cd /Users/fayalabs/dev/fayz-app/shopfront && npm run typecheck
cd /Users/fayalabs/dev/fayz-app/shopfront && npm run build
node smoke confirmed http://localhost:5183/#/checkout renders "Compra assistida Aurora" with preloaded cart state
```

## 2026-06-14 23:52 UTC / 20:52 BRT — M75 Resto env-gated Orders provider wiring

Resultado:

- Added `src/config/orders.ts` in Resto.
- Resto now activates `createFayzOrdersProvider()` when `VITE_FAYZ_ORDERS_PROVIDER=fayz` or `sdk`.
- Local dev keeps the mock provider fallback when env is absent.
- Resto build and authenticated `/orders` smoke remain green.

Impacto:

- Orders now matches Menu/Tables in app shape: config/env in app, private plugin owns provider/UI, public SDK owns API transport.
- Resto can switch all three restaurant domains from mock to Fayz SDK-backed data without app code changes.

Risco:

- Real Orders provider activation still needs concrete Fayz project/runtime token and table contract validation.
- Payments, table sessions, delivery channels, and fulfillment events may still need broker-owned semantics beyond raw row CRUD.

Proximo:

- Run a real Orders provider smoke once env/tables are supplied.
- Then move attention back to Beauty provider leaks or shop/storefront dogfood depth.

Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/#/orders
```

## 2026-06-14 23:45 UTC / 20:45 BRT — M74 private Orders provider on SDK data API

Resultado:

- Added `createFayzOrdersProvider()` to private `@fayz-ai/plugin-orders`.
- The provider maps restaurant orders/items to Fayz SDK data reads/mutations over configurable `orders` and `order_items` tables.
- Exposed provider options/types from the private Orders plugin package.
- Plugin Orders typecheck/build passes.
- Resto production build and authenticated `/orders` smoke remain green.

Impacto:

- Orders now follows the same architecture direction as Menu/Tables: plugin owns domain mapping/UI, public SDK owns API transport, app should own only config/env.
- This closes the restaurant trio's biggest reuse gap without expanding public npm surface.

Risco:

- Resto does not activate the Fayz Orders provider yet; it still uses mock fallback until a concrete runtime project/token/table contract is wired.
- Real order production semantics may need dedicated broker logic for payments, table sessions, delivery channels, and fulfillment events.

Proximo:

- Add env-gated `src/config/orders.ts` in Resto once the target order tables/runtime env are confirmed.
- Then test one real order status mutation through the SDK-backed provider.

Verification:

```bash
pnpm --filter @fayz-ai/plugin-orders typecheck
pnpm --filter @fayz-ai/plugin-orders build
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/#/orders
```

## 2026-06-14 23:35 UTC / 20:35 BRT — M73 private Orders plugin extraction consumed by Resto

Resultado:

- Created private `@fayz-ai/plugin-orders` from Resto's app-local Orders implementation.
- Resto now imports `createOrdersPlugin` from `@fayz-ai/plugin-orders`.
- Removed Resto's old `src/plugins/orders` copy to prevent drift.
- Plugin Orders typecheck/build pass.
- Resto build and authenticated `/orders` smoke remain green.

Impacto:

- Resto's restaurant stack is now more reusable: Menu, Tables, and Orders are package-owned private internals instead of app-local plugin copies.
- This moves the app closer to the target shape where the client repo owns config/theme/business rules, not platform plugin mechanics.

Risco:

- Orders still uses mock provider by default. A Fayz SDK-backed Orders provider is the next data-boundary step before production-grade restaurant operations.
- The package remains private/internal; do not publish it as public npm API.

Proximo:

- Add `createFayzOrdersProvider()` or an env-gated `src/config/orders.ts` only after mapping the canonical Fayz order tables/tenant contract.
- Continue Beauty provider leaks or restaurant Orders data provider, whichever is less blocked.

Verification:

```bash
pnpm --filter @fayz-ai/plugin-orders typecheck
pnpm --filter @fayz-ai/plugin-orders build
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/#/orders
```

## 2026-06-14 23:23 UTC / 20:23 BRT — M72 Resto env-gated Menu provider wiring

Resultado:

- Added `src/config/menu.ts` in Resto.
- Resto now activates `createFayzMenuProvider()` when `VITE_FAYZ_MENU_PROVIDER=fayz` or `sdk`.
- Local dev keeps the mock provider fallback when env is absent.
- Resto build and authenticated `/menu` smoke remain green.

Impacto:

- Menu now matches Tables in app shape: config/env in app, private plugin owns provider/UI, public SDK owns API transport.
- Resto can switch Menu from mock to Fayz SDK-backed data without app code changes.

Risco:

- Real provider activation still needs concrete Fayz project/runtime token setup.
- Modifier groups remain a future dedicated table/broker contract.

Proximo:

- Provide/derive runtime env and run real Menu read/write through the SDK-backed provider.
- Then move to Orders provider or Beauty remaining provider leaks.

Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/#/menu
```

## 2026-06-14 23:17 UTC / 20:17 BRT — M71 private Menu provider on SDK data API

Resultado:

- Added `createFayzMenuProvider()` to private `@fayz-ai/plugin-menu`.
- The provider maps menu categories/items to Fayz SDK data access over `categories` and `products`, with menu-specific fields stored in product metadata.
- Exposed provider options/types from the private Menu plugin package.
- Plugin Menu typecheck/build passes.
- Resto production build and authenticated `/menu` smoke remain green.

Impacto:

- Menu now follows the same architecture as Tables: plugin owns domain provider/UI, public SDK owns data transport, app owns only config/env.
- This further reduces the need for app-owned Supabase/fetch code in restaurant apps.

Risco:

- Resto does not activate the Fayz Menu provider yet; it still uses mock fallback until env-gated wiring is added.
- Modifier groups remain intentionally blocked behind a future dedicated table/broker contract.

Proximo:

- Add `src/config/menu.ts` in Resto with env-gated `createFayzMenuProvider()`.
- Then test a real read/write path once runtime env is available.

Verification:

```bash
pnpm --filter @fayz-ai/plugin-menu typecheck
pnpm --filter @fayz-ai/plugin-menu build
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/#/menu
```

## 2026-06-14 23:10 UTC / 20:10 BRT — M70 Resto env-gated Tables provider wiring

Resultado:

- Added `src/config/tables.ts` in Resto.
- Resto now activates `createFayzTablesProvider()` when `VITE_FAYZ_TABLES_PROVIDER=fayz` or `sdk`.
- Local dev keeps the mock provider fallback when env is absent.
- Resto build and authenticated `/tables` smoke remain green.

Impacto:

- Resto is now ready to switch from mock tables to Fayz SDK-backed tables without changing app code.
- This validates the intended app shape: client repo owns config/env, private plugin owns domain UI/provider, public SDK owns API transport.

Risco:

- Real provider activation still needs a concrete Fayz project/runtime token setup.
- Full sessions/zones are still not production-grade; this milestone only prepares table CRUD/status provider activation.

Proximo:

- Provide/derive the runtime env and run one real table status mutation through the SDK-backed provider.
- If that passes, repeat the same pattern for Menu.

Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/#/tables
```

## 2026-06-14 23:08 UTC / 20:08 BRT — M69 private Tables provider on SDK data API

Resultado:

- Added `createFayzTablesProvider()` to private `@fayz-ai/plugin-tables`.
- The provider uses `@fayz-ai/sdk` data reads/mutations for `restaurant_tables`.
- Exposed provider options/types from the private Tables plugin package.
- Plugin Tables typecheck/build passes.
- Resto production build remains green consuming the updated private plugin.

Impacto:

- This is the first domain provider built on top of the public SDK data API, proving the direction beyond UI reuse.
- App code does not need direct Supabase/fetch logic for table CRUD/status once runtime project/token/tenant config is supplied.

Risco:

- Resto still defaults to the mock Tables provider until we wire a concrete runtime project/token/tenant env contract.
- Sessions/zones are intentionally thin: table status persists, but full table sessions need a dedicated table/broker contract before calling it production-grade.

Proximo:

- Wire Resto's Tables plugin to `createFayzTablesProvider()` behind explicit env/runtime config.
- Then smoke real table status mutation in Resto without breaking local fallback.

Verification:

```bash
pnpm --filter @fayz-ai/plugin-tables typecheck
pnpm --filter @fayz-ai/plugin-tables build
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
```

## 2026-06-14 23:01 UTC / 20:01 BRT — M68 public SDK data mutations

Resultado:

- Added `fayz.data.createRow()`, `fayz.data.updateRow()`, and `fayz.data.deleteRows()` to the public `@fayz-ai/sdk` client.
- Added typed options/response exports for row mutations.
- Covered admin/runtime row mutation paths with SDK tests.
- SDK test/build gates pass.

Impacto:

- This closes a key SDK API gap before wiring real providers into Menu/Tables, Beauty, and Marketplace.
- Apps/plugins can now use one Base44-style SDK client for reads and writes instead of owning ad hoc fetch/Supabase mutation code.

Risco:

- This is the transport layer, not yet a domain provider. Menu/Tables still need provider factories that map plugin domain models to Fayz rows.
- Runtime writes still depend on the Fayz API permission/tenant enforcement already defined server-side.

Proximo:

- Build the first private plugin provider on top of these SDK mutations, starting with Resto Tables or Menu.
- Keep public package surface unchanged: this is inside `@fayz-ai/sdk`, not another npm package.

Verification:

```bash
pnpm --filter @fayz-ai/sdk test
pnpm --filter @fayz-ai/sdk build
```

## 2026-06-14 22:59 UTC / 19:59 BRT — M67 Resto Menu/Tables promoted to private SDK plugins

Resultado:

- Promoted Resto's rich Menu and Tables implementations into private `@fayz-ai/plugin-menu` and `@fayz-ai/plugin-tables` packages.
- Returned Resto to package imports for Menu/Tables instead of app-local plugin imports.
- Plugin typecheck/build gates pass for both packages.
- Resto production build and authenticated smoke remain green for `/menu` and `/tables`.

Impacto:

- This is the stronger SDK proof: Resto now gets real restaurant capabilities through reusable internal SDK/plugin packages, not copied local app code.
- The public npm surface remains unchanged. `@fayz-ai/sdk` stays the only public required package; Menu/Tables are private implementation packages for dogfood.

Risco:

- Menu/Tables are now reusable but still mock-provider based. The next 9/10 gap is connecting their provider boundary to `@fayz-ai/sdk`/Fayz broker data instead of stopping at UI reuse.
- These packages should remain private until at least a second restaurant-style app proves the abstraction.

Proximo:

- Dogfood Menu/Tables interactions in Resto and identify the first provider/action slice worth moving behind SDK data access.
- Keep the next milestone focused on app-owner value: less custom app code, more SDK-owned operational surface.

Verification:

```bash
pnpm --filter @fayz-ai/plugin-menu typecheck
pnpm --filter @fayz-ai/plugin-tables typecheck
pnpm --filter @fayz-ai/plugin-menu build
pnpm --filter @fayz-ai/plugin-tables build
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/#/menu and /tables
```

## 2026-06-14 22:50 UTC / 19:50 BRT — M66 Resto Menu/Tables real surfaces

Resultado:

- Switched Resto from internal SDK placeholder Menu/Tables packages to the existing app-local restaurant plugins.
- Resto production build remains green.
- Authenticated smoke confirms `/menu` and `/tables` now render real menu management and floor-plan screens, with no 404 and no placeholder copy.

Impacto:

- Resto moves from route parity to useful app proof: the restaurant vertical now has visible Menu and Tables capabilities instead of empty shell screens.
- This is a better dogfood signal for the SDK strategy: app-local product surfaces can prove real value first, then we decide what deserves promotion into reusable internal SDK/plugin packages.

Risco:

- These rich Menu/Tables plugins are currently local to Resto. Do not treat them as public SDK API yet.
- Next architecture decision is whether to upstream them into private `@fayz-ai/plugin-menu` / `@fayz-ai/plugin-tables` internals or keep them as app-specific custom code until another restaurant app repeats the need.

Proximo:

- Inspect the Resto Menu/Tables UX quality in browser and decide the next 9/10 gap: provider abstraction, actions/mutations, or promoting the reusable plugin layer.
- Keep Beauty, Resto, Marketplace, and the shop/storefront apps running while continuing proof-first dogfood.

Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/#/menu and /tables
```

## 2026-06-14 22:45 UTC / 19:45 BRT — M65 Resto authenticated route smoke

Resultado:

- Ran an authenticated Resto smoke with the mock auth path.
- Confirmed these routes avoid 404/loading traps: `/clients`, `/settings`, `/registry/staff`, `/menu`, `/tables`, `/sales/leads/list`.
- Resto production build remains green.

Impacto:

- Resto route/runtime parity is no longer the immediate risk. The next Resto work should be app quality: replacing placeholder Menu/Tables surfaces with reusable SDK/plugin-backed restaurant capabilities.
- This keeps the dogfood program focused on whether SDK/app-shell abstractions improve real app usefulness, not just whether routes compile.

Risco:

- `/menu` and `/tables` currently render "coming soon" style screens, so Resto is not near 9/10 yet.
- `/sales/leads/list` reaches CRM but shows onboarding until setup is skipped/completed.

Proximo:

- Define the next Resto app-score slice: make Menu/Tables useful through existing plugin surfaces or document the missing SDK/plugin capability if the abstraction is not ready.

Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
Playwright headless authenticated smoke on http://localhost:5181/
```

## 2026-06-14 22:39 UTC / 19:39 BRT — M64 Beauty authenticated route smoke

Resultado:

- Logged into Beauty with the documented test account and verified key routes.
- `/clients` loads with the create button visible.
- Client row click now opens `/clients/:id` without the broken `#//id` hash.
- `/settings` loads the settings shell.
- `/registry/services/new` opens the service create form instead of a placeholder.
- Agenda itself loads; the staff schedule deep link now uses `/registry/staff/:id/schedule`.

Impacto:

- The manifest-first route fix is now proven in an authenticated Beauty session, not only by build/typecheck.
- The remaining agenda staff 404 was narrowed to a bad link source in the Agenda resource header and fixed in the plugin.

Risco:

- The old external URL shape `/staffs/:id/schedule` still 404s. The app should stop generating it; do not treat that legacy path as the canonical contract.
- `/sales/leads/list` does not 404, but CRM currently shows onboarding until setup is skipped/completed.

Proximo:

- Commit the Agenda link fix after gates.
- Continue app-score dogfood with Resto and shop/storefront apps, avoiding another theme-only loop.

Verification:

```bash
pnpm --filter @fayz-ai/plugin-agenda typecheck
pnpm --filter @fayz-ai/plugin-agenda build
cd /Users/fayalabs/dev/fayz-app/beauty-saas && pnpm build
```

## 2026-06-14 22:26 UTC / 19:26 BRT — M63 manifest AdminShell route normalization

Resultado:

- Manifest-first `AdminShell` route collection now registers wildcard subroutes for app pages and plugin routes.
- CRUD hash navigation now normalizes base paths before list/detail/edit/new transitions, preventing broken `#//id` style routes.
- Settings is mounted through the manifest AdminShell path, preserving the app-frame route contract for `/settings`.
- Verified live dev ports for Beauty, Resto, Shopfront, Tannat, Pulse, and Marketplace are responding.

Impacto:

- Beauty/Resto can keep moving away from `createSaasApp` without losing internal plugin routes such as CRM list/detail paths and nested CRUD screens.
- The fix is SDK-level, so generated apps and existing dogfood apps benefit without per-client route patches.

Risco:

- Browser checks without a logged-in Beauty session land on login, so authenticated route QA still needs one pass for `/clients`, `/sales/leads/list`, `/settings`, `/registry/services/new`, and agenda staff schedule.
- The worktree still contains unrelated theme/proof changes; this milestone must be staged narrowly.

Proximo:

- Run authenticated Beauty/Resto route smoke.
- Then resume app-score work: Beauty, Resto, Shopfront/Tannat/Pulse, Marketplace, keeping `shop` and `storefront` as separate internal boundaries.

Verification:

```bash
pnpm --filter @fayz-ai/saas typecheck
pnpm --filter @fayz-ai/plugin-crm typecheck
pnpm --filter @fayz-ai/saas build
cd /Users/fayalabs/dev/fayz-app/beauty-saas && pnpm build
cd /Users/fayalabs/dev/fayz-app/resto-saas && pnpm build
```

## 2026-06-14 20:44 BRT — M62 concrete ecommerce shop-provider template

Resultado:

- Added `src/integrations/ecommerce/shop-provider.ts` to the Fayz ecommerce integration template.
- The template provider factory delegates to `@fayz-ai/sdk/shop`.
- It reads store env from `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_FAYZ_STORE_ID`.
- Updated the ecommerce integration README and prompt to point at this generated provider file.

Impacto:

- M61 is now partly executable by the generator: generated ecommerce integrations get a concrete SDK-backed provider factory instead of only a written instruction.
- This moves the platform closer to the Base44-style promise: app code configures business/domain values, while SDK owns backend access shape.

Risco:

- The generated file is still a provider factory, not a complete shop/admin app scaffold. It intentionally returns `undefined` when env is incomplete so local generated apps do not crash before store setup.

Gate:

- Passed:
  - `pnpm --filter @wowsome/api build` in Fayz

Next:

- When the generated app includes `createShopPlugin`, wire `createEcommerceShopProvider()` into `createShopPlugin({ provider })` automatically.
- Continue Beauty/Resto/Marketplace QA before broad generator automation.

## 2026-06-14 20:34 BRT — M61 generated shop apps learn provider injection

Resultado:

- Updated Fayz ecommerce scaffold prompt, generated `AGENTS.md`, ecommerce README, and library guidelines.
- Updated the SDK agent guide example for `createShopPlugin`.
- New generated merchant/admin shop apps are now instructed to create the shop provider with `createFayzShopProvider` from `@fayz-ai/sdk/shop` and pass it into `createShopPlugin({ provider })`.

Impacto:

- M60 is no longer just a manual Marketplace dogfood pattern; it is now encoded into the generator guidance used by future apps and agents.
- This keeps the public product surface focused on `@fayz-ai/sdk` while plugins remain reusable internal implementation.

Risco:

- This is guidance/template behavior, not yet a full emitted code scaffold. The dedicated storefront/admin ecommerce scaffold still needs a concrete generated example once the 4-app proof reaches 9/10.

Gate:

- Passed:
  - `pnpm --filter @wowsome/api build` in Fayz

Next:

- Continue dogfood QA on Beauty/Resto/Marketplace before automating this deeper in code generation.
- When generator emits a concrete shop admin example, include `src/config/shop-provider.ts` and `createShopPlugin({ provider })` by default.

## 2026-06-14 20:22 BRT — M60 plugin-shop provider injection

Resultado:

- Added provider injection to `@fayz-ai/plugin-shop`.
- Marketplace now passes `getMarketShopProvider` into `createShopPlugin`.
- The Shop admin page can use the same `@fayz-ai/sdk/shop` provider path as Marketplace dashboard metrics.

Impacto:

- This reduces hidden platform coupling: app-owned config chooses the provider boundary, while the plugin owns the reusable Shop UI/admin behavior.
- It is a stronger proof of the SDK value proposition than a config cleanup alone: the app stops needing to know plugin internals to route shop data correctly.

Risco:

- The plugin still keeps the global provider fallback for compatibility. That is intentional now, but generated apps should prefer explicit SDK provider injection once their store env/broker contract is available.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/plugin-shop typecheck`
  - `pnpm --filter @fayz-ai/plugin-shop build`
  - `pnpm build` in Marketplace
  - Browser smoke on `http://localhost:5186/`
  - Ports `5180`, `5181`, `5183`, `5184`, `5185`, `5186` all returned `200`.

Next:

- Decide whether to continue Marketplace admin hardening or return to Beauty/Resto visible QA gaps.
- Keep the public product API limited to `@fayz-ai/sdk`; plugin/core/runtime remain internal until dogfood proves otherwise.

## 2026-06-14 20:02 BRT — M59 Marketplace dashboard uses SDK shop provider

Resultado:

- Added `src/config/shop-provider.ts` in `marketplace-saas`.
- Marketplace dashboard metrics now call a provider created through `@fayz-ai/sdk/shop` when store Supabase env exists.
- Kept a local fallback to the internal mock provider so the app still runs without a configured store.
- Added `VITE_FAYZ_STORE_ID` to the app env contract and wired TypeScript/Vite aliases for local SDK dogfood.

Impacto:

- This is the first Marketplace proof that app-owned dashboard code can depend on the public SDK boundary instead of directly importing platform internals.
- The app still owns business config and metrics; the data access path starts moving into Fayz SDK, which is the real value proposition for scale.

Risco:

- The current SDK shop provider still talks to the Fayz shop Supabase backend directly with publishable credentials. That is acceptable for storefront/admin dogfood, but final provider authority should move behind Fayz broker routes where writes or sensitive tenant permissions are involved.

Gate:

- Passed:
  - `pnpm build` in Marketplace
  - Browser smoke on `http://localhost:5186/`: Mercado login renders, no 404, no loading stall.

Next:

- Use the same SDK-provider pattern to harden one more Marketplace admin surface or move back to Beauty/Resto gaps if product QA finds visible regressions.
- Keep `shop` and `storefront` separate: backend/domain/API versus customer-facing UI/templates/slots.

## 2026-06-14 19:52 BRT — M58 Marketplace dashboard/config split

Resultado:

- Split `marketplace-saas` dashboard metrics into `src/config/dashboard.ts`.
- Split shared currency config into `src/config/currency.ts`.
- Kept `src/config/app.tsx` as a thinner app assembly file after the M57 manifest migration.

Impacto:

- Marketplace is now closer to the Beauty/Resto app shape: app contract is small, and domain decisions live in focused config files.
- The current shop provider dependency is isolated in one dashboard file, making the next SDK/broker-backed data swap explicit instead of scattered through the app.

Risco:

- Marketplace still reads shop/admin dashboard data through the internal shop provider. This is acceptable for dogfood, but not the final Base44-like API abstraction.

Gate:

- Passed:
  - `pnpm build` in Marketplace
  - Browser smoke on `http://localhost:5186/`: Mercado login renders, no 404, no loading stall.

Next:

- Replace Marketplace dashboard/shop data access with the public `@fayz-ai/sdk` provider path once runtime app/token options are pinned.
- Continue fourth-app hardening before teaching Fayz Agents to operate the SDK.

## 2026-06-14 19:10 BRT — M57 Marketplace manifest-first config

Resultado:

- Migrated `marketplace-saas` from direct `createSaasApp(config)` to `renderApp(defineSaas(config))`.
- Reduced `src/App.tsx` to a tiny manifest render wrapper.
- Moved the app config into `src/config/app.tsx` and changed `organization` to the current `org` contract.

Impacto:

- Marketplace now follows the same repo x SDK contract as Beauty and Resto.
- This makes the fourth app more useful for validating whether generated apps can stay mostly business config + custom source while SDK/runtime own shell behavior.

Risco:

- Config is now in `/src/config`, but still concentrated in one file. A later cleanup should split permissions/dashboard/pages/reports/theme when it creates decision value.
- Marketplace still needs SDK-backed shop/admin data proof before calling it near 9/10.

Gate:

- Passed:
  - `pnpm build` in Marketplace
  - Browser smoke on `http://localhost:5186/`: Mercado login renders, no 404, no loading stall.

Next:

- Split Marketplace config further only where it improves readability.
- Prove Marketplace shop/admin data paths through SDK-owned APIs/adapters.

## 2026-06-14 19:00 BRT — M56 Marketplace fourth-app SDK baseline

Resultado:

- Selected `marketplace-saas` as the fourth dogfood app because it is a distinct SaaS/admin domain and avoids the currently quarantined course/portal work.
- Migrated package/import/Vite/TypeScript/Tailwind wiring from legacy `@fayz/*` and `saas-core` to current local `@fayz-ai/*` SDK packages.
- Kept public dependencies thin: only `@fayz-ai/sdk` is a Fayz public dependency in `package.json`.
- Moved the dev port from `5181` to `5186` to avoid colliding with Resto.
- Updated `package-lock.json`.

Impacto:

- Marketplace moved from non-compiling legacy state to a running baseline for the fourth-app proof.
- This gives us a second SaaS/ecommerce-admin validation target beyond Beauty/Resto and separate from customer-facing storefronts.

Risco:

- Marketplace still uses legacy `createSaasApp` and a large `src/App.tsx`; it is not yet config-folder/manifest-first.
- The current result is a baseline unlock, not a 9/10 app quality claim.

Gate:

- Passed:
  - `pnpm build` in Marketplace
  - HTTP 200 on `http://localhost:5186/`
  - Browser smoke renders Mercado login without 404 or loading stall.

Next:

- Move Marketplace toward `renderApp(defineSaas(config))` and `/src/config`.
- Prove marketplace shop/admin data access through SDK-owned paths, not direct provider clients.

## 2026-06-14 18:51 BRT — M55 Fayz scaffold learns storefront slot contracts

Resultado:

- Updated Fayz ecommerce integration prompt to require `productCardSlotContract` for custom `ProductCard` slots.
- Updated generated-project `AGENTS.md` with the same rule.
- Updated ecommerce integration README and scaffold library guidelines.

Impacto:

- The generator no longer just knows the package split; it now knows how to preserve storefront QA/agent contracts when apps customize UI.
- This closes the loop from dogfood bug → SDK helper → generated-project guidance.

Risco:

- This is still guidance, not a full dedicated storefront scaffold. The real template should later emit a custom-card example using the helper.

Gate:

- Passed:
  - `pnpm --filter @wowsome/api build`

Next:

- Continue fourth-app dogfood and then create the dedicated storefront scaffold once the app shape is 9/10.

## 2026-06-14 18:43 BRT — M54 SDK-owned storefront slot contract helper

Resultado:

- Added `productCardSlotContract` and `storefrontSlotContracts` to `@fayz-ai/storefront`.
- Updated the default storefront `ProductCard` to use the exported contract.
- Documented the custom-slot rule in the SDK agent guide.
- Updated Tannat and Pulse custom product cards to dogfood the helper instead of hard-coding selector strings.

Impacto:

- The contract is no longer tribal knowledge from the last bug; it is now an SDK-owned API that generated/custom apps can copy safely.
- This keeps the scale model intact: app teams can deeply customize product cards without breaking cart, checkout smoke tests, QA, or future Fayz agents.

Risco:

- This only covers the first proven slot: `ProductCard`. New slot contracts should be added only when dogfood proves a real customization need.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/storefront typecheck`
  - `pnpm --filter @fayz-ai/storefront build`
  - `pnpm build` in Tannat
  - `pnpm build` in Pulse

Next:

- Encode `productCardSlotContract` into the generated storefront template when the dedicated storefront scaffold is created.
- Continue fourth-app dogfood before Fayz Agents SDK operation.

## 2026-06-14 18:31 BRT — M53 Storefront custom slot contract preservation

Resultado:

- Added the storefront `ProductCard` automation contract back into Tannat and Pulse custom product-card slots.
- Preserved each store's visual customization while restoring `product-card`, `product-card-name`, `product-card-price`, and `product-card-add` test IDs.
- Re-ran focused builds for Tannat and Pulse.
- Re-ran browser smoke across Shopfront, Tannat, and Pulse.

Impacto:

- Confirms the storefront direction is scalable: stores can customize components without forking shared catalog/checkout/account mechanics or breaking QA/agent operation.
- Turns the previous failure into a platform rule: custom slots must keep the SDK/storefront contract, not just render visually.

Risco:

- Shopfront home is editorial and does not expose product-card test IDs, but its `/catalog` route does. That is acceptable if the contract is required on commerce surfaces, not on free-form landing sections.
- The next generator/template pass should encode this contract so future generated custom slots inherit it automatically.

Gate:

- Passed:
  - `pnpm build` in Tannat
  - `pnpm build` in Pulse
  - HTTP 200 on Shopfront `5183`, Tannat `5184`, Pulse `5185`
  - Browser smoke: Tannat/Pulse add-to-cart opens cart; Shopfront/Tannat/Pulse checkout and account routes avoid 404; Shopfront `/catalog` exposes 16 product cards/add buttons.

Next:

- Add a storefront slot-contract note/helper in SDK docs/templates.
- Continue fourth-app dogfood before Fayz Agents SDK operation.

## 2026-06-14 18:19 BRT — M52 Fayz ecommerce scaffold cleanup

Resultado:

- Updated the Fayz generated-project ecommerce integration prompt to use the corrected package split.
- Removed stale `@fayz/shop-core` from the ecommerce integration dependency manifest.
- Removed generated app-owned ecommerce client/types, layout/header/footer, and cart hook from the ecommerce scaffold template.
- Left a generated README explaining that ecommerce data goes through `@fayz-ai/sdk/shop`, storefront UI through `@fayz-ai/storefront`, and mock/seed catalog helpers through `@fayz-ai/shop/catalog`.

Impacto:

- New generated ecommerce apps should no longer start with a duplicated local shop implementation.
- This moves the generator closer to the PoC goal: app repos own business config/customization, while SDK/platform own the complex shop/storefront mechanics.

Risco:

- The template still needs a full dedicated storefront scaffold once the 4-app dogfood reaches 9/10. This cleanup prevents the wrong old path, but does not generate a polished store app by itself.

Gate:

- Passed:
  - `pnpm --filter @wowsome/api build`

Next:

- Add a real storefront-specific scaffold/template after Shopfront, Tannat, Pulse, and one more app prove the final app shape.
- Continue QA of storefront flows and slots before promoting any storefront boundary to public API.

## 2026-06-14 18:09 BRT — M51 Shop/storefront boundary correction

Resultado:

- Restored `@fayz-ai/storefront` as the internal customer-facing store UI/template boundary.
- Kept `@fayz-ai/shop` as the internal domain/provider/catalog/backend primitive boundary.
- Kept `@fayz-ai/sdk/shop` as the public SDK-backed data access path.
- Updated Shopfront, Tannat, and Pulse to import `defineStorefront`, templates, components, and `StorefrontConfig` from `@fayz-ai/storefront`.
- Kept mock catalog helpers on `@fayz-ai/shop/catalog`.
- Restored Tailwind scans for store UI to `packages/storefront/src`.

Impacto:

- Corrects the architecture vocabulary before it hardens into generated apps.
- Avoids a confusing “shop does everything” package while still keeping public npm surface limited to `@fayz-ai/sdk`.
- Better matches the product model: shop is API/domain; storefront is the store front-end.

Risco:

- App templates/generator still need to centralize this wiring so aliases and Tailwind scans are not manually copied per app.
- The earlier M50 guidance cleanup is superseded by this correction.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/shop typecheck`
  - `pnpm --filter @fayz-ai/shop build`
  - `pnpm --filter @fayz-ai/storefront typecheck`
  - `pnpm --filter @fayz-ai/storefront build`
  - `pnpm --filter @fayz-ai/app-runtime typecheck`
  - `pnpm build` in Shopfront
  - `pnpm build` in Tannat
  - `pnpm build` in Pulse

Next:

- Update generated-project templates to emit the same split: public `@fayz-ai/sdk`, local/internal `@fayz-ai/storefront` for UI, `@fayz-ai/shop/catalog` only for explicit mock catalog helpers.
- Restart shop dev servers so Vite picks up restored storefront aliases.

## 2026-06-14 18:00 BRT — M50 Shop scaffold guidance cleanup

Superseded by M51: the better architecture keeps `storefront` as the customer-facing UI boundary and `shop` as the backend/domain boundary.

Resultado:

- Updated the agent/scaffold guide from the removed `@fayz-ai/storefront` package to the current internal `@fayz-ai/shop` storefront path.
- Replaced the stale Tailwind content guidance from `packages/storefront` to `packages/shop`.
- Removed the deleted `@fayz-ai/storefront` package from the Changesets linked package list.

Impacto:

- Reduces the chance that the next shop scaffold or agent-created app repeats the CSS purge bug that broke Shopfront, Tannat, and Pulse.
- Keeps the public package decision clear: `@fayz-ai/sdk` remains the only required public package; shop remains internal/local until dogfood proves a public boundary.

Risco:

- This fixes the operational guide/release config, not the generator source itself. The generator/template still needs a centralized style-content helper or preset contract.

Gate:

- Passed:
  - no `@fayz-ai/storefront` / `packages/storefront` references remain in `docs/agent-guide.md` or `.changeset/config.json`
  - `pnpm --filter @fayz-ai/shop typecheck`
  - `pnpm --filter @fayz-ai/app-runtime typecheck`

Next:

- Find the actual generated-project template path in Fayz and move Tailwind SDK package scans into a single scaffold-owned convention.
- Continue product QA for the three shops before rating the shop vertical near 9/10.

## 2026-06-14 17:58 BRT — M49 Shop app Tailwind scan repair

Resultado:

- Fixed Shopfront, Tannat, and Pulse Tailwind content paths after the shop package consolidation.
- Replaced stale `../../fayz-sdk/packages/storefront/src/**/*.{ts,tsx}` scans with `../../fayz-sdk/packages/shop/src/**/*.{ts,tsx}` in all three shop apps.
- Rebuilt all three shops successfully and restarted their dev servers on the same ports: Shopfront `5183`, Tannat `5184`, Pulse `5185`.
- Browser measurement confirmed Tannat returned from ~19,000px broken page height to ~4,100px with product cards back to normal grid width.

Impacto:

- The three shop apps are functioning again after the `storefront` -> `shop` refactor.
- This exposed a generator/scaffold requirement: generated apps must not hardcode internal package scan paths manually; SDK/app templates need a central style-content helper or stable preset contract.

Risco:

- Builds are green and layout is materially fixed, but shop visual/product QA still needs a full click-through pass for catalog, product detail, cart, checkout, profile, and mobile.
- Existing dev servers must be restarted after Tailwind config changes; HMR alone is not enough.

Gate:

- Passed:
  - `pnpm build` in Shopfront
  - `pnpm build` in Tannat
  - `pnpm build` in Pulse
  - HTTP 200 on `5183`, `5184`, `5185`

Next:

- Move Tailwind/package-content wiring into scaffold/template logic so this cannot regress when internal package names move again.
- Continue shop QA toward 9/10: catalog filters, product details, cart/checkout, account/profile, mobile, and app-specific slots.

## 2026-06-14 17:47 BRT — M48 Liquid Glass global contrast + modal surface cleanup

Resultado:

- Fixed the remaining dark modal/footer divider issue by moving agenda modal/footer separators to a theme-owned `fayz-glass-divider`.
- Moved booking preview/floating panels closer to the global Liquid Glass surface contract instead of forcing local `border-border`.
- Added field-specific perception tokens (`fieldBackground`, `fieldBorder`, `fieldShadow`) so inputs/search/select surfaces have their own contrast model instead of behaving like low-contrast mini cards.
- Tuned the `liquid_glass` preset: slightly darker app background, stronger card/input contrast, and clearer glass fields.
- After the theme trial, Beauty was returned to `classic_admin`; Liquid Glass remains available in the SDK for future controlled dogfood instead of staying on the primary Beauty proof.
- Confirmed all dogfood ports still respond: Beauty `5180`, Resto `5181`, Shopfront `5183`, Tannat `5184`, Pulse `5185`.

Impacto:

- Liquid Glass is now more SDK-owned and less page/plugin-specific.
- Apps that opt into Liquid Glass should get better field/modal hierarchy without custom per-screen styling, while Beauty keeps the stable classic admin look for the current SaaS proof.
- This reinforces the architecture goal: client apps pick a theme and business config; shared Fayz surfaces implement the style system.

Risco:

- The worktree still contains broad earlier milestones. Package this visual slice carefully; do not broad-commit unrelated shop/storefront/docs changes with it.
- Some old plugin components still use hardcoded `bg-card`, `border`, or `shadow` classes. They should be migrated opportunistically to tokens/classes as they are dogfooded.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/ui typecheck`
  - `pnpm --filter @fayz-ai/saas typecheck`
  - `pnpm --filter @fayz-ai/ui build && pnpm --filter @fayz-ai/saas build`
  - `pnpm build` in Beauty

Next:

- Visually inspect Beauty on classic admin and use a separate app/sandbox for the next Liquid Glass dogfood pass.
- Package the Liquid Glass/theme slice separately from accumulated unrelated work.
- Continue migrating top shared plugin surfaces that still bypass theme tokens.

## 2026-06-14 17:04 BRT — M47 Login/logout parity in new AdminShell

Resultado:

- Fixed `@fayz-ai/auth` sign-out so it never leaves the auth store stuck in loading state after logout.
- Replaced the minimal new AdminShell login with a richer split/centered login that uses the modern `@fayz-ai/auth` context.
- Wired `auth.loginLayout` and `auth.loginLogo` through `renderApp(defineSaas(config))`.
- Restarted Beauty and Resto locally: Beauty `5180`, Resto `5181`.

Impacto:

- Beauty logout should return to login without manual refresh.
- Beauty and Resto can use the intended branded login style again.
- This fixes the runtime, not only Beauty, so every SaaS app on the new path benefits.

Risco:

- Browser MCP could not reach localhost from its isolated context; shell verified both servers with HTTP 200.
- Manual browser validation is still useful for final visual polish.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/auth typecheck && pnpm --filter @fayz-ai/auth build`
  - `pnpm --filter @fayz-ai/saas typecheck && pnpm --filter @fayz-ai/saas build`
  - `pnpm build` in Beauty and Resto

Next:

- User-validates login/logout visually on `http://localhost:5180/` and `http://localhost:5181/`.

## 2026-06-14 17:00 BRT — M46 AdminShell settings/frame parity for Beauty + Resto

Resultado:

- Added first-class `/settings` handling to the new AdminShell path.
- Added plugin settings tabs and org settings tabs to the new AdminShell.
- Gave the new AdminShell the same framed page treatment as the legacy shell so module pages load consistently.
- Migrated Resto from legacy `SaasAppConfig.organization` to `FayzAppConfig.org`.

Impacto:

- Beauty and Resto now dogfood the same `renderApp(defineSaas(config))` contract.
- `/settings` is runtime-owned instead of each app needing a placeholder page.
- Financeiro and other module pages should load through the same shell mechanics across both apps.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/saas typecheck && pnpm --filter @fayz-ai/saas build`
  - `pnpm build` in Beauty and Resto

## 2026-06-14 16:54 BRT — M45 Remove storefront package

Resultado:

- Deleted `packages/storefront`.
- Removed `@fayz-ai/storefront` from app-runtime dependencies/re-exports.
- Removed local `@fayz-ai/storefront` aliases from Shopfront, Pulse, and Tannat.
- Kept shop UI/runtime implementation under `packages/shop`.

Impacto:

- Shop apps now have one app-facing concept: `@fayz-ai/shop`.
- We avoid scaling a confusing public/private package split before the dogfood proves it.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/shop typecheck && pnpm --filter @fayz-ai/shop build`
  - `pnpm --filter @fayz-ai/app-runtime typecheck && pnpm --filter @fayz-ai/app-runtime build`
  - `pnpm --filter @fayz-ai/core typecheck && pnpm --filter @fayz-ai/core build`
  - `pnpm build` in Shopfront, Pulse, and Tannat

## 2026-06-14 17:12 BRT — M44 Shop-only app-facing package surface

Resultado:

- Moved the storefront UI/runtime exports into `@fayz-ai/shop` so shop apps import one concept.
- Updated Shopfront, Pulse, and Tannat to import templates, `defineStorefront`, `StorefrontConfig`, `Price`, `Link`, and custom-card helpers from `@fayz-ai/shop`.
- Converted `@fayz-ai/storefront` into a tiny legacy compatibility wrapper that re-exports `@fayz-ai/shop`.
- Kept `@fayz-ai/sdk/shop` as the Fayz backend adapter path for now.

Impacto:

- Product architecture now matches the SaaS mental model: one vertical package for app code.
- App owners no longer need to understand a separate `storefront` package. They build shops with `@fayz-ai/shop`.
- `storefront` remains only as a migration bridge, not a product/API surface to scale.

Risco:

- This is still an internal/private package boundary. We should not publish `@fayz-ai/shop` publicly yet.
- Next cleanup should physically delete or quarantine the old storefront implementation files once no local references need them.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/shop typecheck && pnpm --filter @fayz-ai/shop build`
  - `pnpm --filter @fayz-ai/storefront typecheck && pnpm --filter @fayz-ai/storefront build`
  - `pnpm build` in Shopfront, Pulse, and Tannat

Next:

- Keep app-facing imports as `@fayz-ai/shop`.
- Later, when Fayz server shop routes exist, expose the backend as `fayz.shop.*` on `@fayz-ai/sdk`.

## 2026-06-14 16:52 BRT — M43 SDK shop naming lock

Resultado:

- Renamed the new public SDK subpath from `@fayz-ai/sdk/commerce` to `@fayz-ai/sdk/shop`.
- Renamed public SDK symbols from `FayzCommerce*` / `createFayzCommerceProvider()` to `FayzShop*` / `createFayzShopProvider()`.
- Renamed manifest backend provider metadata from `fayz-commerce` to `fayz-shop`.
- Updated Shopfront, Pulse, and Tannat app configs from `commerceProvider/commerceBackend` to `shopProvider/shopBackend`.

Impacto:

- Product language is now clearer for app owners: this is the Fayz Shop API, not a generic commerce implementation detail.
- Keeps the public SDK surface easier to explain: `@fayz-ai/sdk/shop` now maps directly to storefront/shop use cases.

Risco:

- No compatibility alias was kept because this API was introduced minutes ago and had not been published as a stable contract. Better to correct early than carry two names.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/sdk typecheck && pnpm --filter @fayz-ai/sdk build`
  - `pnpm --filter @fayz-ai/core typecheck && pnpm --filter @fayz-ai/core build`
  - `pnpm --filter @fayz-ai/storefront typecheck && pnpm --filter @fayz-ai/storefront build`
  - `pnpm build` in Shopfront, Pulse, and Tannat

Next:

- After Fayz has server-side shop routes, graduate the ergonomic API to `fayz.shop.*` on the main client.

## 2026-06-14 16:36 BRT — M42 Tenant-specific shop seed + storefront UX fixes

Resultado:

- Migrated the existing Shopfront, Pulse, and Tannat mock catalogs into the Fayz Shop backend as real tenant-scoped products/images/discounts.
- Assigned separate store IDs:
  - Shopfront/Aurora: `10000000-0000-4000-8000-000000000101`
  - Pulse: `10000000-0000-4000-8000-000000000102`
  - Tannat: `10000000-0000-4000-8000-000000000103`
- Updated local app envs to point each store at its own tenant.
- Added SDK normalization for tenant-owned storefront categories stored in product metadata, because the backend `categories` table is global/RLS-protected.
- Fixed storefront footer department overflow with a compact list + "Ver todos".
- Fixed Tannat product-card hover causing excessive scroll by removing full-card translate hover.

Impacto:

- The shop proof is no longer just mock data with themes. Each store now reads distinct real data through `@fayz-ai/sdk/shop`.
- This validates the target split: Fayz SDK owns backend/API complexity; app repos own brand, theme, content, catalog seed, and business customizations.
- Storefront UX fixes happened in platform/shared code where possible, so future stores benefit automatically.

Risco:

- Public write access allowed seed inserts in this Supabase project. That is useful for PoC, but production admin/seed writes should move to a Fayz broker/service-role path.
- Storefront category metadata is a pragmatic adapter until Fayz Shop has tenant-owned category support or a server-side category API.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/sdk typecheck && pnpm --filter @fayz-ai/sdk build`
  - `pnpm --filter @fayz-ai/storefront typecheck && pnpm --filter @fayz-ai/storefront build`
  - `pnpm build` in Shopfront, Pulse, and Tannat
  - HTTP 200 on Shopfront `5183`, Tannat `5184`, Pulse `5185`
  - Data smoke: each tenant returned its own products and category metadata

Next:

- Package and push SDK + app commits.
- Add a broker/admin seed path backlog item so public client write permissions are not part of the long-term architecture.

## 2026-06-14 16:20 BRT — M41 Fayz Shop SDK adapter + storefront wiring

Resultado:

- Added `@fayz-ai/sdk/shop` as the first normalized Fayz Shop provider for the Fayz-owned shop backend.
- Confirmed the remote shop schema uses tenant-scoped `products`, `orders`, `customers`, and `discounts` tables, plus shared `categories` and product images.
- Wired Shopfront, Pulse, and Tannat to use `createFayzShopProvider()` through local app config with mock fallback.
- Added local SDK aliases and `PUBLIC_*` env loading to those stores so they can dogfood SDK changes without npm publishes.
- Extended manifest/backend metadata to recognize `fayz-shop` without making another public npm package.

Impacto:

- Store apps now configure a `storeId` and consume Fayz Shop through the SDK, instead of owning Supabase/PostgREST details.
- This is the clearest shop answer so far: the SDK removes backend integration complexity while each store keeps brand, catalog, copy, theme, slots, and business-specific config.
- Keeps the public package surface locked to `@fayz-ai/sdk`.

Risco:

- Current local envs point all three stores at the same seeded demo tenant. Create separate tenants/catalog seed data before judging the final multi-store product feel.
- Admin write paths for products/categories/discounts intentionally remain broker/API work, not direct client-side table writes.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/sdk typecheck && pnpm --filter @fayz-ai/sdk build`
  - `pnpm --filter @fayz-ai/core typecheck && pnpm --filter @fayz-ai/core build`
  - `pnpm --filter @fayz-ai/storefront typecheck && pnpm --filter @fayz-ai/storefront build`
  - `pnpm build` in Shopfront, Pulse, and Tannat

Next:

- Restart the local storefront dev servers so Vite picks up the new env files.
- Create/separate tenants for Shopfront, Pulse, and Tannat, then use the SDK provider to prove isolated catalogs/orders/customers.

## 2026-06-14 16:11 BRT — M40 Tannat ProductCard slot dogfood

Resultado:

- Tannat now uses the same `ProductCard` slot extension point proven in Pulse.
- Added a wine/curation-focused product card with category, description, pricing, sale/sold-out state, and add-to-cart behavior.
- No Tannat catalog, checkout, account, cart, routing, or provider pages were copied.

Impacto:

- The same platform slot now works for two very different storefront identities: streetwear drops and wine curation.
- This is stronger evidence that Fayz can serve many storefronts with shared mechanics and client-specific expression.

Risco:

- Still only one slot family is proven. Next slots should be discovered by app pressure, not invented ahead of need.

Gate:

- Passed:
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/tannat-store`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/pulse-store`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/shopfront`
  - HTTP 200 on ports `5180`, `5181`, `5183`, `5184`, `5185`

## 2026-06-14 16:07 BRT — M39 Storefront ProductCard slot dogfood

Resultado:

- Added `StorefrontConfig.slots.ProductCard`.
- Product grids and product rails now render the configured product-card slot when present.
- `defineStorefront(config)` keeps manifests serializable by storing code-level slots in a local runtime registry keyed by manifest id.
- Pulse dogfoods the slot with a custom streetwear/drop product card while retaining shared catalog, filters, cart, checkout, account, routing, and provider runtime.

Impacto:

- This directly addresses the scale concern for thousands of stores: apps can customize visible business experience without forking shared storefront pages.
- The platform still owns the hard parts; the client app owns the brand/product expression.

Risco:

- Only `ProductCard` is proven. Do not add a large slot API spec yet. Add next slots only from real pressure in Shopfront/Tannat/Pulse or a fourth app.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/storefront typecheck && pnpm --filter @fayz-ai/storefront build`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/shopfront`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/pulse-store`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/tannat-store`
  - HTTP 200 on ports `5180`, `5181`, `5183`, `5184`, `5185`

## 2026-06-14 16:03 BRT — M38 Storefront provider leak reduction

Resultado:

- Removed the default storefront behavior that created a Supabase client from `supabaseUrl/supabaseAnonKey`.
- Added narrow internal shop subpaths:
  - `@fayz-ai/shop/runtime`
  - `@fayz-ai/shop/mock`
  - `@fayz-ai/shop/catalog`
- Storefront now resolves shop data as explicit provider > catalog mock > empty mock; Supabase requires an explicit adapter/provider path instead of being auto-wired by storefront.
- Shopfront, Pulse, and Tannat catalogs now import `buildMockCatalog` from `@fayz-ai/shop/catalog`.

Impacto:

- The storefront default path is closer to the product contract Vini asked for: app code defines business config, not provider plumbing.
- Three shop builds no longer emit the Supabase dynamic/static import warning.
- Built JS for the stores dropped from roughly `1.29MB` to roughly `1.07MB`.

Risco:

- `@fayz-ai/shop` still exports Supabase provider for internal/explicit adapters. That is acceptable while the package remains private/internal, but generated apps should keep using narrow subpaths or the public `@fayz-ai/sdk` broker path.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/shop typecheck && pnpm --filter @fayz-ai/shop build`
  - `pnpm --filter @fayz-ai/storefront typecheck && pnpm --filter @fayz-ai/storefront build`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/shopfront`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/pulse-store`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/tannat-store`
  - HTTP 200 on ports `5180`, `5181`, `5183`, `5184`, `5185`

## 2026-06-14 15:55 BRT — M37 Beauty style fix + storefront dogfood cleanup

Resultado:

- Beauty style regression fixed in the new `renderApp(defineSaas(config))` path by applying theme initialization in the shared admin provider stack.
- Apps are running for inspection:
  - Beauty: `http://localhost:5180/`
  - Resto: `http://localhost:5181/`
  - Shopfront: `http://localhost:5183/`
  - Tannat: `http://localhost:5184/`
  - Pulse: `http://localhost:5185/`
- All five ports returned HTTP 200.
- Pulse and Tannat moved closer to the target app shape: tiny `App.tsx`, `/src/config` ownership for app/catalog settings, `@fayz-ai/*` local aliases, and only `@fayz-ai/sdk` as public dependency.

Impacto:

- Confirms the storefront direction: shared platform owns catalog/checkout/profile/header/footer; each store owns business config, theme, catalog, copy, and images.
- Confirms Beauty can continue migrating away from `createSaasApp` without sacrificing brand styling.

Risco:

- Storefront still pulls Supabase internally through platform/auth code during build. That should move behind the SDK/Fayz broker path before rating storefront 9/10.

Gate:

- Passed:
  - `pnpm --filter @fayz-ai/saas typecheck`
  - `pnpm --filter @fayz-ai/saas build`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/beauty-saas`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/pulse-store`
  - `pnpm build` in `/Users/fayalabs/dev/fayz-app/tannat-store`

## 2026-06-14 12:39 BRT — M36 Beauty `FayzAppConfig.org` local migration proof

### Executive outcome

Beauty now builds locally on the new `FayzAppConfig.org` contract instead of the legacy `SaasAppConfig.organization` path.

### Business impact

- This is the strongest proof so far that `renderApp(defineSaas(config))` can become the real app contract.
- The SDK/runtime adapted to Beauty's real needs: rich theme, config-friendly billing plans, chat title, login/OAuth, and nested app navigation.
- We did not reduce Beauty's product config just to fit a narrower SDK abstraction.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/saas typecheck
pnpm --filter @fayz-ai/saas build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Browser smoke also opened Beauty at `http://localhost:5180/` without an initial crash.

### Risk

Beauty is still local-gated and uncommitted because the repo is `ahead 1, behind 2` with broad pre-existing changes. Full parity still needs a visual navigation/settings pass before claiming the legacy shell can be deprecated for production.

### Next

Curate/package the Beauty source-only migration separately, then continue removing provider leaks and pick the fourth dogfood app.

## 2026-06-14 12:30 BRT — M35 new AdminShell page ordering/children parity

### Executive outcome

The new manifest/runtime AdminShell now supports app page ordering and nested navigation, removing another practical blocker to moving Beauty off `createSaasApp`.

### Business impact

- Apps can keep page/subpage structure as business config instead of owning shell code.
- Beauty/Resto-style page configs can survive the new runtime path with less product regression risk.
- This makes the SDK/runtime route more credible for scaling many apps because navigation conventions remain centralized.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/saas typecheck
pnpm --filter @fayz-ai/saas build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Result: all gates passed. Beauty build warning remains the existing chunk/provider warning, not a new blocker.

### Risk

This is not yet the final Beauty migration. The next slice must switch Beauty to `FayzAppConfig.org`, verify navigation/settings visually, and only then claim `createSaasApp` deprecation proof.

### Next

Migrate Beauty off `SaasAppConfig.organization` in a curated slice, then continue provider leak removal.

## 2026-06-14 12:26 BRT — M34 new runtime login/OAuth carry-forward prep

### Executive outcome

The new manifest/runtime path can now carry Beauty's login branding/copy/OAuth intent instead of forcing those fields to stay trapped in `createSaasApp`.

### Business impact

- This removes one real blocker to deprecating `createSaasApp` without lowering app quality.
- Beauty should not be moved to the new runtime by losing login UX; the SDK/runtime must preserve that product surface.
- OAuth adapter calling is now exposed through the shared auth hook, which aligns with the broker direction while keeping provider secrets server-side.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/auth typecheck
pnpm --filter @fayz-ai/auth build
pnpm --filter @fayz-ai/saas typecheck
pnpm --filter @fayz-ai/saas build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Result: all gates passed.

### Risk

Beauty still should not be switched fully off the legacy shell yet. The next blocker is AdminShell parity for nested navigation, page order, and settings affordances that Beauty currently relies on.

### Next

Add that AdminShell parity, then migrate Beauty from `SaasAppConfig.organization` to `FayzAppConfig.org` so `renderApp(defineSaas(config))` stops using the legacy `createSaasApp` path.

## 2026-06-14 12:20 BRT — M33 SDK data API + Beauty dashboard proof

### Executive outcome

`@fayz-ai/sdk` now exposes a first Fayz data API helper, and Beauty uses it for real dashboard agenda data instead of importing Supabase directly.

### Business impact

- This is the clearest current proof that the SDK is solving an actual app-owner problem, not just rearranging imports.
- Beauty dashboard KPI and today's schedule now depend on `fayz.data.countRows/listRows`.
- The Beauty app still owns business-specific dashboard decisions, labels, visual sections, and booking display mapping, while API/data access starts moving into the SDK/platform layer.
- The next SDK value gap is now visible and concrete: CRUD/plugin mutations, typed models, tenant defaults, provider adapters, and richer filters need the same treatment before app repos can fully stop carrying provider clients.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/sdk test
pnpm --filter @fayz-ai/sdk build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Result: all gates passed. Beauty build still reports existing bundle warnings from internal UI/plugin imports; no new blocker.

### Risk

Beauty remains a local-gated broad worktree and is behind origin by 2. Do not broad-commit it without curated staging or a branch packaging decision. The SDK helper is read-only for now; it does not yet replace all app/provider access.

### Next

Package the SDK data helper separately from unrelated release-channel/doc dirt, then continue removing direct provider access from app-owned code and move toward a fourth 9/10 dogfood app.

## 2026-06-14 12:14 BRT — M32 SDK machine-readable release-channel manifest

### Executive outcome

`@fayz-ai/sdk` now publishes a machine-readable `release-channels.json` export, and the typed SDK release-channel helpers derive from that same JSON.

### Business impact

- This turns the SDK package into the single checked-in version-channel source in both typed and machine-readable forms.
- It removes the need for Fayz to parse SDK TypeScript during the final `FAY-1183` scaffold cutover.
- Public package strategy stays unchanged: still one public package, now with a cleaner cross-repo handoff surface.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/sdk typecheck
pnpm --filter @fayz-ai/sdk test
pnpm --filter @fayz-ai/sdk build
```

Result: all three gates passed after adding the JSON export and the alignment test.

### Risk

The last duplication still lives in Fayz because this automation sandbox can read `/Users/fayalabs/dev/fayz` but cannot write there. Channel values also remain checked-in constants for now, which is acceptable until dogfood proof justifies dist-tags or API backing.

### Next

When the Fayz repo is writable, replace its scaffold snapshot/parser path with direct consumption of the SDK `release-channels.json` export.

## 2026-06-14 12:11 BRT — M31 Beauty dashboard/reports extraction

### Executive outcome

Beauty moved materially closer to the Resto/Shopfront app shape: app entry is render-only, `src/config/app.tsx` is now mostly plugin composition, and dashboard/reports live in focused config modules.

### Business impact

- `src/config/app.tsx` is down to roughly 210 lines from the earlier large mixed config surface.
- Beauty now has `src/config/*` modules for billing, dashboard, pages, permissions, reports, and theme.
- This is the highest-value Beauty cleanup so far because it keeps the paid agenda proof stable while making the app easier for humans and agents to operate.
- It exposed the real next SDK problem: Beauty dashboard still needs direct Supabase access for a metric. That should become a Base44-like SDK/API helper rather than app-owned provider client usage.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Result: build passed after dashboard and reports extraction.

### Risk

This is still local-gated, not a packaged Beauty milestone. Beauty is behind origin by 2 and has broad existing changes, so committing without curated staging would mix unrelated work. The direct Supabase import is isolated in `src/config/dashboard.tsx`, but it is not architecturally solved yet.

### Next

Add/expose the `@fayz-ai/sdk` API helper needed to replace Beauty dashboard direct Supabase queries, then continue toward four 9/10 dogfood apps before Fayz Agents SDK operation.

## 2026-06-14 12:05 BRT — M30 Shopfront config-folder/storefront proof

### Executive outcome

Shopfront now follows the same scalable app shape without turning ecommerce into a SaaS clone: `App.tsx` renders only, while store-specific config and catalog data live under `src/config/*`.

### Business impact

- Confirms the pattern works across a different domain: SaaS apps and storefront apps can share shell/layout/navigation/page infrastructure while keeping app-specific source/config explicit.
- Removed direct `@supabase/supabase-js` from the Shopfront app package.
- README no longer points generated app authors toward direct Supabase go-live wiring; live platform data should go through `@fayz-ai/sdk` / Fayz broker.
- Product sequencing updated: do not implement Fayz Agents SDK operation until at least 4 apps in `fayz-app` are near 9/10 and the SDK/plugin concepts have survived real dogfood.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-app/shopfront
npm run build
```

Result: build passed. Shopfront was committed and pushed as `3d88049 refactor: split shopfront config`.

### Risk

The build still reports Supabase through internal SDK/storefront imports. That is no longer a direct app dependency, but it is still a SDK packaging/boundary smell. Provider clients should move behind optional SDK/storefront adapter entrypoints so simple apps do not inherit them.

### Next

Continue the 4-app dogfood bar before Fayz Agents work. SDK backlog: Base44-like API client through `@fayz-ai/sdk`, provider clients optional/adapter-owned, no default generated `integrations/supabase`.

## 2026-06-14 12:00 BRT — M29 Beauty config-folder local slice

### Executive outcome

Beauty now follows the same basic `src/config/*` organization pattern as Resto for permissions, pages, billing, and theme.

### Business impact

- Beauty has clearer app-owned edit surfaces without changing the public package strategy.
- `App.tsx` remains render-only through `renderApp(defineSaas(beautyAppConfig))`.
- This validates that the config-folder pattern transfers from Resto to the higher-value Beauty proof without breaking the build.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Result: build passed after extracting `src/config/permissions.ts`, `src/config/pages.tsx`, `src/config/billing.ts`, and `src/config/theme.ts`.

### Risk

This is a local gated slice, not a packaged Beauty milestone. The Beauty repo is behind origin by 2 and has broad existing changes, so committing now would mix this clean refactor with older unrelated work unless staging is curated.

### Next

Extract Beauty dashboard, then reports/plugins, keeping the paid agenda proof stable. Package only after deciding how to isolate the Beauty worktree.

## 2026-06-14 11:56 BRT — M28 Resto dashboard/reports/theme split

### Executive outcome

Resto now has the clearest app shape so far: `App.tsx` renders only, `registry.tsx` owns custom app widgets, and `src/config/*` owns business/domain configuration.

### Business impact

- The main Resto app config is now composition, not a mixed 400+ line config/code bucket.
- Dashboard metrics/sections, reports, pages, billing, permissions, and theme are separated into focused config modules.
- This confirms the generator should copy a `src/config/` folder pattern, not root-level `.config` clutter and not decorative `.manifest.ts` wrappers.
- Beauty also now builds with theme under `src/config/theme.ts`, but its broader worktree remains intentionally unpackaged.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-app/resto-saas
pnpm build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Result: both builds passed. Resto was committed and pushed as `9ca593b refactor: split resto dashboard and reports config`.

### Risk

Resto still has plugin factories in `src/config/app.tsx`; that is acceptable for now because the largest domain-heavy blocks are out. Beauty is still broad/behind origin, so package its next improvements as narrow slices only.

### Next

Apply the same pattern to Beauty: extract permissions, pages, dashboard, and reports/plugins into `src/config/*`, keeping the paid agenda proof stable.

## 2026-06-14 11:40 BRT — M26 Resto manifest/registry split

### Executive outcome

Superseded by M27/M28. Resto moved one step closer to the scalable app shape: `App.tsx` renders only, `registry.tsx` owns the first custom app widget boundary, and business config now lives under `src/config/*`.

### Business impact

- The repo is easier for agents and humans to operate: app entry, manifest definition, custom registry code, and config are no longer all collapsed into one file.
- This keeps the public package strategy unchanged: only `@fayz-ai/sdk` is public; app-runtime/core/saas/plugins stay internal/local during dogfood.
- The refactor is incremental and gated, so it can continue without destabilizing the restaurant app.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-app/resto-saas
pnpm build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Result: both builds passed after the split. Resto was committed and pushed as `039b844 refactor: split resto manifest and registry`. Later slices removed the temporary decorative `app.manifest.ts`; Beauty stayed on a tiny `App.tsx` because a separate `app.manifest.ts` would currently be a redundant wrapper without registry/serializable-manifest value.

### Risk

Resto still has large plugin configuration blocks. The next useful extraction is dashboard metrics/sections and entity pages into explicit registry/config modules, followed by domain plugins.

### Next

Continue with Resto because it is clean and committable. Add a Beauty `app.manifest` file only when it contains real manifest data or imports real registry-owned code.

## 2026-06-14 11:45 BRT — M25 Beauty/Resto renderApp dogfood bridge

### Executive outcome

Beauty and Resto now use the strategic `renderApp(defineSaas(config))` entrypoint instead of app code calling `createSaasApp`.

### Business impact

- Two real SaaS apps now validate the renderApp contract before generator-heavy work.
- `createSaasApp` can be treated as migration compatibility, not the app-authoring API.
- Resto now has the target app shape: tiny `src/App.tsx` plus `src/app.config.tsx`.
- Beauty keeps behavior stable while moving to the same entrypoint.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/saas typecheck

cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build

cd /Users/fayalabs/dev/fayz-app/resto-saas
pnpm build
```

Result: SDK SaaS typecheck passed, Beauty build passed, and Resto build passed.

### Risk

The SDK bridge still preserves code-backed plugin/page config through the legacy shell internally. This is intentional for dogfood stability, but the next architecture milestone must extract more into serializable `app.manifest` + `registry` so this does not become permanent hidden legacy.

### Next

Use Shopfront as the 9/10 reference shape, then extract Beauty/Resto config toward manifest + registry while keeping `@fayz-ai/sdk` as the only public npm package.

## 2026-06-14 11:34 BRT — M24 SDK-owned release-channel source for CLI

### Executive outcome

The SDK now owns the package release-channel map, and the CLI reads that source instead of maintaining a parallel local copy.

### Business impact

- Version-channel drift inside the SDK repo is reduced: `@fayz-ai/sdk` and `fayz create` now share the same checked-in resolver.
- The public SDK package gains an explicit `release-channels` export that Fayz/API can consume next, which is the cleanest path to finish `FAY-1183`.
- This improves publish safety without widening the public npm surface beyond the already-approved `@fayz-ai/sdk`.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/sdk test
pnpm --filter @fayz-ai/sdk build
pnpm --filter @fayz-ai/cli typecheck
```

Result: SDK tests and build passed with the new release-channel module, and the CLI typecheck passed while importing that SDK-owned source.

### Risk

Fayz scaffold still uses its own checked-in resolver in a separate repo, so the final cross-repo centralization step is still open. Channel values also remain checked-in constants for now rather than npm dist-tags or API-backed data.

### Next

Switch Fayz scaffold to consume the SDK-exported release-channel source, then decide whether `stable/latest/preview` should stay manifest-backed or move behind npm dist-tags/API once Beauty + second-app dogfood proves the boundary.

## 2026-06-14 10:59 BRT — M23 Public surface correction + Beauty tenant dogfood

### Executive outcome

The public package strategy is corrected: `@fayz-ai/sdk` is the only required public npm package for now. App-runtime, plugins, and internal SDK layers stay private/internal until Beauty + 2 more real apps prove a package boundary is worth exposing.

### Business impact

- Public npm surface is simpler and safer: one public product API, not a matrix of premature packages.
- Fayz scaffold and SDK CLI now generate dependency-thin apps with `@fayz-ai/sdk` only; app-runtime is local/platform-bundled during dogfood.
- Beauty can develop against the local SDK via aliases, so SDK/plugin fixes can be tested immediately without publishing npm every time.
- The Beauty client-save failure was traced to tenant context, not npm. The org store now syncs the active org into the core tenant context used by CRUD providers.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/saas typecheck

cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
curl http://localhost:5180/@fs/Users/fayalabs/dev/fayz-sdk/packages/saas/src/org/store.ts
```

Result: Beauty build passes with local SDK aliases, the dev server is serving the active-tenant synchronization fix, and the backend tenant proof passed with the documented test user: sign in, select tenant, create a temporary `CODEx TEST ...` client, then delete it.

### Risk

Manual browser confirmation is still needed after reload for the exact client-save click path because the browser automation environment could not type into the login form. Beauty's worktree is broad and behind origin by 2, so only stage a narrow subset after a packaging decision.

### Next

Stabilize Beauty as the first dogfood app, then manually validate two more Fayz apps before generator-heavy work. Only promote app-runtime to a public package if these dogfoods prove the need.

## 2026-06-14 10:27 BRT — M22 Route correction after package-wave risk

### Executive outcome

The public package-wave direction was superseded. The current route is proof-first: `@fayz-ai/sdk` is the only default public npm package; app-runtime and domain/plugin packages stay private/internal until Beauty plus a second vertical prove stable public seams.

### Business impact

- Keeps Fayz ambitious without becoming a framework/package ecosystem prematurely.
- Generated apps stay understandable and install-thin: `@fayz-ai/sdk`, `react`, `react-dom`, plus explicit app-owned dependencies.
- Beauty remains the first dogfood app, but it validates local/internal app shell and capabilities rather than forcing a public runtime package.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:public-surface
npm view @fayz-ai/sdk version
npm view @fayz-ai/app-runtime version # returns 404/not public
```

Result: public npm currently exposes `@fayz-ai/sdk@0.1.3`; app-runtime/core/auth/ui/shop/saas/storefront are not public packages.

### Risk

Older notes may mention app-runtime/package-wave exploration. Treat them as historical exploration, not current route. Do not publish additional packages or alter generated-app defaults without Beauty + second-vertical proof and explicit approval.

### Next

Dogfood manually before generator-heavy work: Beauty first, then The Chef/ecommerce/POS pressure test. Only after that should the generator copy proven patterns or a new package boundary be considered.

## 2026-06-14 10:11 BRT — M21 Runtime publish safety gate

### Executive outcome

`@fayz-ai/app-runtime` can no longer be published by accident while it still depends on internal non-public packages.

### Business impact

- The safe public package path is now explicit: `@fayz-ai/sdk` passes the new gate, `@fayz-ai/app-runtime` fails fast.
- This prevents a bad npm release from shifting failure into generated-project installs.
- The next package wave is clearer: either publish/rename the runtime dependency chain under `@fayz-ai/*`, or keep runtime out of public install-critical paths.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
node ./scripts/check-public-package-safety.mjs packages/sdk
pnpm --filter @fayz-ai/app-runtime run check:publish-safety
```

Result: SDK passed; runtime was blocked as designed because it still resolves to internal `@fayz-ai/*` workspace packages.

### Risk

This does not centralize the version source yet. Fayz API scaffold and SDK CLI still each keep a local checked-in resolver, so `FAY-1183` remains the next narrow implementation target.

### Next

Move `FAY-1183` from duplicated local maps to one shared channel source, then decide the runtime dependency-chain public package wave.

## 2026-06-14 10:00 BRT — M20 CLI create version resolver bridge

### Executive outcome

`fayz create` now follows the same version-channel pattern as the Fayz API scaffold.

### Business impact

- The SDK CLI no longer keeps SDK/runtime package versions as command-local literals.
- CLI-generated apps and API-generated apps are now aligned around a `stable/latest/preview` resolver shape.
- This lowers drift while the final `FAY-1183` source of truth is designed.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/cli typecheck
```

### Risk

The bridge is still local to each repo. The final version manager should make API scaffold and CLI read the same source, likely via npm dist-tags, Fayz API, a checked-in release manifest, or a combination.

### Next

Commit the CLI bridge, update `FAY-1183`, then return to runtime publish safety.

## 2026-06-14 09:55 BRT — M19 Central SDK version resolver bridge

### Executive outcome

The first version-manager bridge is implemented for generated Fayz projects.

### Business impact

- Fayz scaffold no longer duplicates `@fayz-ai/sdk` / `@fayz-ai/app-runtime` version literals inside scaffold dependency code and tests.
- New generated projects now read Fayz package versions from one checked-in resolver with `stable`, `latest`, and `preview` channels.
- This starts `FAY-1183` without waiting for the heavier npm dist-tag/API-backed version service.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: 12 tests passed.

### Risk

This is the bridge, not the final version manager. Next, share this resolver between Fayz API scaffold and SDK CLI, then decide whether channels are backed by npm dist-tags, Fayz API, a checked-in release manifest, or a combination.

### Next

Commit the narrow Fayz scaffold slice, update `FAY-1183`, then return to runtime publish safety.

## 2026-06-14 08:47 BRT — M18 Public npm + default SDK package lock gated, repo created

### Executive outcome

Vini approved public npm as the Fayz SDK package-source standard, and the first implementation gate passed.

### Business impact

- `@fayz-ai/sdk` becomes the default package for every generated project.
- `@fayz-ai/app-runtime` remains the heavier manifest app-rendering package.
- The old GitHub Packages / `NODE_AUTH_TOKEN` blocker is retired for generated apps.
- Generated projects can now use SDK helpers instead of local runtime OAuth helper forks.
- GitHub repo created and pushed: `https://github.com/FayaLabs/fayz-sdk`

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/sdk typecheck
pnpm --filter @fayz-ai/sdk test
pnpm --filter @fayz-ai/sdk build
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/app-runtime typecheck
pnpm --filter @fayz-ai/app-runtime build
pnpm check:manifest

cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts

cd /Users/fayalabs/dev/fayz-sdk/packages/sdk
npm publish --dry-run --access public
```

### Risk

Keep `@fayz-ai/sdk` focused on API access, app params, runtime broker helpers, and shared types: no React peer dependency, no UI bundle, no Supabase/provider SDK dependency, and no server-side secrets.

`@fayz-ai/sdk@0.1.3` is published with public access. It fixes the package-page quality issue by adding README content plus GitHub repository, homepage, and bug tracker metadata, and removes package copy that made "small" sound like the product value. Clean public install now passes: `npm install @fayz-ai/sdk@0.1.3`.

Fayz generated scaffold should stay dependency-thin. Direct default app dependencies are only `@fayz-ai/sdk`, `react`, and `react-dom`; app-runtime/internal UI/capability code is platform-bundled/local until dogfood proves a public boundary.

`@fayz-ai/app-runtime` was not published in this slice. It still depends on internal packages not yet published under the public npm scope, so publishing it now would create broken generated-project installs.

### Next

Linear tracking updated:

- `FAY-1181` comment `197e46fa-fca0-4b9a-8bae-6e3a5000c5a1`
- `FAY-1182` comment `295f0885-7d2a-414b-95dd-f29e64a9ab70`

Decide the next package wave for runtime dependencies: either publish/rename the full runtime dependency chain under `@fayz-ai/*`, or keep generated apps on `@fayz-ai/sdk` only until runtime is install-safe. Continue Beauty extraction only after package lock is reviewed.

## 2026-06-14 08:25 BRT — M17 createSaasApp deprecation stance hardened

### Executive outcome

The app-contract decision now explicitly treats `createSaasApp` as a **legacy compatibility adapter**, not strategic architecture.

### Business impact

- New generated apps should use `AppManifest + renderApp(manifest)`.
- New templates, docs, and AI generation should not emit `createSaasApp`.
- `createSaasApp` remains only as a temporary bridge for Beauty/resto/current proof apps until extraction succeeds.
- Plugin factories stay inside plugin packages; generated apps reference plugin ids and JSON config.

### Gate

Docs-only milestone. No runtime code changed.

### Risk

The next implementation must avoid a half-migration: either keep Beauty stable on legacy while extracting, or move a narrow vertical slice fully to manifest-first.

### Next

Use Beauty as the golden extraction specimen: tiny `App.tsx`, `app.manifest.json`, and `registry.tsx` for custom code. Add `fayz doctor` warnings and `fayz extract` path after contract approval.

## 2026-06-14 08:20 BRT — M16 App contract and integrations decision brief

### Executive outcome

The repo x SDK contract recommendation is now explicit:

```txt
docs/discovery/26-app-contract-and-integrations-decision.md
```

### Business impact

- Recommended default: generated apps use `AppManifest` plus `renderApp(manifest)`.
- `createSaasApp`, `createFayzApp`, and `create*Plugin` factories stay as compatibility/developer sugar, not the long-term generated-app contract.
- Direct plugin bridges should move toward domain events, declared capabilities, and plugin grants.
- OAuth remains the default for external provider auth, with Fayz-owned broker/grants protecting the open-source SDK boundary.

### Gate

Docs-only milestone. Process check found no stuck test/build jobs; Beauty Vite server remains healthy on `127.0.0.1:5180`.

### Risk

Do not aggressively refactor Beauty's `App.tsx` until Vini approves manifest-first as the official generated-app contract and SDK package destination is confirmed.

### Next

Ask Vini to approve manifest-first as the official generated-app contract. Then use Beauty as the golden extraction specimen: tiny `App.tsx`, `app.manifest.json`, and `registry.tsx` for custom code.

## 2026-06-14 01:00 BRT — Idle-loop self-improvement

### Executive outcome

The autonomous loop was adjusted for the current blocked state.

### Business impact

- We avoid noisy "busy work" while waiting for Vini's decision on provider onboarding or SDK remote/publication.
- Heartbeats still monitor health: git status, process health, and Beauty server availability.
- The next real engineering milestone remains ready to start once the decision is made.

### Gate

Process check found no stuck test/build jobs; Beauty Vite server remains healthy on `127.0.0.1:5180`.

### Risk

No code/product progress should be attempted until the provider onboarding direction or SDK remote is approved.

### Next

Keep heartbeat quiet unless health changes or Vini approves the next direction.

## 2026-06-14 00:51 BRT — M15 Provider onboarding decision brief

### Executive outcome

The provider onboarding blocker is now reduced to a product decision:

```txt
docs/discovery/25-provider-onboarding-decision-brief.md
```

### Business impact

- Recommended direction: Fayz-owned Integrations surface plus inline plugin CTA.
- This keeps Fayz as the trust layer and avoids each plugin/generated app inventing OAuth setup.
- The next engineering slice can be narrow after approval: authenticated list/revoke routes, settings UI, and Panel missing-grant CTA.

### Gate

Docs-only milestone. Process check found no stuck test/build jobs; Beauty Vite server remains healthy on `127.0.0.1:5180`.

### Risk

Do not expose product/admin routes until Vini approves the onboarding surface and permission names.

### Next

Tracking updated in Linear `FAY-1182` comment `fdb6b0b5-3a87-4809-bf7c-0e2f5ec54475`.

Ask Vini to approve option 1 or choose a different onboarding direction.

## 2026-06-14 00:42 BRT — M14 Runtime OAuth helper contract docs

### Executive outcome

The SDK now has an agent-readable contract for safe Plugin OAuth runtime usage:

```txt
docs/discovery/24-runtime-oauth-helper-contract.md
```

### Business impact

- Agents and generated apps have one blessed path for `createFayzRuntimeClient()`.
- The contract says what the SDK may own and what must remain server-side in Fayz.
- This reduces the chance of future agents inventing OAuth clients, direct Google Calendar calls, or token storage in browser/generated code.

### Gate

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
```

Result: passed. Known non-blocking noise: `.npmrc` warns about missing `${NODE_AUTH_TOKEN}`.

### Risk

Docs only. The SDK repo still has no remote configured, so the packaged helper cannot be pushed/published yet.

### Next

Tracking updated in Linear `FAY-1182` comment `49a2fd2d-9978-4747-a4b4-308e5557b03f`.

Next wait for SDK remote/package-source decision or provider onboarding UX decision.

## 2026-06-14 00:35 BRT — M13 Packaged SDK runtime OAuth helper committed locally

### Executive outcome

The generated-app helper now has a real SDK home:

```txt
fdb2d22 feat(core): add runtime oauth broker helper
```

### Business impact

- `@fayz-ai/core` now exports `createFayzRuntimeClient()` and typed Plugin OAuth / Google Calendar broker helpers.
- `@fayz-ai/core/runtime` is a stable subpath for direct imports.
- `@fayz-ai/app-runtime` receives the helper through the umbrella re-export, so generated apps can eventually import from the real SDK instead of carrying scaffold-local helper code.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
pnpm --filter @fayz-ai/app-runtime typecheck
pnpm --filter @fayz-ai/app-runtime build
```

Result: passed. Known non-blocking noise: `.npmrc` warns about missing `${NODE_AUTH_TOKEN}`.

### Risk

The SDK repo still has no git remote configured, so this commit is local-only until the open-source destination is confirmed.

### Next

Tracking updated in Linear `FAY-1182` comment `e55b109e-d0e7-4055-bbd0-1d2519f534ca`.

Next either confirm/push SDK remote or move to Fayz provider onboarding UI.

## 2026-06-14 00:28 BRT — M12 Runtime helper behavior tests gated

### Executive outcome

Fayz PR `#927` generated runtime helper now has behavior coverage:

```txt
79b9cdd5 test(scaffold): cover brokered runtime oauth helper
```

### Business impact

- The helper is no longer protected only by static presence checks.
- Tests verify the safe path: runtime-data token exchange, short-lived broker token usage, Calendar broker routes, and no provider credential fields in helper requests.
- This reduces the chance that future agents drift into direct provider API calls or unsafe token handling.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/projects/__tests__/scaffold-runtime-helper.test.ts
npm run build:api
```

Result: passed.

### Risk

Hardening only. SDK remote/package-source still blocks publishing this as the final open-source `@fayz-ai/app-runtime` helper.

### Next

Tracking updated in Linear `FAY-1182` comment `bd1b12eb-d7df-45d3-85c0-c4e5227952b8` and PR comment `https://github.com/FayaLabs/ymaia/pull/927#issuecomment-4700579037`.

Next choose provider onboarding UI or SDK package publication once remote is known.

## 2026-06-14 00:24 BRT — M11 Generated-app runtime helper contract gated

### Executive outcome

Fayz PR `#927` generated-project scaffold now includes a safe runtime helper:

```txt
efcc5bee feat(scaffold): add brokered runtime oauth helper
```

### Business impact

- New generated apps get `src/lib/fayz-runtime.ts` with the expected path for Plugin OAuth exchange and Google Calendar broker calls.
- Agents are guided to use `createFayzRuntimeClient`, `exchangePluginOAuth`, and brokered Calendar helpers instead of inventing OAuth clients.
- This lowers the risk of future generated apps putting provider tokens, OAuth secrets, or tenant authority in browser code.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz
npx tsc --noEmit --skipLibCheck --target ES2020 --module ESNext --moduleResolution bundler --lib ES2020,DOM apps/api/src/modules/projects/scaffold/template/src/lib/fayz-runtime.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result: passed.

### Self-improvement

Full template typecheck surfaced pre-existing missing dependency noise for shadcn/Radix files plus one real helper issue. The helper issue was fixed and validated in isolation. Until the generated template dependency install is validated end-to-end, use isolated helper typecheck plus scaffold test/build as the gate for helper slices.

### Risk

This is still scaffold-level helper code. The final reusable helper belongs in the open-source SDK once package source and SDK remote are confirmed.

### Next

Tracking updated in Linear `FAY-1182` comment `ef707734-8c40-4aef-9ca1-586894340226` and PR comment `https://github.com/FayaLabs/ymaia/pull/927#issuecomment-4700571162`.

Next decide between packaged SDK helper or provider onboarding UI.

## 2026-06-14 00:17 BRT — M10 Plugin OAuth revocation/audit foundation committed and pushed

### Executive outcome

Fayz PR `#927` now includes the revocation/audit foundation:

```txt
75376e4b feat(runtime): add plugin oauth revocation audit foundation
```

### Business impact

- Fayz can now revoke a tenant/plugin OAuth grant or revoke an entire provider connection server-side.
- Active grants are soft-revoked, so broker token resolution stops accepting them.
- Each revocation writes a redacted audit event; provider tokens still do not appear in runtime responses or audit payloads.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz
npx prisma validate --schema packages/db/prisma/schema.prisma
npm run db:generate
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-provider-token.service.test.ts
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/runtime-plugin-oauth-token.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-auth.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-provider-token.service.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth.controller.test.ts
npm run build:api
```

Result: passed.

### Self-improvement

Unit tests passed before TypeScript caught a Prisma JSON readonly mutation. The fix was small, and this confirms `build:api` must remain a mandatory gate for broker work.

### Risk

No public/admin route was exposed yet. This is intentional until the permission model and provider onboarding/disconnect UX are locked.

### Next

Tracking updated in Linear `FAY-1182` comment `f4dc640f-2d3d-4e79-9d61-08ed1b7994e4` and PR comment `https://github.com/FayaLabs/ymaia/pull/927#issuecomment-4700557206`.

Next move to SDK helper contract or provider onboarding UI.

## 2026-06-14 00:10 BRT — M9 Google Calendar write proxy gated

### Executive outcome

Fayz PR `#927` now has the minimum broker path for real agenda operations:

```txt
6e53926b feat(runtime): proxy google calendar writes through oauth broker
```

### Business impact

- Runtime plugins can create, update, and delete Google Calendar events through Fayz.
- Generated apps and open-source SDK code still do not receive Google access tokens, refresh tokens, client secrets, or tenant authority.
- This turns the OAuth broker from a read-only proof into an operational booking foundation for agenda plugins.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/runtime-plugin-oauth-token.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-auth.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-provider-token.service.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth.controller.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: passed.

### Self-improvement

The first M9 controller gate caught a schema composition issue before broader tests. Fix was small and the strategy is confirmed: run the narrow controller gate first, then route-doc parity, then API build.

### Risk

Revocation, detailed audit trail, SDK helper wrapper, and provider onboarding UI remain before calling the public plugin OAuth platform production-complete.

### Next

Tracking updated in Linear `FAY-1182` comment `f5f1a69d-9a74-40ed-9133-4d0e879dfef0` and PR comment `https://github.com/FayaLabs/ymaia/pull/927#issuecomment-4700545142`.

Next choose between revocation/audit or SDK helper contract.

## 2026-06-13 22:52 BRT — M8 Google Calendar provider proxy committed and pushed

### Executive outcome

Fayz PR #927 now includes the first provider proxy boundary:

```txt
d651e111 feat(runtime): proxy google calendar through oauth broker
```

### Business impact

- Runtime plugins can list Google Calendar events through Fayz, not by holding Google tokens.
- Fayz validates the runtime-plugin-oauth token, checks the Google Calendar read grant, resolves the provider token server-side, and refreshes it when needed.
- This is the first concrete provider read path for agenda plugins.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/runtime-plugin-oauth-token.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-auth.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-provider-token.service.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth.controller.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: passed.

### Risk

Calendar write operations, provider revocation, detailed audit trail, and final SDK helper contract remain open.

### Next

Decide whether to add Calendar write proxy next or pause on OAuth broker and package SDK helper/runtime docs once the SDK remote is known.

## 2026-06-13 22:45 BRT — M7 OAuth broker exchange route committed and pushed

### Executive outcome

Fayz PR #927 now includes the runtime exchange route:

```txt
25e4f3e2 feat(runtime): add plugin oauth exchange route
```

### Business impact

- Generated apps can exchange a runtime-data Bearer token for a short-lived Plugin OAuth broker token.
- The exchange is tenant/project-bound by the existing runtime token.
- The response is redacted: it carries broker grant descriptors, not provider access tokens or refresh tokens.
- OpenAPI now documents the route, so the route-doc ratchet stays green.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/runtime-plugin-oauth-token.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth.controller.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: passed.

### Risk

This still does not execute provider API calls. Remaining broker work: provider proxy calls, refresh/revocation, audit trail, and final SDK helper contract.

### Next

Implement the first provider proxy boundary, likely Google Calendar for agenda, without exposing provider tokens to runtime/browser code.

## 2026-06-13 22:39 BRT — M6 OAuth broker foundation committed and pushed

### Executive outcome

Fayz PR #927 now includes the first OAuth-backed plugin broker foundation:

```txt
09ffa8b4 feat(runtime): add plugin oauth broker foundation
```

### Business impact

- Plugin OAuth credentials now have a server-side Fayz-owned persistence model.
- Access/refresh tokens are encrypted at rest.
- Grants are scoped by project, plugin, tenant key, and environment.
- Runtime-facing grant descriptors expose capability metadata only; generated apps and the open-source SDK still do not receive provider tokens.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz
npx prisma validate --schema packages/db/prisma/schema.prisma
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts
npm run build:api
```

Result: passed.

### Risk

This is not the complete Runtime Session Broker yet. Remaining work is the exchange route, provider refresh/revocation, audit trail, and final SDK helper contract.

### Next

Implement broker runtime exchange route and keep PR #927 draft until that boundary is safe.

## 2026-06-13 22:31 BRT — Fayz draft PR created, SDK remote missing

### Executive outcome

The Fayz implementation branch was pushed to GitHub and opened as draft PR:

```txt
https://github.com/FayaLabs/ymaia/pull/927
```

Base: `dev`. Head: `weekend-fayz-sdk-panel-manifest`.

### Business impact

- The Fayz Panel/AppManifest/scaffold/runtime-token work is now backed up remotely.
- Fayz implementation is now reviewable without waiting for local context.
- This reduces local-only risk without touching uncommitted proof screenshots or agent status files.

### Risk

`/Users/fayalabs/dev/fayz-sdk` has no git remote configured. Do not guess it; confirm the open-source SDK repository destination before pushing SDK commits.

### Runtime check

No stuck build/test process found. Beauty Vite remains healthy on port `5180`.

### Next

Keep PR `#927` draft while OAuth broker and SDK remote are unresolved. Confirm SDK remote, then push `weekend-fayz-sdk-architecture-lock`.

## 2026-06-13 22:22 BRT — Docs operating record packaged

### Executive outcome

The weekend operating record is being packaged as a dedicated docs commit in `/Users/fayalabs/dev/fayz-sdk`.

### Business impact

- The mission no longer depends only on a long chat thread.
- The other status agent can summarize from stable files instead of reconstructing context.
- Architecture decisions, OAuth/open-source guardrails, milestone gates, Linear status, and Beauty proof are preserved in repo history.

### Scope

- `docs/discovery/`
- `docs/agent-guide.md`

### Runtime check

No stuck test/build process found. Beauty Vite remains healthy on port `5180`.

### Next

After this docs commit, remaining executive decisions are push/PR strategy and Beauty branch reconciliation.

## 2026-06-13 22:20 BRT — M5 Beauty agenda proof validated

### Executive outcome

Beauty agenda proof is still usable. No Beauty code commit was created because `/Users/fayalabs/dev/fayz-app/beauty-saas` is behind `origin/main` by 2 commits and this slice was validation, not a code change.

### Business impact

- The demo agenda route still loads at `http://127.0.0.1:5180/#/agenda`.
- Existing paid demo booking remains intact:
  - `TESTE-CODEX Agenda`;
  - `Corte de cabelo`;
  - `sábado, 13 de junho · 09:00 – 09:25`;
  - `Mano Capurro`;
  - `Barra da Tijuca`;
  - `R$ 120,00 · Pago`;
  - `Confirmed`.
- This keeps the customer demo path viable after the SDK/Fayz runtime packaging work.

### Gate passed

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Result: passed.

### Browser proof

DOM proof confirmed the booking and agenda route. Browser screenshot capture timed out twice at the browser layer, so this proof uses DOM state plus build/typecheck instead of a new screenshot artifact.

### Runtime check

No stuck test/build process found. Beauty Vite remains healthy on port `5180`.

### Next

Operationally, the five milestone packages are now either committed or validated. Next execution should move to docs packaging/push/PR strategy, or reconcile `beauty-saas` branch before any Beauty commit.

### Linear

Updated the existing consolidated `FAY-1178` comment with M1-M5 closure, gates, remaining decisions, and Beauty validation status.

## 2026-06-13 22:16 BRT — M4 runtime data/token foundation committed

### Executive outcome

Fourth milestone commit created in `/Users/fayalabs/dev/fayz`:

```txt
efa6e510 feat(runtime): add tenant-scoped data token foundation
```

This is the runtime safety foundation for generated apps. It is not the full OAuth broker yet.

### Business impact

- Fayz can issue short-lived runtime-data Bearer tokens to authorized project editors.
- Runtime routes are separated under `/api/v1/runtime/projects/:projectId/database`.
- Runtime row reads/writes are scoped by signed tenant claims, not caller-provided tenant values.
- Runtime permissions are deny-by-default; operations require explicit signed permission.
- Runtime routes reject schema override so callers cannot widen database scope.
- OpenAPI documents the runtime token and runtime row routes.

### Gate passed before commit

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/runtime-data-auth.test.ts src/modules/database/__tests__/runtime-data-token.test.ts src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/database.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result: passed.

Self-improvement: the first M4 gate caught older tests calling tenant-scope without explicit permissions. I kept the safer deny-by-default service behavior and updated fixtures to model explicit runtime permissions.

### Runtime check

No stuck test/build process found after commit. Beauty Vite remains healthy on port `5180`.

### Remaining risk

`FAY-1182` is not fully production-complete until OAuth-backed Runtime Session Broker owns provider grants, token exchange, refresh/revocation, encrypted storage, audit, and runtime token issuance.

### Next

Package M5: Beauty agenda proof/fixes, while keeping the existing paid demo booking intact.

### Linear

Updated the existing `FAY-1182` decision/checkpoint comment with M4 commit, gates, and the remaining OAuth-backed broker gap.

## 2026-06-13 22:13 BRT — M3 generated-project scaffold milestone committed

### Executive outcome

Third milestone commit created in `/Users/fayalabs/dev/fayz`:

```txt
864005d2 feat(scaffold): seed sdk app manifest contract
```

This converts the AppManifest foundation from "Fayz can store/render it" into "new projects are born SDK-aware."

### Business impact

- Generated projects now include `app.manifest.json`.
- Generated projects include an `AGENTS.md` guide that tells coding agents how to use the manifest/registry/plugin files safely.
- Generated projects include local `src/registry.tsx` and Fayz-owned `src/plugins.generated.ts` extension points.
- Generated `package.json` includes `test`, `typecheck`, and `build` scripts for coding agents.
- Programmatic generation now seeds the project Panel manifest from scaffold files, matching the regular project creation path.
- Guardrails explicitly preserve the open-source SDK/OAuth decision: no OAuth secrets, refresh tokens, or tenant authority in SDK/browser/generated app code.

### Gate passed before commit

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: passed.

### Runtime check

No stuck test/build process found after commit. Beauty Vite remains healthy on port `5180`.

### Next

Package M4: OAuth-backed runtime data/token foundation. Keep Beauty proof as M5 and do not claim public generated-app `fayz-api` production readiness until M4 is implemented and gated.

### Linear

Updated the existing consolidated `FAY-1178` comment with M3 commit, gate, and remaining milestone order.

## 2026-06-13 22:10 BRT — M2 Fayz Panel/AppManifest milestone committed

### Executive outcome

Second milestone commit created in `/Users/fayalabs/dev/fayz`:

```txt
88f71e80 feat(panel): add db-backed app manifest surface
```

This moves Fayz from "Panel manifest PoC in a dirty branch" to a reviewable backend + frontend foundation.

### Business impact

- Fayz can store versioned AppManifest bindings per project, tenant, environment, and surface.
- The editor Panel can render tenant-specific SDK manifest content without replacing Fayz-owned controls.
- New project creation now seeds an initial Panel manifest from the scaffold files.
- AppManifest routes are protected by project access and by VIEWER/EDITOR role checks.
- OpenAPI now teaches the strict AppManifest v2 shape instead of legacy drift fields.

### Gate passed before commit

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx src/__tests__/services/api/app-manifests.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/project-route-guard.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
npm run build:web
```

Result: passed. Focused tests covered 78 assertions across API, Web, route safety, and organization/share access.

Known non-blocking build warnings remain in the existing Web build: ambiguous Tailwind classes, unresolved Kallisto font at build time, existing dynamic/static import warning, and large chunks.

### Runtime check

No stuck test/build process found after commit. Beauty Vite remains healthy on port `5180`.

### Next

Package M3 next: generated-project scaffold and agent guardrails. Keep runtime/OAuth broker as M4 and Beauty proof as M5.

### Linear

Updated the existing consolidated `FAY-1178` comment with M1/M2 milestone commits, gates, remaining risks, and next packaging order.

## 2026-06-13 22:08 BRT — Executive update format locked

### Executive outcome

Updated the autonomous heartbeat instruction so future updates use CTO-level status instead of low-level technical noise.

### What changed

- Heartbeat keeps running every 5 minutes.
- Each cycle must communicate in this shape: Resultado, Impacto, Risco, Proximo.
- Raw technical detail is only useful when it changes a business decision, a blocker, or confidence in a milestone.
- Coherent milestone commits remain mandatory after gates pass; broad uncommitted accumulation is now explicitly treated as an execution risk.

### Current assessment

Progress is real, not stuck: M1 is already committed as `c967b26`.

Execution was becoming too close to a rabbit loop because the dirty branches kept growing. The correction is now active: package M2 next, then M3/M4, instead of adding more foundation work.

### Runtime check

No stuck test/build process found. Beauty Vite remains healthy on port `5180`.

### Next

Package M2: Fayz DB-backed AppManifest API plus Panel renderer. Do not package M3 before M2 because scaffold/generation references M2 seed behavior.

## 2026-06-13 22:04 BRT — M1 SDK foundation milestone committed

### Executive outcome

First milestone commit created in `/Users/fayalabs/dev/fayz-sdk`:

```txt
c967b26 feat(sdk): lock app manifest runtime contract
```

This reduces the top operational risk: the weekend work is no longer only a large dirty branch. One coherent SDK foundation slice is now reviewable.

### What the commit contains

- SDK `AppManifest` v2 validation and exported JSON Schema strictness.
- `fayz-api` data provider entrypoint in `@fayz-ai/core`.
- Manifest-aware `resolveDataProvider()` backend routing.
- Runtime umbrella export cleanup and real `@fayz-ai/app-runtime/styles.css` build output.
- Repeatable root `pnpm check:manifest` gate scoped to `@fayz-ai/core`.

### Gate passed before commit

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm check:manifest
pnpm --filter @fayz-ai/app-runtime typecheck
pnpm --filter @fayz-ai/app-runtime build
```

Result: passed.

Known non-blocking noise: SDK `.npmrc` warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

No app terminal session was attached for log reading. Process snapshot showed no stuck test/build process after commit. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Next

Package M3 or M2 next. M3 has a dependency on M2 seed behavior, so do not commit M3 alone if it references `ProjectAppManifest` seed code not yet packaged.

## 2026-06-13 21:58 BRT — Milestone packaging plan created

### Executive outcome

Created `/Users/fayalabs/dev/fayz-sdk/docs/discovery/23-milestone-packaging-plan.md`.

This is a delivery-control move, not a feature move. The weekend work is real, but the current risk is large dirty branches without milestone commits.

### Packaging plan

- M1: SDK core/runtime manifest + data provider foundation.
- M2: Fayz AppManifest API + Panel renderer.
- M3: generated-project scaffold + agent guardrails.
- M4: runtime data/OAuth broker direction.
- M5: Beauty agenda proof/fixes.

Each group now has candidate files, validation gates, and suggested commit messages.

### Rules locked

- Stage explicit files only; never `git add .`.
- Run the listed gate before each commit.
- Do not mix SDK, Fayz API/Panel, scaffold, Beauty, and docs-only work in one commit.
- Do not commit `beauty-saas` while it is behind origin until branch strategy is explicit.
- No broad implementation before at least one coherent milestone is packaged.

### Runtime check

No app terminal session was attached for log reading. Process snapshots showed no stuck test/build process before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with the packaging plan and execution-mode change.

### Next

Start packaging with M1 or M3 because they have the smallest gates and lowest review risk.

## 2026-06-13 21:53 BRT — OAuth plugin auth direction captured

### Executive decision

Vini confirmed:

- Fayz SDK is open source.
- Plugin/integration authentication uses OAuth.
- SDK/generated apps/plugins must not own secrets, OAuth client secrets, provider refresh tokens, partner API keys, or tenant-authority decisions.
- Fayz-owned server-side infrastructure owns OAuth apps, token exchange, refresh/revocation, encrypted token storage, tenant grants, audit logs, and runtime token issuance.

### Impact

This turns `FAY-1182` from a vague production-session blocker into a clearer architecture path: an OAuth-backed Runtime Session Broker.

The open-source SDK can safely expose public interfaces, manifest/plugin declarations, provider adapters, and OAuth redirect helpers because trust and secrets stay server-side.

### Docs changed

- `/Users/fayalabs/dev/fayz-sdk/docs/discovery/18-fay-1182-runtime-session-decision.md`
- `/Users/fayalabs/dev/fayz-sdk/docs/discovery/20-architecture-lock.md`
- `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`
- `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`
- `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`

### Verification

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: 10 tests passed.

No code/runtime OAuth implementation was added in this slice.

### Runtime check

No app terminal session was attached for log reading. Process snapshots showed no stuck test/build process before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

The first focused scaffold test failed because it still expected the old non-OAuth browser-secret warning. The test was updated to lock the stronger OAuth-specific warning instead of weakening the guardrail.

### Next

Move to packaging/review mode, then implement a narrow feature-flagged OAuth connection/runtime broker proof when ready. Do not add secrets or long-lived provider tokens to the open-source SDK or generated apps.

## 2026-06-13 21:43 BRT — SDK JSON Schema strictness locked in manifest gate

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.

Root `pnpm check:manifest` now asserts the exported SDK `appManifestSchema` keeps `additionalProperties: false` at all strict manifest nodes:

- root AppManifest;
- `backend`;
- `surface`;
- `pluginRef`;
- `page`;
- `block`.

This complements the runtime `validateManifest()` field-drift checks: agents/OpenAPI/schema consumers should learn the same strict shape the runtime enforces.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz-ai/core`; 2 successful tasks; build cache hit; manifest contract check passed.

Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

App terminal tool was unavailable in this heartbeat, but process snapshots showed no stuck test/build process before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

Schema drift is as dangerous as validator drift because generated agents and docs can learn from exported JSON Schema. Keep schema strictness in the same repeatable contract gate.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this SDK JSON Schema strictness gate.

## 2026-06-13 21:40 BRT — SDK manifest gate covers remaining forbidden fields

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.

Root `pnpm check:manifest` now explicitly proves SDK `validateManifest()` rejects the remaining legacy Panel/API drift fields that generated agents are forbidden to write:

- `surfaces.panel.id`;
- `surfaces.panel.name`;
- `plugins[0].title`;
- `plugins[0].label`.

This extends the prior drift gate that already covered top-level `manifest.title`, `surfaces.panel.title`, `pages[0].id`, `pages[0].title`, and `plugins[0].pluginId`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz-ai/core`; 2 successful tasks; build cache hit; manifest contract check passed.

Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

No app terminal session was attached for log reading before this slice. No stuck test/build process found before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

Whenever agent docs prohibit a manifest field, the repeatable SDK contract gate should assert that exact field is rejected, not rely on generic unsupported-key coverage.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this SDK forbidden-field gate.

## 2026-06-13 21:36 BRT — SDK manifest gate covers runtime ambiguity

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.

Root `pnpm check:manifest` now also proves SDK `validateManifest()` rejects structural AppManifest states that would make runtime/scaffold behavior ambiguous:

- `backend.provider = "custom"` without `backend.adapterId`;
- page with multiple renderers (`component` plus `entity`);
- duplicate page path in a surface;
- duplicate plugin id in a surface.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz-ai/core`; 2 successful tasks; manifest contract check passed.

Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

No app terminal session was attached for log reading before this slice. No stuck test/build process found before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

SDK manifest contract gates should cover runtime ambiguity, not only schema/version drift. If agents create ambiguous pages or duplicate plugin/page ids, fail in `@fayz-ai/core` before the manifest reaches scaffold/runtime.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this SDK manifest structural invariant gate.

## 2026-06-13 21:31 BRT — SDK manifest gate rejects legacy drift fields

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.

Root `pnpm check:manifest` now also proves SDK `validateManifest()` rejects the legacy v2 drift fields that previously caused API/Panel mismatch:

- top-level `manifest.title`;
- `surfaces.panel.title`;
- `pages[0].id`;
- `pages[0].title`;
- `plugins[0].pluginId`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz-ai/core`; 2 successful tasks; manifest contract check passed.

Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

No app terminal session was attached for log reading before this slice. No stuck test/build process found before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

Manifest contract gates should lock both version compatibility and forbidden legacy write-shape drift, otherwise agents can pass version checks while reintroducing fields the API/Panel cleanup already removed.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this SDK manifest drift contract gate.

## 2026-06-13 21:27 BRT — Generated agents get exact validation commands

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

Generated-project agents now see the exact validation loop before claiming changes done:

```bash
npm run test
npm run typecheck
npm run build
```

Scaffold tests now prove the generated package exposes `test`, `typecheck`, and `build` scripts and that the generated `AGENTS.md` points agents at those commands.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: focused scaffold test passed, 10 tests.

Build intentionally not repeated because this was generated-agent guide/template/test coverage only.

### Runtime check

No app terminal session was attached for log reading before this slice. No stuck test/build process found before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

When scaffold package scripts exist for agents, generated `AGENTS.md` should name the exact commands rather than generic "run build/tests" language.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this generated-project validation command guidance.

## 2026-06-13 21:21 BRT — Root manifest gate filtered to core only

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/package.json`.

Updated `/Users/fayalabs/dev/fayz-sdk/turbo.json`.

Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.

Root `pnpm check:manifest` now runs:

```bash
turbo check:manifest --filter @fayz-ai/core
```

Added a `check:manifest` turbo task depending on `build`, so the root command builds/checks only `@fayz-ai/core` before importing `dist`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz-ai/core`; 2 successful tasks (`@fayz-ai/core:build`, `@fayz-ai/core:check:manifest`); manifest contract check passed.

Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

No app terminal session was attached for log reading before this slice. No stuck test/build process remains after the optimization. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

The first root attempt used unfiltered `turbo check:manifest`; it passed but ran 23 tasks across unrelated packages. Do not use that in heartbeat loops. Use root `pnpm check:manifest`, which is now filtered to `@fayz-ai/core`.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this root manifest gate optimization.

## 2026-06-13 21:16 BRT — SDK agent guide points to manifest contract gate

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.

The guide now tells SDK agents changing `@fayz-ai/core` AppManifest runtime/schema behavior to run:

```bash
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
pnpm --filter @fayz-ai/core check:manifest
```

This makes the new repeatable manifest contract gate discoverable from the primary agent guide, not only package metadata or progress docs.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core check:manifest
```

Result: manifest contract check passed using the previously built `dist`.

Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

After adding a package gate, put the exact command sequence in the primary agent guide so future agents do not rediscover or retype ad hoc smoke commands.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this agent-guide validation loop update.

## 2026-06-13 21:11 BRT — SDK AppManifest contract check made repeatable

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/package.json`.

Added `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.

The manual SDK AppManifest smoke is now a repeatable package command:

```bash
pnpm --filter @fayz-ai/core check:manifest
```

The check imports the built `packages/core/dist/index.js`, confirms `CURRENT_MANIFEST_VERSION === 2`, confirms exported JSON schema `manifestVersion.const === 2`, validates a canonical v2 manifest, and rejects v1/v3 manifests with `manifest.manifestVersion must be 2`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
pnpm --filter @fayz-ai/core check:manifest
```

Result: typecheck passed; build passed; manifest contract check passed.

Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

Replace ad hoc SDK dist smokes with package scripts so future heartbeat runs can execute the same gate quickly and consistently.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this repeatable SDK manifest contract gate.

## 2026-06-13 21:08 BRT — Beauty agenda paid booking proof refreshed

### Change

No code or data mutation in this slice.

Browser-verified `http://127.0.0.1:5180/#/agenda`.

Page-level proof confirmed the existing paid demo booking still renders with:

- `TESTE-CODEX Agenda`;
- `Corte de cabelo`;
- `09:00 – 09:25`;
- `Mano Capurro`;
- `Barra da Tijuca`.

Opening the booking popover confirmed:

- `sábado, 13 de junho · 09:00 – 09:25`;
- `Corte de cabelo`;
- `Mano Capurro`;
- `Barra da Tijuca`;
- `Total`;
- `R$ 120,00 · Pago`;
- `Confirmed`.

Browser console error log count for the tab: `0`.

### Verification passed

Browser DOM proof passed against the local Beauty Vite app on port `5180`. No create/edit/delete/cancel action was performed.

### Runtime check

No app terminal session was attached for log reading before this proof. Process snapshot before the proof showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.

### Self-improvement

When revalidating Beauty popovers, assert the DOM's current split text (`Total` plus `R$ 120,00 · Pago`) instead of stale combined strings like `Total R$ 120,00`, and use unique browser-session variable names to avoid persistent-kernel redeclare errors.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this Beauty proof refresh.

## 2026-06-13 21:02 BRT — Generated-agent guidance mirrors v2 validator lock

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

Agent-facing guidance now says `manifestVersion` must stay at `2` and explicitly notes SDK `validateManifest()` plus Fayz API public writes reject any other version.

This closes the loop after the SDK/API v2 validation locks: generated-project agents should not try `manifestVersion: 1`, `3`, or any manual bump to signal feature work.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 10 passed; integrated API AppManifest/scaffold/generation gate 66 passed.

Build intentionally not repeated because this was agent-guide/template/test coverage only.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

After enforcing a runtime/API contract, immediately mirror it in SDK guide plus generated `AGENTS.md` and lock the generated copy with scaffold tests.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this generated-agent v2 validator guidance.

## 2026-06-13 20:57 BRT — SDK AppManifest validation locked to v2

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/src/manifest/index.ts`.

Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/src/manifest/app-manifest.schema.json`.

SDK `validateManifest()` now rejects any `manifestVersion` different from `CURRENT_MANIFEST_VERSION` (`2`).

SDK exported `appManifestSchema` now documents the v2 schema with `manifestVersion.const = 2` instead of loose `minimum: 1`.

This aligns SDK validation with the Fayz API public write lock: old/future manifest versions require explicit SDK/API migrations before they can validate or be persisted.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module -e "import { validateManifest, CURRENT_MANIFEST_VERSION, appManifestSchema } from './packages/core/dist/index.js'; /* v2 valid, v1/v3 rejected, schema const smoke */"
```

Result: `@fayz-ai/core` typecheck passed; build passed; Node smoke returned `validProblems: 0`, v1/v3 problems `manifest.manifestVersion must be 2`, and `schemaConst: 2`.

Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Do not use `pnpm exec tsx` for SDK smokes unless `tsx` is installed in the SDK workspace. Build first and smoke `packages/core/dist/index.js` with Node.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this SDK AppManifest v2 validation lock.

## 2026-06-13 20:53 BRT — Public AppManifest writes locked to v2

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.constants.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.controller.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/project-app-manifest.seed.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/schemas/projects.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/__tests__/app-manifest-openapi-schema.test.ts`.

Added shared `CURRENT_APP_MANIFEST_VERSION = 2` for Fayz API AppManifest code paths.

Public AppManifest writes now reject legacy/future `manifestVersion` values before persistence. The API no longer accepts v1 or v3 manifests that the current SDK runtime cannot safely render without registered migrations.

OpenAPI now documents the AppManifest v2 lock instead of a loose `manifestVersion >= 1` contract.

Internal scaffold seed still normalizes malformed generated manifest versions to v2 before DB writes.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts src/docs/__tests__/app-manifest-openapi-schema.test.ts src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: focused controller/OpenAPI tests 29 passed; integrated API AppManifest/scaffold/generation/OpenAPI parity gate 72 passed; API build passed.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Do not let public writes store manifest versions the current runtime cannot render. Keep old/future version handling behind explicit SDK/API migrations; seed sanitization can normalize generated JSON, but the public API should fail fast.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this public AppManifest v2 version lock.

## 2026-06-13 20:49 BRT — Scaffold AppManifest passes Fayz API write boundary

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.

No runtime, scaffold output, or SDK package wiring changed in this slice.

Added a controller regression that loads the generated scaffold `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/app.manifest.json` through `getBaseFiles()` and writes it through the real `createManifest` request validation path.

This proves the template given to generated-project agents is accepted by the Fayz API AppManifest write boundary before it reaches `ProjectAppManifest` persistence.

Did not add a hard test dependency on `@fayz-ai/core` from the Fayz repo; `FAY-1181` package-source remains deferred. The cross-repo SDK `validateManifest()` smoke remains documented/manual until package wiring is locked.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused controller test 23 passed; integrated API AppManifest/scaffold/generation gate 64 passed.

Build intentionally not repeated because this was test-only controller/scaffold coverage.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

When SDK package-source is blocked, prefer a Fayz API write-boundary regression over a brittle cross-repo test import. Keep the SDK validator smoke manual/documented until `@fayz-ai/core` source/version is locked.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this scaffold AppManifest write-boundary guardrail.

## 2026-06-13 20:41 BRT — Scaffold surface set guardrail

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

No runtime or scaffold output changed in this slice.

Added regression coverage proving the generated scaffold `app.manifest.json` starts with exactly `panel` and `admin` surfaces.

The test also proves every generated scaffold surface id is one of the supported operational binding surfaces from `MANIFEST_SURFACES`.

This complements the seed sanitizer: generated templates should start valid, while seed sanitization remains the safety net for malformed generated JSON.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 10 passed; integrated API AppManifest/scaffold/generation gate 63 passed.

Build intentionally not repeated because this was test-only scaffold coverage.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

After adding sanitizer safety nets, add template regression tests so generated projects start correct instead of only being repaired during seed.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this scaffold surface set guardrail.

## 2026-06-13 20:37 BRT — Generated-agent manifestVersion guidance guardrail

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

Agent-facing guidance now explicitly says to keep `manifestVersion` at `2` unless a real SDK/API manifest migration is registered and approved.

Generated agents are told not to bump `manifestVersion` manually to signal feature work.

This mirrors the scaffold seed sanitizer, which now emits a v2-shaped manifest and normalizes generated versions to `2` before `ProjectAppManifest` persistence.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 9 passed; integrated API AppManifest/scaffold/generation gate 62 passed.

Build intentionally not repeated because this was agent-guide/template/test coverage only.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Every runtime/seed contract lock must be mirrored in agent-facing docs and protected by scaffold tests so generated project agents do not reintroduce drift.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this generated-agent manifestVersion guidance guardrail.

## 2026-06-13 20:31 BRT — Scaffold seed manifestVersion locked to v2

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/project-app-manifest.seed.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/project-app-manifest.seed.test.ts`.

Internal scaffold seed now always writes the current AppManifest v2 version after sanitizing generated JSON.

Legacy (`manifestVersion: 1`), invalid (`0`), and future (`3`) generated versions normalize to `2` before internal `ProjectAppManifest` persistence.

Public AppManifest validation was not changed; this is scoped to generated-project seed safety because the sanitizer emits a v2-shaped manifest.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused seed test 14 passed; integrated API AppManifest/scaffold/generation gate 62 passed; API build passed.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

If a sanitizer emits a v2-shaped manifest, it must also normalize `manifestVersion` to v2. Do not persist future/legacy generated versions without an explicit migration path.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this scaffold seed manifestVersion lock.

## 2026-06-13 20:27 BRT — Scaffold surface ids sanitized before seed writes

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/project-app-manifest.seed.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/project-app-manifest.seed.test.ts`.

Internal scaffold seed now trims generated manifest surface keys, keeps the first normalized duplicate, and drops unsupported generated surfaces before writing `ProjectAppManifest`.

Supported scaffold seed surfaces now stay aligned with the operational binding surfaces: `panel`, `admin`, `storefront`, and `portal`.

Public AppManifest validation was not broadened or made stricter in this slice; the change is scoped to internal generated-project seed safety.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused seed test 12 passed; integrated API AppManifest/scaffold/generation gate 60 passed; API build passed.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Keep seed sanitization narrower than public AppManifest validation unless the SDK schema itself changes; internal generated files should normalize to supported Fayz binding surfaces before DB writes.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this scaffold surface-id sanitization.

## 2026-06-13 20:21 BRT — Generated-agent scope guidance guardrail

### Change

Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

Agent-facing guidance now explicitly teaches the `ProjectAppManifest` scope contract: `tenantKey + environment + surface`.

Generated project agents now see the default scope `default / preview / panel`, trim-before-read/write behavior, failure on unsupported environments/surfaces, and the supported values `preview`, `production`, `panel`, `admin`, `storefront`, and `portal`.

This keeps future coding agents aligned with the layered runtime contract now enforced in service, controller, adapter, and renderer.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 9 passed; integrated API AppManifest/scaffold/generation gate 59 passed.

Build intentionally not repeated because this was agent-guide/template/test coverage only.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

When runtime contracts are locked, mirror them in both SDK agent guide and generated `AGENTS.md`, then add scaffold tests so future scaffold edits cannot silently drop the guidance.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this generated-agent scope guidance guardrail.

## 2026-06-13 20:16 BRT — Beauty agenda paid booking proof refreshed

### Change

No code or data mutation in this slice.

Browser-verified `http://127.0.0.1:5180/#/agenda`.

Agenda page-level proof confirmed the existing booking still renders with:

- `TESTE-CODEX Agenda`;
- service `Corte de cabelo`;
- time `09:00 – 09:25`;
- staff/location `Mano Capurro` / `Barra da Tijuca`.

Opening the booking popover confirmed:

- `sábado, 13 de junho · 09:00 – 09:25`;
- `Corte de cabelo (25min)`;
- `Mano Capurro` / `Barra da Tijuca`;
- `Total R$ 120,00 · Pago`;
- status `Confirmed`.

### Verification passed

Browser DOM proof passed against the local Beauty Vite app on port `5180`. No create/edit/delete/cancel action was performed.

### Runtime check

No app terminal session was attached for log reading before this proof. Process snapshot before the proof showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Keep Beauty proof refresh non-mutating and open the popover before asserting payment/status. In the in-app browser API, locator waits need an explicit `state: "visible"`.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this Beauty proof refresh.

## 2026-06-13 20:12 BRT — AppManifest service scope normalized

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.service.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.

The AppManifest service now trims and validates `environment` and `surface` for direct service callers before DB reads/writes, not only at the HTTP controller boundary.

Unsupported service-level scope values now fail before Prisma queries/transactions; blank scope values still fall back to `preview` and `panel`.

Service writes now trim `source`, reject blank source, and enforce the same 120-character provenance cap used by the HTTP contract.

This protects internal seed/generation/future callers from bypassing the HTTP scope normalization contract.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused service test 16 passed; integrated API AppManifest/scaffold/generation gate 58 passed; API build passed.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

AppManifest scope normalization is now layered: service protects DB callers, controller protects HTTP callers, adapter/renderer protect Panel UI callers. For service runtime changes, run focused service, integrated API AppManifest/scaffold/generation gate, and `npm run build:api`.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this service scope normalization.

## 2026-06-13 20:07 BRT — AppManifest HTTP scope enum params normalized

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.controller.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/schemas/projects.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/__tests__/app-manifest-openapi-schema.test.ts`.

The AppManifest HTTP boundary now trims `environment` and `surface` for active reads and writes, matching the previously locked `tenantKey/source` behavior and the web adapter/Panel renderer scope contract.

Blank/unsupported `environment` and `surface` values are still rejected before service calls; whitespace-wrapped valid values now resolve to canonical enum values.

Bound-surface validation uses the normalized `surface`, so a write with `surface: " admin "` correctly validates against `manifestJson.surfaces.admin`.

OpenAPI now documents trim/blank behavior for `environment` and `surface` on request schemas and active-manifest query params.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/app-manifest-openapi-schema.test.ts src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: focused controller test 22 passed; focused OpenAPI schema test 3 passed; integrated API AppManifest/scaffold/generation gate 53 passed; OpenAPI schema plus route/OpenAPI parity gate 5 passed; API build passed.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Keep all four scope dimensions consistent across HTTP controller, OpenAPI, web adapter, and Panel renderer. For API runtime plus OpenAPI scope changes, run focused controller, focused OpenAPI schema, integrated API gate, schema+route parity, and `npm run build:api`.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this AppManifest HTTP scope normalization.

## 2026-06-13 20:02 BRT — Panel renderer scope props normalized

### Change

Updated `/Users/fayalabs/dev/fayz/apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`.

Updated `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx`.

The Panel renderer now trims `surface`, `environment`, and `tenantKey` props before API calls, scope labels, empty/missing-surface copy, and surface resolution.

Blank/whitespace props now fall back to `panel`, `preview`, and `default`, matching the web API adapter and backend HTTP boundary behavior.

Binding `surface` is also normalized before resolving the SurfaceManifest, so a blank/corrupt binding value cannot force a bad lookup when the requested scope is valid.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:web
```

Result: focused Panel renderer test 9 passed; web adapter plus Panel renderer gate 14 passed; web build passed.

Known build warnings only: existing Tailwind arbitrary class ambiguity, Kallisto font runtime resolution, dynamic/static admin import chunk note, and large chunks.

### Runtime check

No app terminal session was attached for log reading before this slice. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Keep adapter and renderer scope normalization in lockstep. For web Panel runtime changes, run the focused renderer test, combined adapter+Panel gate, and `npm run build:web`.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this Panel renderer scope normalization.

## 2026-06-13 19:55 BRT — Web AppManifest scope params normalized

### Change

Updated `/Users/fayalabs/dev/fayz/apps/web/src/services/api/app-manifests.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/services/api/app-manifests.test.ts`.

The Panel AppManifest API adapter now trims `surface`, `environment`, and `tenantKey` before building the active-manifest query string.

Blank/whitespace scope params now fall back to `panel`, `preview`, and `default` instead of sending blank values to the API.

This aligns the frontend adapter with the backend HTTP boundary normalization and avoids accidental Panel misses/400s from whitespace props.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:web
```

Result: focused web adapter test 5 passed; web adapter plus Panel renderer gate 13 passed; web build passed.

Known build warnings only: existing Tailwind arbitrary class ambiguity, Kallisto font runtime resolution, dynamic/static admin import chunk note, and large chunks.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

`git diff` will stay empty for this slice while AppManifest web files are untracked; use direct file reads/status for verification until the files are staged. For web runtime adapter changes, run focused adapter test, Panel renderer gate, and `npm run build:web`.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this web scope normalization.

## 2026-06-13 19:49 BRT — Generated scaffold package-source guardrail covered

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

No runtime/scaffold output changed in this slice; this is regression coverage for the existing blocked state.

Added scaffold coverage proving generated projects remain free of hard `@fayz-ai/*` package dependencies and static executable `@fayz-ai/*` imports until package source is locked.

The test still allows agent-facing guidance in `AGENTS.md` to mention future `@fayz-ai/app-runtime` usage after package-source setup.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 8 passed; integrated API AppManifest/scaffold/generation gate 51 passed.

Build intentionally not repeated because this was a test-only scaffold guardrail.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

FAY-1181 should stay a hard guard until package-source is approved. For test-only scaffold guardrails, focused scaffold plus integrated AppManifest/scaffold/generation gate is enough; save API builds for runtime/scaffold-output source edits.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this package-source guardrail because it protects generated AppManifest/scaffold rollout.

## 2026-06-13 19:44 BRT — Beauty agenda paid booking proof refreshed

### Change

No code or data mutation in this slice.

Browser-verified `http://127.0.0.1:5180/#/agenda`.

Agenda page-level proof confirmed the existing booking still renders with:

- `TESTE-CODEX Agenda`;
- service `Corte de cabelo`;
- time `09:00 – 09:25`;
- staff/location `Mano Capurro` / `Barra da Tijuca`.

Opening the booking popover confirmed:

- `sábado, 13 de junho · 09:00 – 09:25`;
- `Total R$ 120,00 · Pago`;
- status `Confirmed`.

### Verification passed

Browser DOM proof passed against the local Beauty Vite app on port `5180`. No create/edit/delete/cancel action was performed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot before and after the proof showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Keep Beauty proof refresh non-mutating and open the popover before asserting payment/status; page-level text remains sufficient only for booking/service/time/staff/location.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this Beauty proof refresh.

## 2026-06-13 19:39 BRT — Custom-scope active manifest write covered

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.

No runtime code changed in this slice.

Added service regression coverage proving an active manifest write in a custom `tenantKey + environment + surface` scope:

- trims `tenantKey` before write;
- archives only the previous active binding in that same custom scope;
- creates the next active version with the requested `manifestJson`, `source`, and `activatedAt`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 11 passed; integrated API AppManifest/scaffold/generation gate 50 passed.

Build intentionally not repeated because this was a test-only service contract slice.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

The custom-scope write path is now explicitly covered for active writes, so avoid more manifest-write scope tests unless runtime behavior changes; move next to Panel/scaffold or Beauty proof gaps.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this custom-scope write regression.

## 2026-06-13 19:36 BRT — OpenAPI AppManifest schema regression automated

### Change

Added `/Users/fayalabs/dev/fayz/apps/api/src/docs/__tests__/app-manifest-openapi-schema.test.ts`.

No runtime/OpenAPI source behavior changed in this slice; this is a contract regression for the generated document.

The test locks generated OpenAPI schema constraints for:

- `CreateProjectAppManifest.tenantKey`;
- `CreateProjectAppManifest.source`;
- `ProjectAppManifest.tenantKey`;
- nullable `ProjectAppManifest.source`;
- active manifest lookup query `tenantKey`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/app-manifest-openapi-schema.test.ts src/docs/__tests__/route-doc-parity.test.ts
```

Result: focused OpenAPI schema regression 2 passed; OpenAPI schema regression plus route/OpenAPI parity 4 passed.

Build intentionally not repeated because this was test-only, and the previous OpenAPI schema source/API build gate passed at 19:29 BRT.

### Runtime check

No app terminal session was attached for log reading. Process snapshot before the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Manual generated-document smokes that protect a contract should become focused regression tests before moving on. Keep route/OpenAPI parity for integrated revalidation, but use this new schema test for fast AppManifest OpenAPI contract checks.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this schema regression.

## 2026-06-13 19:29 BRT — OpenAPI tenant/source constraints aligned

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/schemas/projects.ts`.

No route/runtime behavior changed in this slice.

OpenAPI now documents the AppManifest `tenantKey` and `source` constraints that the HTTP controller enforces:

- request/response `tenantKey` and write `source` have `minLength: 1` and `maxLength: 120`;
- active manifest lookup query `tenantKey` has `minLength: 1` and `maxLength: 120`;
- descriptions mention trim behavior and blank-string rejection.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
node --input-type=module <OpenAPI tenantKey/source min-max smoke>
```

Result: route/OpenAPI parity 2 passed; API build passed; OpenAPI smoke confirmed create/response/query `tenantKey` and create/response `source` expose `minLength: 1` and `maxLength: 120`.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

For schema-only OpenAPI changes, use route/OpenAPI parity plus API build, and add a direct generated-document smoke when the change is about schema shape rather than route presence.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this OpenAPI constraints alignment.

## 2026-06-13 19:24 BRT — HTTP manifest source normalization locked

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.controller.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.

AppManifest HTTP write now trims explicit `source` at the controller schema boundary and rejects whitespace-only `source` before service calls. This keeps manifest provenance useful and avoids blank source strings in `ProjectAppManifest` rows.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused controller test 20 passed; integrated API AppManifest/scaffold/generation gate 49 passed; API build passed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

`tenantKey` and `source` are now normalized at the HTTP boundary. Prefer moving to another AppManifest contract gap instead of adding more scalar trim-only tests unless a new runtime input is introduced.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this HTTP source normalization.

## 2026-06-13 19:19 BRT — HTTP tenantKey normalization locked

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.controller.ts`.

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.

AppManifest HTTP read/write now trims explicit `tenantKey` at the controller schema boundary and rejects whitespace-only `tenantKey` before service calls. This prevents accidental writes/reads falling through to the `default` tenant when a caller sends a blank tenant key.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused controller test 18 passed; integrated API AppManifest/scaffold/generation gate 47 passed; API build passed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Because this touched controller runtime code, `npm run build:api` was required and passed. Continue reserving API builds for runtime/API source edits rather than test-only slices.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this HTTP tenantKey normalization.

## 2026-06-13 19:13 BRT — Non-concurrent manifest write failures do not retry

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.

No runtime code changed in this slice.

Added service regression coverage proving `createProjectAppManifest()` does not retry non-concurrent Prisma write failures such as `P2003`; this prevents the retry loop from hiding real integrity/project-scope errors behind repeated work.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 10 passed; integrated API AppManifest/scaffold/generation gate 43 passed.

Build intentionally not repeated because this was a test-only service contract slice.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Retry guard tests are now covering both positive and negative retry paths; continue with focused service first plus integrated AppManifest/scaffold/generation gate, but avoid adding more retry-only tests unless runtime behavior changes.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this non-concurrent failure regression.

## 2026-06-13 19:08 BRT — Serializable manifest write retry covered

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.

No runtime code changed in this slice.

Added service regression coverage proving `createProjectAppManifest()` retries when Prisma aborts the serializable transaction boundary with `P2034`, not only when the inner create hits a scoped version collision.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 9 passed; integrated API AppManifest/scaffold/generation gate 42 passed.

Build intentionally not repeated because this was a test-only service contract slice.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Service-only retry/normalization tests remain sub-second; keep using the focused service gate first, then the integrated AppManifest/scaffold/generation gate before updating docs/Linear.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this retry regression.

## 2026-06-13 19:03 BRT — Active manifest tenant lookup normalization covered

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.

No runtime code changed in this slice.

Added service regression coverage proving `getActiveProjectAppManifest()` trims `tenantKey` before querying an active binding, while preserving explicit `environment` and `surface` scope.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 8 passed; integrated API AppManifest/scaffold/generation gate 41 passed.

Build intentionally not repeated because this was a test-only service contract slice.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

The established integrated API AppManifest/scaffold/generation gate is currently cheap enough for narrow service/controller test changes, so keep using it after focused AppManifest unit tests. Save API builds for runtime/API source edits.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this tenant lookup regression.

## 2026-06-13 18:13 BRT — SDK core AppManifest validator smoke still aligned

### Change

No code change in this slice.

Rebuilt `/Users/fayalabs/dev/fayz-sdk/packages/core` and ran a Node smoke against `packages/core/dist/index.js`.

Validated `validateManifest()` behavior for 7 cases:

- valid manifest has `0` problems;
- unsupported top-level `title` is rejected;
- unsupported surface `id`, `name`, `title` are rejected;
- unsupported page `id`, `title` are rejected;
- unsupported plugin `pluginId`, `title`, `label` are rejected;
- duplicate page paths/plugin ids are detected after trim normalization;
- `backend.provider = "custom"` without `adapterId` is rejected.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core build
node --input-type=module <validateManifest smoke>
```

Result: `@fayz-ai/core` build passed; smoke checked 7 cases successfully.

Known non-blocking warning: `.npmrc` still references missing `${NODE_AUTH_TOKEN}` while reading config.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant SDK build or test process. The build did not add `dist` git churn.

### Self-improvement

`@fayz-ai/core` currently has no package-local test script/runner. Do not add a new test runner opportunistically inside a heartbeat; first choose a repo-wide test standard.

Avoid fragile `xargs sh -c node -e ...` quoting for package-script inventory; use direct `node` scripts or `jq` when available.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this SDK validator smoke.

## 2026-06-13 18:08 BRT — AppManifest route guard coverage locked

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/__tests__/project-route-guard.test.ts`.

No runtime code changed in this slice.

Added a specific guardrail asserting the Fayz SDK AppManifest project routes do not appear in the unguarded project route inventory:

- `GET /api/projects/{}/app-manifests/active`;
- `POST /api/projects/{}/app-manifests`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/project-route-guard.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: project-access guard ratchet 2 passed; route/OpenAPI parity 2 passed.

Build intentionally not repeated because this was a test-only security/docs contract slice.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

`project-route-guard` and route/OpenAPI parity both import the app. Keep them serialized, not parallel, to avoid redundant app boot work and noisy timing.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this route guard coverage.

## 2026-06-13 18:04 BRT — Beauty agenda paid booking proof still live

### Change

No code change in this slice.

Browser-verified `http://127.0.0.1:5180/#/agenda` without creating, editing, deleting, or cancelling bookings.

Agenda loaded with the existing proof booking `TESTE-CODEX Agenda`.

Opening the booking popover confirmed:

- service `Corte de cabelo`;
- time `sábado, 13 de junho · 09:00 – 09:25`;
- staff/location `Mano Capurro` / `Barra da Tijuca`;
- payment/status `R$ 120,00 · Pago` and `Confirmed`.

### Verification passed

Browser DOM proof via Codex browser against Beauty Vite on `127.0.0.1:5180`.

### Runtime check

No app terminal session was attached for log reading. Process snapshot showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.

### Self-improvement

Page-level agenda text shows the booking but not all financial/status detail. Open the booking popover before asserting `Pago` or `Confirmed`; do not count missing page-level payment text as a product regression.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this Beauty proof refresh.

## 2026-06-13 17:58 BRT — API active-manifest read contract covered

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.

No runtime code changed in this slice.

Added controller coverage for `GET /projects/:projectId/app-manifests/active` behavior:

- viewer authorization is required before returning an active binding;
- tenant/environment/surface query scope is passed to the active resolver;
- missing active binding returns `404` with `{ error: 'active manifest not found' }`;
- empty query keeps undefined scope for service-side default normalization.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused controller test 14 passed; integrated API AppManifest/scaffold/generation gate 40 passed.

Build intentionally not repeated because this was a test-only controller contract slice; last API build passed earlier in the FAY-1178 cleanup sequence.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Long-lived Codex/browser MCP daemons remain idle at 0% CPU and Beauty Vite on port `5180` remains the only expected product dev server.

### Self-improvement

After a test-only API coverage slice, prefer the focused test plus the established integrated AppManifest/scaffold/generation gate. Save `npm run build:api` for runtime/API source changes or broader schema/doc edits.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this API read contract coverage.

## 2026-06-13 17:53 BRT — Web AppManifest API adapter contract covered

### Change

Added `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/services/api/app-manifests.test.ts`.

No runtime code changed in this slice.

New coverage locks the frontend AppManifest API adapter contract:

- default active lookup sends `surface=panel`, `environment=preview`, `tenantKey=default`;
- custom tenant/environment/surface params are preserved and URL-encoded;
- 404 returns `null` for the Panel empty state;
- non-404 API errors are rethrown.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Result: focused adapter test 4 passed; adapter + Panel renderer gate 12 passed.

Build intentionally not repeated because this was a test-only file; last web build passed at 17:50 BRT after the runtime renderer hardening.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Long-lived Codex/browser MCP daemons remain idle at 0% CPU and Beauty Vite on port `5180` remains the only expected product dev server.

### Self-improvement

First adapter-test run failed because the new test used one too many `../` segments (`../../../../services/...`). For tests under `src/__tests__/services/api`, the correct relative import root back to `src` is `../../../`.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this adapter coverage.

## 2026-06-13 17:50 BRT — Panel renderer guards blank app/surface titles

### Change

Updated `/Users/fayalabs/dev/fayz/apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`.

Updated `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx`.

Panel renderer now normalizes `manifest.name` and `binding.surface` before rendering the manifest summary title area. Blank/corrupt app names fall back to `Manifest app`; blank binding surface labels fall back to the requested surface id.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build -w @wowsome/web
```

Result: Panel renderer test 8 passed; web build passed.

Known non-blocking warnings: existing Tailwind ambiguous classes, unresolved runtime font path, dynamic import/static import chunk warning, and large chunk warnings.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process. Long-lived Codex/browser MCP daemons are idle at 0% CPU and should be treated as tool infrastructure, not product server health. Beauty Vite on port `5180` remains the only expected product dev server.

### Self-improvement

Process hygiene checks should distinguish idle Codex/browser daemons from stuck test/build commands. Do not start a new browser MCP just to verify a small renderer unit change; reuse browser tooling only when there is a real DOM/product proof to capture.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this title fallback hardening.

## 2026-06-13 17:45 BRT — Panel renderer handles blank optional display fields

### Change

Updated `/Users/fayalabs/dev/fayz/apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`.

Updated `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx`.

Panel renderer now normalizes optional page/plugin display strings before rendering list cards:

- blank `pages[].label` falls back to non-empty `pages[].path`, then `Page n`;
- blank page `path`, `entity`, and `component` do not create blank descriptions;
- blank `plugins[].config.label` falls back to non-empty `plugins[].id`, then `Plugin n`;
- blank plugin `id` falls back to `manifest plugin ref` in the description.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build -w @wowsome/web
```

Result: Panel renderer test 8 passed; web build passed.

Known non-blocking warnings: existing Tailwind ambiguous classes, unresolved runtime font path, dynamic import/static import chunk warning, and large chunk warnings.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process; Beauty Vite on port `5180` remains the only expected product dev server.

### Self-improvement

`ManifestSurfaceSection` files are still untracked in this branch, so `git diff -- <file>` does not show new hunks. Use `git status --short` and direct reads for newly added files.

When a renderer intentionally shows the same fallback text as title and description, use `getAllByText` in RTL tests. A first assertion with `getByText('analytics')` failed on duplicate matches before the successful retry.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this Panel fallback cleanup.

## 2026-06-13 17:39 BRT — Route/OpenAPI parity still green

### Change

No code change in this slice.

Re-ran route/OpenAPI parity after the service row-domain regression coverage to keep docs/schema routing checks green.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: route/OpenAPI parity 2 passed in ~5.2s.

### Runtime check

No app terminal session was attached for log reading. Process snapshot showed no stuck/redundant test or build process; Beauty Vite on port `5180` remains the only expected product dev server.

### Self-improvement

Route/OpenAPI parity is slower than the tiny AppManifest unit gates. Keep it in integrated/revalidation checkpoints, not every tiny code-edit heartbeat.

### Linear

Not updated for this no-code revalidation to avoid checkpoint noise.

## 2026-06-13 17:35 BRT — AppManifest service rejects corrupt DB domain rows

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.

No runtime code changed in this slice.

Added regression coverage proving the AppManifest service rejects corrupt DB rows whose persisted domain values are outside the locked contract:

- invalid `environment`, for example `staging`;
- invalid `surface`, for example `mobile`;
- invalid `status`, for example `published`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 7 passed; integrated API AppManifest/scaffold/generation gate 38 passed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot showed no stuck/redundant test or build process; Beauty Vite on port `5180` remains the only expected product dev server.

### Self-improvement

`apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts` is still untracked in this branch, so `git diff -- <file>` does not show this new hunk. Use `git status --short` and direct file reads for newly added tests unless/until staged.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this service row-domain regression.

## 2026-06-13 17:29 BRT — Fayz scaffold manifest validates against SDK core

### Change

No code change in this slice.

Rebuilt `@fayz-ai/core` and validated Fayz generated-project template `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/app.manifest.json` with the real SDK `validateManifest()` from `/Users/fayalabs/dev/fayz-sdk/packages/core/dist/index.js`.

Result: `problemCount: 0`; the generated scaffold manifest remains SDK-valid while `@fayz-ai/app-runtime` package-source is intentionally deferred.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core build
node --input-type=module <validate Fayz scaffold app.manifest.json with SDK validateManifest>
```

Known `.npmrc` `${NODE_AUTH_TOKEN}` warning remains non-blocking.

### Runtime check

No app terminal session was attached for log reading. Process snapshot showed no stuck/redundant test or build process; Beauty Vite on port `5180` remains the only expected product dev server.

### Self-improvement

This cross-repo smoke is a cheap way to catch scaffold/schema drift without installing unpublished runtime packages. It did not add `packages/core/dist` git churn in this run.

### Linear

Not updated for this no-code smoke to avoid checkpoint noise.

## 2026-06-13 17:27 BRT — Beauty agenda lookup smoke clears old B1/B2 risk

### Change

No code change in this slice.

Opened the agenda create modal and tested lookups without saving anything.

- Client lookup returned existing `TESTE` options plus the quick-create row.
- Service lookup returned `Corte de cabelo` for `Corte`.
- Reloaded `#/agenda` after the probe to clear typed modal state.

The older Beauty backlog items B1/B2 ("client search never queries/results" and "service search inert") do not reproduce in the current app.

### Verification passed

Browser proof only; no files changed outside docs.

### Runtime check

Browser console check during the lookup probe returned no new warning/error logs.

### Self-improvement

Service lookup placeholder is `Buscar serviço para adicionar...`, not `Buscar serviço...`; use the actual placeholder from the accessibility snapshot before filling fields.

### Linear

Not updated for this no-code smoke to avoid checkpoint noise.

## 2026-06-13 17:25 BRT — Beauty agenda paid booking proof still green

### Change

No code change in this slice.

Reloaded `http://127.0.0.1:5180/#/agenda`, waited for agenda data, and opened the exact `TESTE-CODEX Agenda` booking once.

DOM/snapshot proof confirmed:

- booking `TESTE-CODEX Agenda`;
- service `Corte de cabelo`;
- time `09:00 – 09:25`;
- staff/location `Mano Capurro` / `Barra da Tijuca`;
- payment/status buttons `R$ 120,00 · Pago` and `Confirmed`;
- actions `Editar` and `Excluir`.

### Verification passed

Browser proof only; no files changed outside docs.

### Runtime check

No app terminal session was attached for log reading. Process snapshot showed no stuck/redundant test or build process; Beauty Vite on port `5180` remains the only expected product dev server.

Browser console check after reload returned no new warning/error logs.

### Self-improvement

Beauty payment strings can contain non-breaking spaces (`R$ 120,00`). Normalize whitespace or use the accessibility snapshot line/button label (`R$ 120,00 · Pago`) to avoid false-negative DOM text checks.

### Linear

Not updated for this no-code proof to avoid checkpoint noise.

## 2026-06-13 17:17 BRT — SDK core validator smoke confirms legacy-field rejection

### Change

No code change in this slice.

Rebuilt `@fayz-ai/core` and ran a Node smoke against `validateManifest()` from `packages/core/dist/index.js`.

The smoke asserted the SDK validator rejects all documented legacy/non-v2 display fields:

- top-level `title`;
- `surfaces.*.id`, `surfaces.*.name`, `surfaces.*.title`;
- page `id`, page `title`;
- plugin `pluginId`, plugin `title`, plugin `label`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core build
node --input-type=module <validateManifest legacy-field smoke>
```

Result: core build passed; smoke checked 9 expected validator problems and found all 9. Known `.npmrc` `${NODE_AUTH_TOKEN}` warning remains non-blocking.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process; Beauty Vite remains the only expected product dev server.

### Self-improvement

Rebuilding `@fayz-ai/core` did not add `packages/core/dist` git churn in this run. For no-code validator checks, prefer build + Node smoke over adding package-level test infra during heartbeat loops.

### Linear

Not updated for this no-code SDK validation to avoid checkpoint noise.

## 2026-06-13 17:12 BRT — AppManifest controller rejects all documented legacy display fields

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.

No runtime code changed in this slice.

Expanded the existing unsupported-field rejection case to explicitly cover the same legacy/non-v2 display fields now documented for agents:

- `surfaces.*.id`;
- `surfaces.*.name`;
- page `id`;
- plugin `label`.

Existing coverage already rejected top-level `title`, `surfaces.*.title`, page `title`, plugin `pluginId`, and plugin `title`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: controller test 12 passed; integrated API AppManifest/scaffold/generation gate 35 passed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process; Beauty Vite remains the only expected product dev server.

### Self-improvement

`apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts` is still untracked in this branch, so `git diff -- <file>` does not show the hunk. Use `git status --short` for these newly added test files unless/until they are staged.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this controller regression coverage.

## 2026-06-13 17:08 BRT — Agent guidance locked to canonical AppManifest display fields

### Change

Updated agent-facing guidance so coding agents do not write manifests the API/runtime will reject.

Files:

- `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`;
- `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`;
- `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

The guides now explicitly reject legacy/non-v2 display fields:

- top-level `title`;
- `surfaces.*.id`, `surfaces.*.name`, `surfaces.*.title`;
- page `id`, page `title`;
- plugin `pluginId`, plugin `title`, plugin `label`.

Canonical guidance now says:

- page display text belongs in `pages[].label`;
- plugin display/config metadata belongs in `plugins[].config`, such as `config.label`;
- surface display/config metadata belongs in `surfaces.*.options`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: scaffold test 7 passed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process; Beauty Vite remains the only expected product dev server.

### Self-improvement

When searching docs/tests for strings that contain Markdown backticks, use `rg -F` with single-quoted patterns. A double-quoted `rg` pattern containing backticks triggered zsh command substitution noise before the successful retry.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this agent-guidance lock.

## 2026-06-13 17:02 BRT — OpenAPI AppManifest descriptions teach canonical display fields

### Change

Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/schemas/projects.ts` descriptions only.

The generated OpenAPI schema now explicitly teaches canonical display metadata placement:

- app display name: `manifest.name`;
- surface display metadata: `surfaces.*.options`;
- page display text: `pages[].label`;
- plugin display/config metadata: `plugins[].config`, for example `config.label`.

It also explicitly warns against legacy/non-v2 fields: page `id/title`, plugin `pluginId/title/label`, and surface `id/name/title`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: route/OpenAPI parity 2 passed; API build passed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process; Beauty Vite remains the only expected product dev server.

### Self-improvement

This was a schema-description-only change. Do not update Linear for this micro-slice; keep it covered by the 16:59 BRT `FAY-1178` checkpoint unless behavior or tests change.

### Linear

Not updated to avoid checkpoint noise.

## 2026-06-13 16:59 BRT — Panel renderer now follows canonical AppManifest v2 display fields

### Change

Tightened Fayz web `ManifestSurfaceSection` and its API client types so the Panel renderer no longer teaches forbidden AppManifest v2 fields.

Canonical display mapping now uses:

- app title from `manifest.name`;
- surface title from `surfaces.*.options.title`;
- page label from `pages[].label`;
- plugin display label from `plugins[].config.label`, falling back to `plugins[].id`.

Removed read/display fallback for forbidden new-write fields: top-level `title`, `surfaces.*.title`, `pages[].id`, `pages[].title`, `plugins[].pluginId`, `plugins[].title`, and `plugins[].label`.

Kept narrow legacy array-surface resolution only for old read compatibility (`surface.id/name`), without using it as the canonical write/display contract.

Files:

- `/Users/fayalabs/dev/fayz/apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`;
- `/Users/fayalabs/dev/fayz/apps/web/src/services/api/app-manifests.ts`;
- `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build -w @wowsome/web
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: web Panel renderer 7 passed; web build passed; API AppManifest/scaffold/generation gate 34 passed; route/OpenAPI parity 2 passed.

Known non-blocking warnings: web build still emits existing Tailwind ambiguous class warnings, unresolved runtime font path, dynamic import/static import chunk warning, and large chunk warnings.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process; Beauty Vite remains the only expected product dev server.

### Self-improvement

`@wowsome/web` has no `typecheck` script. Do not run `npm run typecheck -w @wowsome/web`; use `npm run build -w @wowsome/web` because it runs `tsc -b && vite build`.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this canonical Panel renderer cleanup.

## 2026-06-13 16:53 BRT — Integrated AppManifest/Panel gate still green

### Change

No code change in this slice. Revalidated the focused `FAY-1178` AppManifest/Panel/scaffold gates after the SDK auth singleton hardening and Beauty Supabase client cleanup.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: API AppManifest/scaffold/generation gate 34 passed; web Panel renderer gate 7 passed; route/OpenAPI parity 2 passed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot after the gate showed no stuck/redundant test or build process; Beauty Vite remains the only expected product dev server.

### Self-improvement

This gate can run as three parallel focused commands to reduce wall time. Keep the route/OpenAPI parity command in integrated checkpoints; it is the slowest slice at about 5.6s and is redundant for tiny no-code heartbeats.

### Linear

Not updated for this no-code revalidation to avoid checkpoint noise.

## 2026-06-13 16:46 BRT — Auth singleton config type narrowed

### Change

Narrowed the injected `@fayz-ai/auth` Supabase client type from `unknown` to `SupabaseClient`.

This keeps the 16:42 BRT singleton fix intact while removing an unnecessarily broad public config escape hatch.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/auth typecheck
pnpm --filter @fayz-ai/auth build
pnpm --filter @fayz-ai/saas typecheck
pnpm --filter @fayz-ai/saas build
```

Result: all passed. Known `.npmrc` `${NODE_AUTH_TOKEN}` warning remains non-blocking.

### Self-improvement

There is no package-level test runner in `packages/auth` or `packages/saas` yet. Do not add test infra in heartbeat loops; use focused typecheck/build unless a real regression test surface already exists.

### Linear

Not updated for this micro-hardening; it is covered by the 16:42 BRT `FAY-1178` checkpoint.

## 2026-06-13 16:42 BRT — SDK auth reuses Supabase singleton in createFayzApp

### Change

Closed the structural version of the Beauty duplicate-GoTrue-client warning:

- `@fayz-ai/auth` `createSupabaseAuthAdapter()` can now receive an already-initialized Supabase client.
- `@fayz-ai/saas` `createFayzApp` passes the SDK Supabase singleton into `@fayz-ai/auth`, instead of letting the auth adapter create a second browser client.

Files:

- `/Users/fayalabs/dev/fayz-sdk/packages/auth/src/adapters/supabase.ts`;
- `/Users/fayalabs/dev/fayz-sdk/packages/saas/src/app/createFayzApp.tsx`.

### Why

Beauty needed an app-level bridge to stop multiple Supabase GoTrue clients in one browser context. This SDK fix prevents the same warning/noise in SDK apps that use the `createFayzApp` path.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/auth typecheck
pnpm --filter @fayz-ai/auth build
pnpm --filter @fayz-ai/saas typecheck
pnpm --filter @fayz-ai/saas build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
npm run build
```

Result: all passed. Known non-blocking warnings remain: SDK `.npmrc` `${NODE_AUTH_TOKEN}` and Beauty/Vite chunk/dynamic-import warnings.

Browser DOM/log proof after reload:

- `TESTE-CODEX Agenda` remains visible on `http://127.0.0.1:5180/#/agenda`;
- service/time/staff/location still render: `Corte de cabelo`, `09:00 – 09:25`, `Mano Capurro`, `Barra da Tijuca`;
- no new warning/error logs after reload.

### Self-improvement

When using the persistent Browser/Node REPL, use `var` or unique names for repeated proof variables. A reused `const proof` caused a false tool error before the successful retry.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this SDK auth singleton cleanup.

## 2026-06-13 16:35 BRT — Scaffold gate still green

### Change

No code change in this slice. Revalidated the cheap generated-project scaffold gate after the Beauty singleton cleanup and the public `fayz-api` AGENTS guardrail regression.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: scaffold test 6 passed in 430ms.

### Runtime check

No app terminal session was attached for log reading. Process snapshot showed no stuck/redundant test or build command; Beauty Vite remains the only expected product dev server.

### Linear

Not updated for this no-code revalidation to avoid checkpoint noise.

## 2026-06-13 16:33 BRT — Beauty agenda proof green after Supabase singleton cleanup

### Change

Updated `/Users/fayalabs/dev/fayz-app/beauty-saas/src/integrations/supabase/client.ts`.

The local Beauty `supabase` export now reuses the Fayz SDK `@fayz-ai/saas` Supabase singleton instead of creating a second browser client before `createSaasApp` runs.

### Why

Browser log check during the agenda proof showed Supabase's warning about multiple `GoTrueClient` instances using the same storage key. It was not blocking the UI, but it can create undefined auth behavior and noisy heartbeat checks.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
npm run build
```

Result: build passed. Existing Vite chunk/dynamic-import warnings remain; no new TypeScript errors.

Browser DOM proof after reload:

- no new warning/error logs after reload;
- `TESTE-CODEX Agenda` visible on `http://127.0.0.1:5180/#/agenda`;
- popover confirms Saturday, June 13, 2026, `09:00 – 09:25`;
- service `Corte de cabelo (25min)`;
- staff/location `Mano Capurro` / `Barra da Tijuca`;
- payment `R$ 120,00 · Pago`;
- status `Confirmed`;
- edit/delete actions present.

### Self-improvement

For Beauty agenda heartbeat checks, wait about 3 seconds after `domcontentloaded` before asserting booking text. The first DOM read can be too early and falsely report the booking missing.

### Linear

Updated the existing `FAY-1178` consolidated checkpoint comment with this Beauty demo stability note.

## 2026-06-13 16:25 BRT — Scaffold test locks public fayz-api guardrail

### Change

Added a regression test to `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

The generated `AGENTS.md` is now tested for the public `fayz-api` runtime safety contract:

- use `createFayzApiProvider({ runtimeToken })`;
- mention the Runtime Session Broker / server-side exchange;
- do not claim production readiness for public generated apps while `FAY-1182` is pending;
- never put partner `ApiToken`, raw Fayz secrets, or caller-provided tenant authority in browser code.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: scaffold test 6 passed.

### Runtime check

No app terminal session was attached for log reading. Process snapshot showed no stuck/redundant test or build command; only the expected Beauty Vite server and Codex/browser tooling were active.

### Linear

Updated the existing `FAY-1182` guardrail checkpoint comment with this regression coverage.

## 2026-06-13 16:14 BRT — Agent guardrail for public fayz-api runtime

### Change

Updated agent-facing guidance so agents do not overstate the public `fayz-api` runtime state:

- `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`;
- Fayz generated project template `apps/api/src/modules/projects/scaffold/template/AGENTS.md`.

Both now explicitly say public generated apps must not claim production readiness on `backend.provider = "fayz-api"` until the Runtime Session Broker / server-side exchange is approved and enabled.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: scaffold test 5 passed.

### Linear

Updated `FAY-1182` with this agent guardrail checkpoint.

## 2026-06-13 16:10 BRT — Beauty agenda paid booking DOM proof still green

### Change

No code change in this slice. Revalidated the Beauty agenda demo proof without mutating booking data.

### Proof

In-app browser target:

```text
http://127.0.0.1:5180/#/agenda
```

DOM proof:

- `TESTE-CODEX Agenda` visible on Saturday, June 13, 2026 at `09:00 – 09:25`;
- service: `Corte de cabelo (25min)`;
- staff/location: `Mano Capurro` / `Barra da Tijuca`;
- payment: `Total R$ 120,00 · Pago`;
- edit/action affordance still present.

### Self-improvement

The in-app Browser screenshot path timed out on `Page.captureScreenshot`, matching the earlier known screenshot instability. For heartbeat proof loops, prefer DOM proof first; only spend time on screenshots when acceptance specifically requires image evidence.

## 2026-06-13 16:04 BRT — AppManifest/Panel gates still green

### Change

No code change in this slice. Revalidated the focused contract that remains unblocked while `FAY-1182` waits for architecture approval.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result:

- API AppManifest/scaffold/generation gate: 5 files passed, 33 tests passed;
- web Panel renderer gate: 1 file passed, 7 tests passed;
- route/OpenAPI parity: 1 file passed, 2 tests passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment with this stability revalidation.

## 2026-06-13 16:00 BRT — FAY-1182 runtime session decision note

### Change

Added `/Users/fayalabs/dev/fayz-sdk/docs/discovery/18-fay-1182-runtime-session-decision.md`.

The note documents:

- current runtime-token ground truth;
- the remaining production generated-app session/token blocker;
- recommended default: Fayz-hosted Runtime Session Broker;
- alternatives: external BFF, direct Supabase/RLS runtime, and rejected browser-minted/secret-in-browser flow;
- minimum acceptance gates before public `backend.provider = "fayz-api"` is production-ready.

### Blocker

Vini architecture approval is needed before implementing the production public generated-app exchange. Editor/preview token issuance remains green.

### Linear

Updated `FAY-1182` with the decision note and approval request.

## 2026-06-13 15:55 BRT — Entity definitions must be objects

### Change

Closed another AppManifest contract drift:

- canonical JSON Schema and OpenAPI already document `entities` as an array of objects;
- SDK `validateManifest` now rejects scalar entries in `entities[]`;
- Fayz API AppManifest writes now reject scalar entity definitions before DB writes;
- scaffold seed filters non-object entity entries before internal `ProjectAppManifest` writes.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module -e 'import { validateManifest } from "./packages/core/dist/index.js"; /* entity item validation smoke */'
```

Result:

- controller + seed tests: 2 files passed, 23 tests passed;
- API build passed;
- API AppManifest/scaffold/generation gate: 5 files passed, 33 tests passed;
- SDK core typecheck/build/smoke passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment with this entity-definition cleanup.

## 2026-06-13 15:49 BRT — Renderer and permission strings aligned in canonical schema

### Change

Closed a schema-only drift in `app-manifest.schema.json`:

- page `entity` now has `minLength: 1`;
- page `component` now has `minLength: 1`;
- page permission `feature` and `action` now have `minLength: 1`;
- this matches the existing SDK `validateManifest`, Fayz API write validation, and OpenAPI docs.

No Fayz API behavior changed in this slice.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module -e 'import fs from "node:fs"; import { validateManifest } from "./packages/core/dist/index.js"; /* schema minLength + validateManifest smoke */'
```

Result:

- SDK core typecheck passed;
- SDK core build passed;
- smoke confirmed JSON Schema `minLength` and runtime validation for empty page renderer / permission strings.

### Linear

Updated the existing `FAY-1178` checkpoint comment with this schema-only cleanup.

## 2026-06-13 15:45 BRT — Backend refs now match AppManifest schema

### Change

Closed another AppManifest contract drift across SDK/API/docs:

- `backend.projectRef`, `backend.url`, and optional non-custom `backend.adapterId` now must be non-empty strings when present;
- canonical JSON Schema and OpenAPI docs now expose those fields as `minLength: 1`;
- SDK `validateManifest` catches invalid backend refs before generated apps send manifests to Fayz API;
- Fayz API AppManifest writes reject invalid backend ref values before DB writes;
- scaffold seed remains tolerant by trimming valid strings and dropping invalid/empty optional backend refs.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module -e 'import { validateManifest } from "./packages/core/dist/index.js"; /* backend optional string smoke */'
```

Result:

- controller + seed tests: 2 files passed, 22 tests passed;
- route/OpenAPI parity: 1 file passed, 2 tests passed;
- API build passed;
- API AppManifest/scaffold/generation gate: 5 files passed, 32 tests passed;
- SDK core typecheck/build/smoke passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment with this backend-ref cleanup.

### Self-improvement

Use single quotes around `node --input-type=module -e` scripts in `zsh`. A first smoke used double quotes around a template literal and emitted `bad substitution`; the safe single-quoted smoke passed cleanly.

## 2026-06-13 15:40 BRT — Scaffold test guards strict AppManifest template keys

### Change

Added a regression guard to the generated project scaffold test:

- template `app.manifest.json` top-level keys must stay inside strict AppManifest v2;
- surface keys must stay inside strict `SurfaceManifest`;
- manifest id must remain a valid slug;
- pages/plugins must stay arrays in generated surfaces.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result:

- scaffold test: 1 file passed, 5 tests passed;
- API AppManifest/scaffold/generation gate: 5 files passed, 32 tests passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment with this scaffold regression guard.

### Self-improvement

This was a test-only guard, so `build:api` was not rerun. Keep build mandatory for production TypeScript edits; test-only changes can stay on the relevant test gate plus focused integrated gate.

## 2026-06-13 15:36 BRT — OpenAPI documents AppManifest v2 JSON shape

### Change

Closed the API documentation drift created by stricter AppManifest validation:

- `ProjectAppManifest.manifestJson` and `CreateProjectAppManifest.manifestJson` are no longer documented as plain `record(unknown)`;
- OpenAPI now exposes structured `AppManifestJson`, `SurfaceManifest`, `PageManifest`, `PluginRef`, and `BlockManifest` schemas;
- docs include manifest id slug, backend provider/config shape, surface/page/plugin/block fields, and note API-enforced renderer uniqueness and unique page/plugin refs per surface.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result:

- Route/OpenAPI parity: 1 file passed, 2 tests passed;
- API build passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment with this OpenAPI docs cleanup.

### Self-improvement

The current OpenAPI generator rejects `z.lazy` recursive schemas. For recursive `BlockManifest.children`, document a non-recursive object node and keep recursive shape enforcement in the API validator.

## 2026-06-13 15:29 BRT — AppManifest/Panel integrated gate still green

### Change

No new code change in this slice. Revalidated the focused Panel/AppManifest contract after the schema-alignment microfixes.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Result:

- API AppManifest/scaffold/generation gate: 5 files passed, 32 tests passed;
- Web Panel renderer gate: 1 file passed, 7 tests passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment with this integrated gate.

### Self-improvement

After several tiny contract edits, switch from single-file gates to the focused integrated AppManifest/Panel gate before moving on. This catches cross-file drift without running the whole monorepo test suite.

## 2026-06-13 15:25 BRT — API rejects non-object surface options

### Change

Closed one more API/schema drift:

- SDK `validateManifest` already requires `surfaces.*.options` to be an object when present;
- scaffold seed only preserves surface options when they are objects;
- Fayz API AppManifest writes now reject non-object `surfaces.*.options`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result:

- Fayz API controller + seed tests: 2 files passed, 22 tests passed;
- Fayz API build passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment to include `surfaces.*.options` validation.

## 2026-06-13 15:21 BRT — API rejects AppManifest structured-value drift

### Change

Closed an API-only schema drift against SDK `validateManifest`:

- top-level `locale`, `theme`, `permissions`, and `billing` must be objects;
- `entities` must be an array;
- `backend.options` must be an object;
- page `label`/`icon` must be strings;
- page `section` must be `main`, `secondary`, or `settings`;
- page `entity`/`component` must be non-empty strings when present;
- plugin `config` must be an object and `enabled` must be boolean;
- block `id` must be a string and `props` must be an object.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result:

- Fayz API controller + seed tests: 2 files passed, 22 tests passed;
- Fayz API build passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment to include API structured-value validation.

### Self-improvement

The first `build:api` failed after tests passed because a new controller constant was missing from TypeScript scope. Keep `npm run build:api` as a required gate after API TypeScript edits; Vitest transpilation alone is not enough for these validator changes.

## 2026-06-13 15:16 BRT — AppManifest id slug schema enforced across SDK/API/seed

### Change

Closed another SDK/API schema drift:

- `app-manifest.schema.json` already required `manifest.id` to match `^[a-z0-9][a-z0-9-]*$`;
- `@fayz-ai/core validateManifest` now reports invalid manifest ids;
- Fayz API AppManifest writes now reject invalid manifest ids before DB writes;
- scaffold seed sanitizer now falls back invalid ids like `"Bad App"` to `generated-app`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module # imported packages/core/dist/index.js validateManifest and asserted invalid id message
```

Result:

- Fayz API controller + seed tests: 2 files passed, 21 tests passed;
- Fayz API build passed;
- SDK core typecheck/build/smoke passed.

### Linear

Updated the existing `FAY-1178` checkpoint comment to include manifest id slug enforcement.

### Self-improvement

Keep using schema-drift audits as the next narrow loop for `FAY-1178`: compare `app-manifest.schema.json`, SDK `validateManifest`, Fayz API validator, and scaffold seed sanitizer. This finds real contract bugs without reopening the broader runtime-token architecture blocker.

## 2026-06-13 15:10 BRT — SDK validateManifest matches backend duplicate semantics

### Change

Aligned `@fayz-ai/core` runtime manifest validation with Fayz API:

- duplicate page path detection now compares trimmed paths;
- duplicate plugin id detection now compares trimmed ids;
- SDK agents/apps now catch `"/clients"` plus `" /clients "` and `@fayz-ai/plugin-crm` plus `" @fayz-ai/plugin-crm "` before sending manifests to Fayz API.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module # imported packages/core/dist/index.js validateManifest and asserted normalized duplicate page/plugin messages
```

Result:

- core typecheck passed;
- core build passed;
- smoke printed expected duplicate page/plugin errors.

### Linear

Updated the existing `FAY-1178` checkpoint comment to include the SDK-side validator alignment.

### Self-improvement

pnpm still prints a non-blocking `.npmrc` warning because `${NODE_AUTH_TOKEN}` is not set. Do not treat it as a blocker unless install/publish starts failing; local typecheck/build completed.

## 2026-06-13 15:07 BRT — FAY-1178 controller rejects normalized duplicate manifest refs

### Change

Aligned the public AppManifest API with the scaffold seed sanitizer:

- duplicate page path detection now compares trimmed paths;
- duplicate plugin id detection now compares trimmed ids;
- `"/clients"` plus `" /clients "` now fails validation instead of producing two semantically identical refs.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result:

- controller + seed tests: 2 files passed, 19 tests passed;
- API build passed.

### Linear

Updated `FAY-1178` checkpoint comment to include this controller-side cleanup.

## 2026-06-13 15:05 BRT — FAY-1178 scaffold seed dedupes page/plugin collisions

### Change

Closed another internal seed strictness gap:

- controller validation already rejects duplicate page paths and duplicate plugin ids per surface;
- scaffold seed sanitizer now collapses duplicates before calling `ProjectAppManifest`;
- string normalization happens first, so `"/clients"` and `" /clients "` are treated as the same page path;
- first valid page/plugin wins, preserving deterministic generated manifests.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result:

- seed test: 1 file passed, 10 tests passed;
- API build passed.

### Linear

Updated `FAY-1178` with this checkpoint.

### Self-improvement

No stuck build/test process was running at the start of the cycle. The app terminal reader is unavailable in this heartbeat session (`No handler registered for tool: read_thread_terminal`), so use process inspection plus direct command output as the log fallback.

For this class of sanitizer-only change, keep the loop narrow: seed unit test first, then API build. Defer the broader AppManifest/scaffold/generation gate until shared manifest/controller/scaffold contracts change again or before PR handoff.

## 2026-06-13 14:45 BRT — FAY-1178 scaffold seed now sanitizes AppManifest v2

### Change

Closed a strictness gap in the generated-project seed path:

- the public AppManifest controller already rejected unsupported v2 fields;
- scaffold/generation seed could still pass a valid JSON manifest directly to `ProjectAppManifest`;
- `project-app-manifest.seed.ts` now normalizes manifests before internal writes.

Sanitization now:

- keeps only strict v2 top-level keys;
- normalizes unsafe/custom-without-adapter backend config back to `mock`;
- sanitizes surfaces, pages, plugins, permissions, and blocks;
- drops legacy `pluginId`, unsupported `title` fields, arbitrary extras, and pages with multiple renderers;
- still guarantees a safe `surfaces.panel` for Fayz Panel seed.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result:

- seed test: 1 file passed, 7 tests passed;
- AppManifest/scaffold/generation gate: 5 files passed, 25 tests passed;
- API build passed.

### Linear

Updated `FAY-1178` with this checkpoint.

### Follow-up cleanup

At 14:48 BRT, simplified the sanitizer internals:

- normalized strings are trimmed;
- backend/page/block sanitizer avoids repeated optional-string lookups;
- page permission is resolved once.

Verification after the cleanup:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: seed test passed; API build passed.

At 14:53 BRT, finished the trim-normalization coverage:

- backend `provider` and page `section` now use the same trimmed string normalization as other manifest string fields;
- added test coverage for whitespace around app id/name, custom backend adapter config, page fields, permission fields, and plugin id.

Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: seed test passed with 8 tests; API build passed.

At 14:58 BRT, aligned scaffold seed `manifestVersion` handling with the controller/SDK expectation:

- invalid integer versions such as `0` now default to `2` before internal `ProjectAppManifest` writes;
- added test coverage for the invalid-version fallback.

Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: seed test passed with 9 tests; API build passed.

## 2026-06-13 14:38 BRT — Route/OpenAPI parity still green

### Change

Ran a lightweight cleanup gate focused on the route docs after the AppManifest/Panel and runtime database route additions. No code change was needed.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: 1 file passed, 2 tests passed.

### Self-improvement

Do not re-run the full API build on every 5-minute heartbeat when the previous build is already green and the slice only checks docs parity. Prefer this narrow route-doc gate first, then run `npm run build:api` only after code changes or before handoff/PR.

## 2026-06-13 14:31 BRT — FAY-1178 AppManifest/Panel gate still green after runtime work

### Change

Rechecked the Panel/AppManifest foundation after the `FAY-1182` runtime-token work and Beauty agenda revalidation. No code change was needed in this slice.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Result:

- API AppManifest/scaffold/generation gate: 5 files passed, 24 tests passed.
- Web `ManifestSurfaceSection` renderer gate: 1 file passed, 7 tests passed.

### Linear

Updated `FAY-1178` with this checkpoint. Keep the issue open until the whole dirty Panel/API changeset is reviewed and either committed/PR'd or explicitly split.

## 2026-06-13 14:28 BRT — Beauty agenda lifecycle revalidation still green

### Change

Ran a narrow fallback heartbeat cycle after the FAY-1182 runtime/API work:

- inspected active docs and minimal git status for SDK, Fayz, and Beauty;
- checked running processes and found no stuck tests/builds;
- left the existing Beauty Vite server on `127.0.0.1:5180` running;
- did not mutate Beauty data.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

Result: TypeScript + Vite production build passed. Existing warnings only: dynamic-import/chunk-size warnings from the large SDK/plugin bundle.

Playwright/headless proof from `/Users/fayalabs/dev/fayz`:

- logged in as `teste@teste.com`;
- clicked the real `Agenda` navigation item;
- verified route `#/agenda`;
- verified FullCalendar rendered;
- verified paid demo booking `TESTE-CODEX Agenda` stayed visible;
- opened the paid booking popover and verified `Total R$ 120,00 · Pago`;
- verified `TESTE-CODEX Edit 11h02` stayed visible;
- verified destructive proof records stayed filtered/absent:
  - `TESTE-CODEX Delete 13:34`;
  - `TESTE-CODEX Cancel 13:38`.

Screenshots:

- `/Users/fayalabs/dev/fayz/beauty-agenda-current-proof-2026-06-13-1427.png`;
- `/Users/fayalabs/dev/fayz/beauty-agenda-paid-popover-proof-2026-06-13-1428.png`.

### Self-improvement

Do not navigate directly to `/#/agenda` immediately after login in Playwright; auth success can redirect back to `#/`. Log in on dashboard first, then click the `Agenda` navigation item. This avoids false proofs that accidentally inspect the dashboard route.

Removed the stale intermediate screenshot `/Users/fayalabs/dev/fayz/beauty-agenda-current-proof-2026-06-13-1424.png` because it captured the dashboard after auth redirect. Keep only the `1427` Agenda route screenshot and `1428` paid popover screenshot as evidence for this revalidation.

Supabase still emits the non-blocking "Multiple GoTrueClient instances" warning in Playwright. It is not blocking this proof, but keep it visible as a future SDK singleton cleanup candidate.

## 2026-06-13 14:20 BRT — FAY-1182 runtime route OpenAPI and schema-scope hardening

### Change

During OpenAPI cleanup, found and fixed a runtime-route scope hardening gap:

- runtime row routes now reject caller-provided `schema` query override;
- editor/admin row routes still allow schema override for database tooling;
- added OpenAPI docs for the editor/preview token issuer:
  - `POST /api/projects/:projectId/database/runtime-token`;
- added OpenAPI docs for runtime row list/create/update/delete:
  - `/api/v1/runtime/projects/:projectId/database/tables/:tableName/rows`;
- runtime docs explicitly state tenant/perms come from signed runtime-data Bearer token claims and caller filters/body cannot widen tenant scope.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/runtime-data-auth.test.ts src/modules/database/__tests__/runtime-data-token.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result:

- 20 runtime/controller tests passed.
- Route-doc parity passed.
- API build passed.

## 2026-06-13 14:16 BRT — Agent guidance updated for fayz-api runtime tokens

### Change

Updated SDK and generated-project agent guidance so future agents do not wire `fayz-api` insecurely:

- editor/admin data tooling uses `/api/projects/:projectId/database/...`;
- generated runtime apps use `createFayzApiProvider({ runtimeToken })`;
- runtime provider calls `/api/v1/runtime/projects/:projectId/database/...`;
- `runtimeToken` must be a short-lived runtime-data JWT minted by Fayz/server-side code;
- never embed partner `ApiToken`, raw Fayz secrets, or browser-provided tenant authority.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: 5 scaffold tests passed.

## 2026-06-13 14:15 BRT — FAY-1182 editor/preview runtime token issuer

### Change

Added the first trusted runtime-data token issuance path:

- `POST /api/projects/:projectId/database/runtime-token`;
- requires Fayz JWT authentication and project `EDITOR` role;
- accepts `tenantId`, optional `tenantIdColumn`, optional row permissions, and optional expiry;
- returns a short-lived runtime data Bearer token usable against `/api/v1/runtime/projects/:projectId/database/...`.

This is intentionally an editor/preview issuer, not a public customer-app issuer. It lets Fayz editor, tests, and controlled previews mint signed tenant/perms claims without embedding partner `ApiToken` or opening arbitrary public minting.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/database.service.test.ts src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/runtime-data-token.test.ts src/modules/database/__tests__/runtime-data-auth.test.ts
npm run build:api
```

Result:

- 44 targeted API database/runtime tests passed.
- API build passed.

### Remaining gap

Generated app end-user auth/session is still unresolved. Production needs a customer-user session or server-side exchange that can mint runtime data tokens without trusting browser-provided tenant ids.

## 2026-06-13 14:12 BRT — FAY-1182 runtime JWT route and SDK provider contract

### Change

Implemented the trusted runtime-auth foundation for Fayz API row data:

- did not reuse partner `ApiToken` for generated SPA runtime data because it is long-lived/org-scoped and unsafe to embed in browser code;
- added signed runtime-data JWT claims for:
  - `projectId`;
  - `tenantId`;
  - optional `tenantIdColumn`;
  - deny-by-default row permissions per entity/table;
- added runtime token verification with strict audience/token-use checks and short default expiry;
- added middleware that rejects route project mismatch and attaches trusted `req.runtimeData`;
- added versioned runtime row route:
  - `/api/v1/runtime/projects/:projectId/database/tables/:tableName/rows`;
- reused existing row handlers, now deriving tenant/perms from signed claims instead of caller filters/body;
- updated `@fayz-ai/core` `createFayzApiProvider()` with opt-in `runtimeToken`;
- when `runtimeToken` is present, the SDK:
  - uses the runtime route;
  - sends Bearer Authorization;
  - does not inject tenant filters/body defaults client-side;
  - skips tenant preflight reads before update/delete, letting the server permission/tenant scope enforce.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/database.service.test.ts src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/runtime-data-token.test.ts src/modules/database/__tests__/runtime-data-auth.test.ts
npm run build:api

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module <<'NODE'
// smoke createFayzApiProvider({ runtimeToken }) route/header/no-client-tenant-filter
NODE
```

Result:

- 43 targeted API database/runtime tests passed.
- API build passed.
- `@fayz-ai/core` typecheck/build passed.
- SDK runtime provider smoke passed.

### Remaining gap

Token issuance/refresh is still the production gap. Next implementation should add a trusted issuer path for generated apps; do not place partner `ApiToken` or raw Fayz secrets in browser code.

## 2026-06-13 14:05 BRT — FAY-1182 service-level tenant enforcement checkpoint

### Change

Implemented the first safe backend slice for server-side tenant enforcement on Fayz API database row operations:

- added `TenantRowScope` to the database service;
- tenant-scoped list appends trusted tenant filtering after caller filters;
- tenant-scoped create overrides caller-provided `tenant_id`;
- tenant-scoped update adds trusted tenant to `WHERE` and removes tenant-column mutation from `SET`;
- tenant-scoped delete adds trusted tenant to `WHERE` and ignores tenant ids supplied in row payloads;
- per-operation permissions are checked before DB lookup/query execution;
- editor/admin row tooling remains unscoped by default;
- HTTP `runtime`/`tenant` scope requests now fail closed with `403 Runtime data access requires trusted tenant context` until generated-runtime auth derives tenant server-side.

This is not the full runtime security contract yet. The important decision is deliberate: Fayz API now has the server-side enforcement surface, but it refuses runtime HTTP scope instead of trusting tenant headers/query/body from the caller.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/database.service.test.ts src/modules/database/__tests__/database.controller.test.ts
npm run build:api
```

Result:

- 37 targeted database tests passed.
- API build passed.

### Self-improvement

The full database service test file includes an existing 5s timeout test. For fast loops on FAY-1182, run the tenant-scoped test subset first, then run the full database test/build as the gate.

### Next

Define the trusted generated-runtime auth context that maps a runtime request to tenant/plugin/entity permissions without accepting caller-provided tenant ids as authority.

## 2026-06-13 12:35 BRT — FAY-1180 generation pipeline emits safe Panel AppManifest

### Change

Implemented the next generation-pipeline slice after the useful Panel proof:

- scaffold `app.manifest.json` now starts with a safe `surfaces.panel.options` contract:
  - `title`;
  - `description`;
  - `metrics: []`;
  - `actions: []`;
- `seedProjectPanelManifestFromScaffold()` now creates a safe minimal Panel manifest when generation cannot infer one:
  - missing manifest file falls back to `generated-app`;
  - invalid JSON returns `null` from parse and falls back safely;
  - missing `surfaces.panel` gets a valid `panel` surface instead of skipping the DB binding;
- programmatic `/api/v1/generations` kickoff now calls `seedProjectPanelManifestFromScaffold(project.id, baseFiles)` alongside base file creation.

This means both interactive project creation and programmatic generation now activate a Panel manifest binding from the scaffold/fallback path.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
node --input-type=module <<'NODE'
// validate scaffold app.manifest.json with @fayz-ai/core validateManifest()
NODE
```

Result:

- 12 targeted API tests passed.
- API build passed.
- SDK `validateManifest()` returned `{ valid: true, problems: [] }` for scaffold `app.manifest.json`.

### Next

Close `FAY-1180` in Linear and inspect `FAY-1181` before the next implementation slice.

## 2026-06-13 12:27 BRT — FAY-1179 closed with Playwright screenshot proof

### Change

Closed Linear `FAY-1179` as `Done`.

The in-app Browser CDP screenshot path still times out, but the proof was captured with Playwright/headless and saved locally:

- full PNG: `/Users/fayalabs/dev/fayz/fay-1179-panel-useful-proof-2026-06-13-1221.png`;
- compressed JPG: `/Users/fayalabs/dev/fayz/fay-1179-panel-useful-proof-2026-06-13-1221.jpg`;
- Linear-sized JPG attempt: `/Users/fayalabs/dev/fayz/fay-1179-panel-useful-proof-2026-06-13-1221-linear-small.jpg`.

Screenshot page:

```text
http://localhost:5173/editor/ede4a8e6-3869-458d-a908-2a5062fbe7aa?view=dashboard
```

Proof details:

- page title: `Churrascaria Rodízio Texas - Fayz.ai`;
- console: `0 errors`, `3 warnings`;
- manifest content visible: `Operação do Rodízio`, `Reservas hoje`, `42`, `Ocupação`, `76%`, `Ticket médio`, `R$ 148`, `Revisar reservas`, `Ajustar salão`;
- host controls visible: `Visão Geral`, `Dados`, `Armazenamento`.

Linear attachment upload failed with `Invalid base64 content provided`; this is an attachment tooling issue, not a renderer/proof blocker. Local screenshot files and docs are the evidence source of truth.

### Cleanup and logs

After proof:

- Fayz API/Web dev servers were stopped.
- Browser/Playwright Fayz tab was navigated to `about:blank`.
- Preview container `fayz.ai-preview-ede4a8e6` was explicitly stopped.
- Process check showed no Fayz dev server or preview container left running; only the unrelated Beauty Vite server on port `5180` remained active.

Log self-improvement:

- Opening the editor dashboard starts/syncs the preview container even for Panel manifest proof.
- Health polling is noisy while the preview warms up: roughly every 1.3s until healthy, then roughly every 5s.
- Future proof runs should always close/navigate away from editor pages and stop the preview container after capturing evidence.

### Next

Start `FAY-1180`: turn the useful Panel proof into a generated app/scaffold contract without adding unpublished `@fayz-ai/app-runtime` as a hard dependency.

## 2026-06-13 12:18 BRT — FAY-1179 useful Panel proof renders from manifest data

### Change

Updated Fayz Web `ManifestSurfaceSection` so a generated/client-specific Panel can show useful operational content from the active manifest:

- `surfaces.panel.options.title`;
- `surfaces.panel.options.description`;
- `surfaces.panel.options.metrics[]`;
- `surfaces.panel.options.actions[]`.

This keeps the split explicit:

- manifest owns product/client-specific pages, plugins, summary metrics, and actions;
- Fayz host still owns editor dashboard navigation and core sections like `Visão Geral`, `Dados`, and `Armazenamento`.

### Proof Data

Created active Panel manifest binding for project `ede4a8e6-3869-458d-a908-2a5062fbe7aa`:

- binding id: `432d2028-3c59-41c0-8332-72e2b394ad99`;
- source: `fay-1179-useful-panel-proof`;
- scope: `tenantKey=default`, `environment=preview`, `surface=panel`;
- status: `active`;
- version: `2`;
- manifest id: `texas-rodizio-panel`;
- app name: `Churrascaria Rodízio Texas`.

Panel content used in proof:

- title: `Operação do Rodízio`;
- metrics: `Reservas hoje=42`, `Ocupação=76%`, `Ticket médio=R$ 148`;
- actions: `Revisar reservas`, `Ajustar salão`;
- pages: `Reservas`, `Mesas`, `Cardápio`;
- plugins: `@fayz-ai/plugin-agenda`, `@fayz-ai/plugin-crm`.

### Browser Proof

In-app Browser DOM proof passed at:

```text
http://localhost:5173/editor/ede4a8e6-3869-458d-a908-2a5062fbe7aa?view=dashboard
```

Visible text counts included:

- `Operação do Rodízio`: 1;
- `Reservas hoje`: 1;
- `42`: 1;
- `Ocupação`: 1;
- `76%`: 1;
- `Ticket médio`: 1;
- `R$ 148`: 1;
- `Revisar reservas`: 1;
- `Ajustar salão`: 1;
- `Reservas`, `Mesas`, `Cardápio`: visible;
- host controls `Visão Geral`, `Dados`, `Armazenamento`: visible.

Screenshot capture through in-app Browser CDP still timed out on `Page.captureScreenshot`; DOM proof was reliable. If Linear acceptance requires image evidence, use a separate screenshot workaround in a later pass.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:web
```

Result:

- 7 targeted Web component tests passed;
- Web build passed with known Tailwind/font/chunk warnings.

### Operational cleanup

- API/Web dev servers stopped.
- Browser tab parked on `about:blank`.
- Preview container `fayz.ai-preview-ede4a8e6` stopped after proof.

### Next

Superseded by the 12:27 Playwright screenshot proof. Move on to `FAY-1180`.


## 2026-06-13 12:10 BRT — Consolidated manifest/provider gates green

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:api
npm run build:web

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
```

Result:

- Fayz API targeted tests: 23 passed;
- Fayz Web manifest renderer tests: 6 passed;
- Fayz API build passed;
- Fayz Web build passed with known Tailwind/font/chunk warnings;
- SDK `@fayz-ai/core` typecheck/build passed with known `.npmrc` `NODE_AUTH_TOKEN` warning.

### Next

The manifest/provider foundation is green enough to keep moving. Avoid treating FAY-1182 as solved; it is a separate server-side tenant enforcement issue before production end-user use of `backend.provider = "fayz-api"`.

## 2026-06-13 12:08 BRT — FAY-1182 created for server-side tenant enforcement

### Change

Created Linear issue `FAY-1182`:

- title: `[SDK] Server-side tenant enforcement for Fayz API data provider`;
- related to `FAY-1178`;
- assigned to current `fayz-sdk` cycle.

### Why

The SDK `fayz-api` provider now has client-side tenant guardrails, but hostile clients can bypass SDK behavior. Production generated apps need server-side tenant and permission enforcement before using Fayz database rows as their backend.

### Blocker Scope

Blocks:

- exposing `backend.provider = "fayz-api"` as production generated end-user runtime backend.

Does not block:

- Panel manifest foundation;
- generated scaffold manifest seed;
- editor/admin internal proofs;
- SDK provider contract alignment with clear limitation docs.

## 2026-06-13 12:07 BRT — SDK fayz-api mutations no longer fake tenant PK enforcement

### Change

Fixed a tenant-scope footgun in `createFayzApiProvider()`:

- tenant id is no longer sent as an extra `primaryKeys` field;
- the Fayz database controller only uses actual primary-key columns in SQL `WHERE`, so extra tenant keys were ignored;
- when a tenant is active, SDK now preflights update/delete with a tenant-scoped GET before mutation;
- PATCH/DELETE payloads stay aligned with the real controller contract.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module <<'NODE'
// smoke: update/delete preflight tenant-scoped GET before mutation
NODE
```

Result:

- `@fayz-ai/core` typecheck passed;
- `@fayz-ai/core` build passed;
- smoke showed tenant-scoped GET before PATCH/DELETE.

### Architecture Note

This is not a full server-side security model. Before generated end-user runtimes rely on Fayz API database rows directly, Fayz API needs tenant/permission enforcement that does not trust client-supplied tenant filters.

## 2026-06-13 12:06 BRT — Fayz database rows OpenAPI docs aligned to controller

### Change

Updated Fayz API docs for `/api/projects/{projectId}/database/tables/{tableName}/rows` to match the real controller behavior:

- GET documents `page`, `limit`, `sortColumn`, `sortDirection`, `filters`, and optional `schema`;
- GET response documents `{ rows, total, page, limit }`;
- PATCH request documents `{ primaryKeys, data }`;
- PATCH response documents the updated row, not `{ success }`;
- DELETE request documents `{ rows: [...] }`;
- DELETE response documents `{ deletedCount }`, not `{ deleted }`.

Why it matters:

- `@fayz-ai/core` `createFayzApiProvider()` now targets this endpoint;
- agents and OpenAPI clients should not be taught stale `offset/match` contracts.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run build:api
```

Result:

- API build passed after removing one unused docs helper caught by `tsc`.

### Next

Continue narrowing SDK/Fayz API contract drift. The remaining larger product question is whether to keep using database rows directly or add a stable `/data` façade later.

## 2026-06-13 12:03 BRT — SDK fayz-api provider now targets real Fayz database API

### Change

Aligned `@fayz-ai/core` `createFayzApiProvider()` with the API Fayz already exposes:

- old target was aspirational: `/api/projects/:projectId/data/:entity`;
- new target is real: `/api/projects/:projectId/database/tables/:tableName/rows`;
- list maps `pageSize`, sorting, filters, and `{ rows, total }` response into the SDK `CrudResult`;
- create/update/delete now send the body shapes expected by Fayz database controller;
- tenant id from SDK config cannot be overwritten by caller row data;
- root `@fayz-ai/core` exports `createFayzApiProvider`, `FayzApiProviderConfig`, and `BackendProvider`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module <<'NODE'
// smoke: URL/body mapping and tenant override
NODE
```

Result:

- `@fayz-ai/core` typecheck passed;
- `@fayz-ai/core` build passed;
- smoke showed CRUD calls hit `/database/tables/clients/rows` and create payload forced `tenant_id: tenant-a`.
- Known `.npmrc` warning for missing `NODE_AUTH_TOKEN`; non-blocking.

### Next

Fayz API database OpenAPI docs were aligned in the next checkpoint. Consider adding a thin stable `/data` façade later, but SDK now targets a route that exists.

## 2026-06-13 11:59 BRT — Generated projects now include runnable validation scripts

### Change

Fixed a generated-project scaffold gap:

- template already included `src/test/example.test.ts`;
- dynamic `package.json` did not include `test` script or `vitest`;
- generated apps now get `test: vitest run`, `typecheck: tsc -b`, and `devDependencies.vitest`.

Why it matters:

- coding agents can run a basic validation loop immediately after modifying a generated project;
- this is independent of the blocked `@fayz-ai/app-runtime` package source decision.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result:

- scaffold tests: 5 passed;
- API build passed.

### Next

Continue generated-project readiness that does not require installing unpublished SDK packages.

## 2026-06-13 11:57 BRT — Agent guides updated for strict manifest schema

### Change

Updated both agent-facing guides:

- SDK guide: `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`;
- generated project template: `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.

Guidance now says:

- new AppManifest writes must stay inside strict v2 schema;
- do not add ad hoc `title` fields or legacy `pluginId`;
- use `pages[].label`, `plugins[].config`, and `surfaces.*.options` for canonical metadata.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
```

Result: scaffold/seed tests 7 passed.

### Next

Proceed with implementation cleanup; generated agents now have the same strict-schema guidance as Fayz API and SDK runtime.

## 2026-06-13 11:56 BRT — SDK core validator aligned with strict AppManifest v2

### Change

Hardened `@fayz-ai/core` `validateManifest()` so SDK runtime validation matches the strict AppManifest v2 contract:

- rejects unsupported top-level, backend, surface, page, permission, plugin-ref, and block fields;
- validates basic runtime shapes for object fields, `entities`, page sections, permissions, plugin config/enabled, and recursive blocks;
- keeps the core lightweight by avoiding a new schema-validator dependency.

Why it matters:

- Fayz API now rejects non-v2 writes, and the SDK runtime should fail on the same class of invalid manifest;
- generated agents should get one consistent contract instead of API/runtime drift.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
node --input-type=module -e "import { validateManifest } from './packages/core/dist/index.js'; /* smoke valid + invalid */"
```

Result:

- `@fayz-ai/core` typecheck passed;
- `@fayz-ai/core` build passed;
- smoke test returned `valid: []` and rejected extra fields on manifest/surface/plugin.
- Known `.npmrc` warning for missing `NODE_AUTH_TOKEN`; non-blocking.

### Next

Continue keeping API, SDK runtime, generated scaffold, and agent docs on one canonical manifest contract. Package-source decision remains the blocker for adding `@fayz-ai/app-runtime` to generated apps.

## 2026-06-13 11:52 BRT — Fayz API write validation aligned with SDK AppManifest v2

### Change

Aligned Fayz API manifest writes with the strict SDK AppManifest v2 schema:

- writes now reject unsupported top-level fields;
- writes now reject unsupported backend, surface, page, plugin-ref, permission, and block fields;
- legacy display fields like `title` and legacy plugin refs like `pluginId` remain tolerated only by read/render code, not by new writes.

Why it matters:

- the SDK JSON schema has `additionalProperties: false`;
- Fayz should not persist manifests that `@fayz-ai/app-runtime` will reject later;
- agents now get a sharper failure when they try to encode UI metadata in the wrong place.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result:

- manifest/scaffold tests: 19 passed;
- API build passed.

### Next

Keep read-side legacy tolerance, but do not create new manifests with `title`, `pluginId`, or other non-v2 fields. Continue generated-project/client contract cleanup.

## 2026-06-13 11:50 BRT — Panel renderer no longer falls back to wrong array surface

### Change

Fixed a read/render drift in `ManifestSurfaceSection`:

- array-shaped legacy `manifest.surfaces` now resolves only the requested/bound surface;
- if the requested surface is missing, the Panel shows the explicit “Active manifest has no panel surface” state;
- it no longer falls back to the first array entry, which could render `admin` as `panel`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:web
```

Result:

- component tests: 6 passed;
- Web build passed with known Tailwind/font/chunk warnings.

### Next

Continue API/client contract cleanup and then move to the next unblocked SDK/generated-project task.

## 2026-06-13 11:49 BRT — DB enforces one active manifest per scope

### Change

Closed a concurrency/data-integrity gap in the `ProjectAppManifest` migration:

- added a Postgres partial unique index for one active manifest per `projectId + tenantKey + environment + surface`;
- documented the raw constraint in Prisma schema because Prisma cannot model partial unique indexes directly.

Why it matters:

- app code already archives the previous active binding and retries `P2002`/`P2034`;
- the database now also rejects impossible state if two writers race or future code bypasses the service helper;
- tenant-specific Panel rendering depends on exactly one active manifest per scope.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result:

- manifest/seed tests: 14 passed;
- API build passed.

### Next

Continue `FAY-1178` cleanup by reviewing route/openapi/docs alignment and then move to the next unblocked generated-project/SDK integration task.

## 2026-06-13 11:45 BRT — Agent runbooks aligned to manifest-first scaffold

### Change

Updated agent-facing instructions so autonomous agents do not follow legacy examples as the default path:

- added a current operating status block to `docs/agent-guide.md`;
- generated project `AGENTS.md` now documents:
  - `app.manifest.json` first;
  - `plugins[].id` canonical refs;
  - `surfaces.panel` for Fayz editor Panel seed;
  - `surfaces.admin` for generated app admin;
  - no `@fayz-ai/app-runtime` package dependency until package source is locked.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result:

- scaffold/seed tests: 7 passed;
- API build passed.

### Next

Continue with an unblocked SDK/Fayz integration task. Package-source remains a product/devops decision, not an implementation-only fix.

## 2026-06-13 11:44 BRT — SDK package-source blocker confirmed

### Finding

Rechecked current package availability:

- `@fayz-ai/app-runtime` is not on npm public;
- `@fayz-ai/core` is not on npm public;
- `@fayz-ai/saas` is not on npm public;
- `@fayz-ai/app-runtime` is not visible on GitHub Packages under owner `fayz`;
- `npm whoami --registry=https://npm.pkg.github.com` returns 403 in this environment.

Current repo state:

- SDK `.npmrc` maps `@fayz` to GitHub Packages;
- `packages/app-runtime/package.json` has `publishConfig.registry=https://npm.pkg.github.com` and `access=restricted`;
- generated apps still correctly avoid hard dependency on `@fayz-ai/app-runtime`.

### Decision Needed

Before generated apps install the SDK runtime directly, lock one strategy:

- publish `@fayz-ai/*` packages to npm public;
- fix GitHub Packages owner/auth and inject token into generated install environments;
- use a private registry configured by Fayz;
- or use a git/tarball/file source appropriate for generated app containers.

### Next

Keep generated project scaffold declarative only (`app.manifest.json`, `registry.tsx`, `plugins.generated.ts`) until the package source is locked.

## 2026-06-13 11:41 BRT — New projects seed default Panel manifest from scaffold

### Change

Connected generated project scaffold to the DB-backed manifest foundation:

- added `seedProjectPanelManifestFromScaffold()`;
- project creation now seeds `ProjectAppManifest` from scaffold `app.manifest.json`;
- seed only runs when the scaffold manifest declares `surfaces.panel`;
- active binding uses `tenantKey=default`, `environment=preview`, `surface=panel`, `source=project-scaffold`;
- scaffold `app.manifest.json` now declares both `panel` and `admin` surfaces.

Why it matters:

- new Fayz projects can have an active Panel manifest without waiting for `@fayz-ai/app-runtime` package publication;
- generated app admin surface remains available for the future SDK app runtime;
- Panel DB seed remains pure JSON and can be changed by agents/Fayz later.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result:

- API targeted tests: 21 passed;
- API build passed.
- Live local API proof passed:
  - created project `7d2c2d53-e4ff-43e3-bf0a-ba8d27950e0e` (`CODEx SDK Seed Proof 11h42`);
  - immediate active manifest lookup returned binding `acf423be-d7b9-469b-b134-620720b71b1e`;
  - `tenantKey=default`, `environment=preview`, `surface=panel`, `status=active`, `source=project-scaffold`, `versionNumber=1`;
  - manifest surfaces: `admin`, `panel`.

### Next

Return to SDK package-source blocker and generated-agent instructions.

## 2026-06-13 11:39 BRT — Manifest binding now requires declared surface

### Change

Fixed a binding/render mismatch in Fayz API manifest writes:

- `createManifest` now rejects a payload when the requested/default binding `surface` is absent from `manifestJson.surfaces`;
- shared defaults moved to constants so service/controller agree on `default / preview / panel`;
- added negative test for `surface=panel` with only `surfaces.admin`;
- added positive test for `surface=admin` with `surfaces.admin`, preserving generated app scaffold compatibility.

Why it matters:

- without this guard, Fayz could persist an active `panel` binding whose manifest has no `panel` surface;
- the Panel would then resolve a 200 active manifest but render the “no panel surface” failure state;
- tenant/surface-specific rendering must fail at write-time, not later during dashboard rendering.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result:

- API targeted tests: 18 passed;
- API build passed.

### Next

Continue scaffold/runtime contract review. Next likely decision: how Fayz seeds a generated app's `app.manifest.json` into `ProjectAppManifest` without requiring unpublished `@fayz-ai/app-runtime`.

## 2026-06-13 11:36 BRT — Plugin ref write contract aligned with SDK schema

### Change

Aligned Fayz API manifest writes with SDK AppManifest v2 schema:

- controller validation now requires `plugins[].id`;
- controller no longer accepts `plugins[].pluginId` as a write-time fallback;
- added a negative controller test for plugin refs that only provide `pluginId`.
- OpenAPI query params for active manifest lookup now expose `environment` and `surface` enum values instead of loose strings.

Why it matters:

- SDK schema requires `id`;
- accepting `pluginId` in writes would let Fayz persist manifests that the SDK schema/runtime can reject later;
- Web display can still tolerate legacy `pluginId`, but new writes are canonical.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result:

- API targeted tests: 16 passed;
- API build passed; API build rerun also passed after OpenAPI query enum alignment.

### Self-improvement note

I accidentally ran the narrow API test command and the full targeted API command in parallel after deciding same-package checks should be serialized. It did not affect code, but it wasted a short cycle. Next same-package validation should be one command at a time: narrow failure check, then broader package gate.

### Next

Continue scaffold/runtime contract review, especially where generated app manifests should be seeded into `ProjectAppManifest` and how agents should install SDK modules once package-source is locked.

## 2026-06-13 11:35 BRT — Manifest versioning concurrency hardened

### Change

Closed two architecture gaps in `ProjectAppManifest` persistence:

- `activatedAt` is now nullable in Prisma schema and migration;
- draft manifest creates now store `activatedAt=null`;
- active manifest creates still set `activatedAt` when activated;
- `createProjectAppManifest()` now retries concurrent scoped-version collisions (`P2002`) and serializable transaction conflicts (`P2034`);
- create/archive/version critical section now uses serializable transaction isolation.

Why it matters:

- drafts no longer look activated in audit/history;
- concurrent agents or API calls cannot permanently fail just because two writes both computed the same next `versionNumber`;
- active writes remain scoped by `projectId + tenantKey + environment + surface`, so last successful active create archives only the previous active binding in that scope.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run db:generate
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result:

- Prisma client regenerated;
- API targeted tests: 15 passed;
- API build passed.

### Self-improvement note

Version allocation is a real multi-agent risk. Any endpoint that does `find latest -> create next` needs either DB-generated sequencing, serializable isolation, or retry on unique collision. For this slice, retry + scoped unique index is enough until manifests move to heavier publish workflows.

### Next

Continue `FAY-1178` cleanup by reviewing generated-project scaffold/runtime contract and then return to the SDK package-source blocker.

## 2026-06-13 11:31 BRT — Fayz Panel/API manifest scope hardened

### Change

Tightened the `FAY-1178` manifest foundation before scaling tenant-specific panel rendering:

- added shared manifest constants in Fayz API for environments, surfaces, and statuses;
- API controller now rejects unsupported `environment` / `surface` values before service calls;
- service lookup/create inputs are typed to supported scopes;
- service serialization rejects corrupt DB rows with invalid manifest domain values;
- OpenAPI schemas now expose the same enum contract;
- Web `ManifestSurfaceSection` now accepts `tenantKey`, `environment`, and `surface` props with defaults instead of hardcoding all scope values internally.

Why it matters:

- one client/project can safely resolve different manifests by tenant/surface/environment;
- invalid scopes cannot silently create rows that the Panel never renders;
- future Panel tabs can pass tenant context without rewriting the dashboard card.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:api
npm run build:web
```

Result:

- API: 14 tests passed;
- Web: 5 tests passed;
- API build passed;
- Web build passed with known Tailwind/font/chunk warnings.

Browser DOM proof:

- URL: `http://localhost:5173/editor/ede4a8e6-3869-458d-a908-2a5062fbe7aa?view=dashboard`;
- authenticated through local `POST /api/auth/test-login` + `/auth/callback?token=...`;
- visible: `Manifest surface`, `panel · preview · default`, `SDK PANEL PROOF`, `Painel Operacional`, `2 pages`, `2 plugins`;
- host controls still visible: `Visão Geral`, `Dados`, `Armazenamento`.

Screenshot capture failed again due Browser CDP `Page.captureScreenshot` timeout, so proof is DOM/browser text plus API logs.

### Self-improvement note

- Do same-package checks serially: narrow tests first, package build second. Parallel build with a failing unit test wasted a cycle.
- Browser editor proof starts preview container health polling; park or close the browser tab immediately after proof to avoid noisy logs and unnecessary work.
- The API cleanup scheduler initially hit a Docker remove 409 on a running container, then cleaned up and restarted the preview successfully. This is not blocking the manifest work, but future cleanup logic should avoid remove-before-stop loops.

### Next

Continue `FAY-1178` review/cleanup. The remaining architectural blocker is still the generated-project SDK package source: do not hard-add `@fayz-ai/app-runtime` until publish/private registry/source strategy is locked.

## 2026-06-13 11:18 BRT — Beauty working-hours proof green

### Change

Exposed Agenda working-hours management as a real settings tab:

- route: `/settings/agenda-working-hours`;
- PT-BR label: `Horário de Funcionamento`;
- component wrapped in `AgendaContextProvider`;
- tenant id resolved from plugin runtime so `saveSchedule()` can write to the active tenant.

Found and fixed two issues before saving:

- UI had English hardcoded title/day labels inside the PT-BR app;
- `WorkingHoursView.handleSave()` deleted every schedule for the professional, including date-specific exceptions not shown in the editor, and recreated weekly rows without preserving metadata.

Fix:

- localized title/day labels via existing locale;
- weekly save now deletes/recreates only weekly schedules;
- date-specific exceptions are preserved;
- existing weekly metadata/location fields are preserved when rows are recreated;
- `SaveScheduleInput` now supports metadata and both Supabase/mock providers persist it.

### Verification passed

Browser proof:

- opened `http://127.0.0.1:5180/#/settings/agenda-working-hours`;
- selected `My Staff`;
- clicked `Salvar`;
- UI showed `Horários de trabalho salvos`.

DB/RPC proof:

- `My Staff` weekly schedules still preserve location metadata;
- specific-date exception `2026-03-31` remains present/inactive with metadata `{ exceptionType: "unavailable", notes: "xxx" }`;
- `get_available_slots` for `2026-06-17`, `My Staff`, 30min returned 18 slots.

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/plugin-agenda typecheck && pnpm --filter @fayz-ai/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build
```

Result: all passed. Screenshot capture for this proof failed twice due browser CDP `Page.captureScreenshot` timeout; DOM/toast/DB/RPC evidence passed.

### Self-improvement note

Before exercising admin/settings save flows, inspect whether the UI is a full-fidelity editor. If a screen does not expose exceptions, metadata, capacity, or location constraints, its save path must preserve those hidden fields instead of replacing the whole domain object.

### Next

Beauty agenda demo path now covers CRUD, payment, dashboard, and working-hours. Switch to Fayz Panel/API cleanup or final Beauty proof cleanup unless a new higher-risk gap appears.

## 2026-06-13 11:09 BRT — Beauty dashboard proof green

### Change

Validated the dashboard against the canonical Agenda read model.

Found a product/data consistency issue:

- `Agenda de Hoje` queried `public.v_bookings` but showed cancelled bookings;
- KPI `Agendamentos Hoje` was still static (`12`) while the real active count was `2`.

Fixed:

- dashboard list now excludes `cancelled` and `no_show`;
- `Agendamentos Hoje` KPI now counts active bookings from `public.v_bookings` for the local day;
- yesterday is used as `previousValue` for trend context.

### Verification passed

Browser proof at `http://127.0.0.1:5180/#/`:

- KPI `Agendamentos Hoje` renders `2`;
- list shows `TESTE-CODEX Agenda` and `TESTE-CODEX Edit 11h02`;
- cancelled booking `TESTE-CODEX Cancel 13:38` does not render;
- screenshot: `/Users/fayalabs/dev/fayz/beauty-dashboard-proof-2026-06-13-1117.png`.

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build
```

Result: passed. Known warnings only: existing dynamic-import/chunk-size warnings.

### Self-improvement note

When a read model is already canonical (`public.v_bookings`), dashboard widgets and KPI cards must use the same status filters as the operational calendar. Otherwise the product appears inconsistent even though the core CRUD path is correct.

### Next

Move to settings/working-hours proof and then decide whether the next high-value lane is Beauty settings or Fayz Panel/API cleanup.

## 2026-06-13 11:06 BRT — Beauty edit proof green, item assignee fixed

### Change

Validated the Agenda edit path with a separate non-paid test booking:

- client: `TESTE-CODEX Edit 11h02`;
- booking: `2147ec56-5478-416d-9607-cab4d96ba8bd`;
- order: `d706be72-30dc-46ca-9656-8b10080271cc`;
- professional: `My Staff`;
- service: `Corte de cabelo`.

Edited through the UI modal:

- changed duration/price to 35min / R$155;
- updated notes;
- closed modal and confirmed the calendar rendered `10:00 – 10:35`;
- screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-edit-proof-2026-06-13-1109.png`.

Found and fixed a real SDK consistency bug:

- `updateBooking()` recreated `booking_items` and `order_items` with `assignee_id=null` when the user edited only duration/price;
- fix: load the existing booking `assignee_id` and use it as fallback for recreated service/order items;
- this preserves item-level professional assignment and keeps `public.v_bookings.services[].assigneeId` useful.

### Verification passed

DB/read-model proof after retest:

- `saas_core.bookings.ends_at=2026-06-13T13:35:00+00:00`;
- `saas_core.orders.total=155`;
- `booking_items.duration_minutes=35`, `price=155`, `assignee_id=76954279-9679-4ef4-a58a-1703503957f3`;
- `order_items.duration_minutes=35`, `unit_price=155`, `total=155`, `assignee_id=76954279-9679-4ef4-a58a-1703503957f3`;
- `v_bookings.services[].assigneeId=76954279-9679-4ef4-a58a-1703503957f3`.

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/plugin-agenda typecheck && pnpm --filter @fayz-ai/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build
```

Result: all passed. Known warnings only: SDK `.npmrc` missing `${NODE_AUTH_TOKEN}` and existing Beauty dynamic-import/chunk-size warnings.

### Self-improvement note

- Browser session variables persist across runs; use unique `var` names or existing bindings when saving screenshots to avoid wasting a cycle on redeclaration errors.
- For CRUD proof, seed disposable records but perform the mutation through the UI. This preserves demo evidence while still testing the real user path.

### Next

Move to dashboard metrics and settings/working-hours proof. Edit/create/payment/delete/cancel are now broad enough for the Beauty agenda demo path.

## 2026-06-13 10:50 BRT — Remote `v_bookings` drift normalized

### Change

Confirmed the linked Beauty Supabase project still had the old `public.v_bookings` definition:

- source table was `saas_core.orders`;
- it depended on legacy `orders.starts_at`, `orders.stage`, and `orders.direction`;
- this was why newly created canonical `saas_core.bookings` rows did not appear through the view.

Applied a surgical remote fix instead of broad `supabase db push`:

- added `/Users/fayalabs/dev/fayz-app/beauty-saas/supabase/migrations/20260613104300_fix_v_bookings_canonical.sql`;
- updated `/Users/fayalabs/dev/fayz-app/beauty-saas/supabase/migrations/20260301000001_plugin_agenda.sql` to keep compatibility columns on local reset;
- applied the new migration to linked project `gphxclpkbtbucoqclbco` with `supabase db query --linked --file ...`;
- repaired remote migration history for `20260301000001`, `20260331000001`, and `20260613104300`.

New `public.v_bookings` behavior:

- reads from `saas_core.bookings`;
- joins linked `saas_core.orders`;
- preserves legacy-compatible columns `reference_number`, `stage`, and `direction`;
- keeps `get_available_slots()` with specific-date override priority.

### Verification passed

Remote view definition:

- `pg_get_viewdef('public.v_bookings'::regclass, true)` now shows `FROM saas_core.bookings b`.

REST proof:

- `v_bookings?id=eq.4144bdc9-7e9a-4483-b301-610e97b6dc25` returns canonical booking id, linked order id, services, `reference_number=REC-00020`, `stage=invoiced`, `direction=credit`.

Browser proof:

- after reload, paid proof present;
- unpaid delete-test absent;
- paid cancel-test absent.

### Remaining drift

Do not run broad `supabase db push` yet:

- local still has `20260101000009` / `20260101000010` not applied remotely.

Follow-up cleanup:

- fetched remote-only `20260401000001`, `20260402000001`, `20260404000001` into Beauty local migrations;
- reverted accidental whitespace/dump churn from older fetched migration files;
- kept only the intentional compatibility update to `20260301000001_plugin_agenda.sql` plus the new canonical fix migration;
- verified `20260101000009` / `20260101000010` objects and grants already existed remotely, then repaired those migration-history markers;
- `supabase migration list --linked` now shows local and remote aligned through `20260613104300`.

### Self-improvement note

For production-like Supabase fixes, prefer a narrow idempotent migration plus targeted `db query` and `migration repair` over broad `db push` when local/remote histories already diverge.

### Next

Move to edit/settings/dashboard proof. The live Agenda read model no longer depends on SDK fallback for canonical booking rows, and Supabase migration history is aligned.

## 2026-06-13 10:41 BRT — Beauty paid booking cancel proof green

### Change

Validated the paid booking delete/cancel path with a separate paid test booking:

- seeded a paid appointment with booking/order/movement records;
- opened the event through the Agenda UI;
- confirmed it rendered as paid;
- clicked `Excluir` and confirmed deletion;
- verified the event disappeared after reload while the main paid proof booking stayed visible.

Seeded paid-cancel identifiers:

- client: `TESTE-CODEX Cancel 13:38`;
- booking: `ec168913-0e42-47fc-8ee2-345b890eaa0b`;
- order: `ed26c311-98a8-49c4-b598-ac84f825d002`;
- movement: `339ec22a-6b45-4504-8621-d56cca86f903`.

DB confirmation after UI delete:

- `saas_core.bookings.status=cancelled`;
- `saas_core.orders.status=cancelled`;
- `financial_movements.status=cancelled`;
- records were preserved instead of hard-deleted, which is correct when financial movements exist.

Fixed a UI refresh bug found during the proof:

- mutation refresh paths in `@fayz-ai/plugin-agenda` now reuse the current booking query filters;
- before this, the DB was correctly cancelled but the UI could re-render cancelled bookings because refresh called `provider.getBookings({ dateRange })` without selected status/professional/location filters.

Follow-up architecture cleanup:

- `updateBooking()` no longer copies agenda lifecycle status into `saas_core.orders.status`;
- `completeBooking()` no longer marks the linked order as `completed`;
- preserve this rule: `saas_core.bookings.status` is appointment lifecycle, while `saas_core.orders.status` is financial/order lifecycle.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/plugin-agenda typecheck && pnpm --filter @fayz-ai/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Browser proof:

- after reload, paid proof present;
- unpaid delete-test absent;
- paid cancel-test absent;
- screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-paid-cancel-proof-2026-06-13-1042.png`.

Known non-blocking noise:

- Beauty Vite build still has existing dynamic-import/chunk-size warnings;
- SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Self-improvement note

When testing mutation flows that soft-delete/cancel records, always verify both DB state and the post-mutation UI refresh. A correct database transition can still fail the product proof if store refresh bypasses active filters.

### Next

Agenda lifecycle proof is now broad enough for the weekend demo path: create, render, status update, checkout payment, hard delete when unpaid, and cancel when paid. Move next to edit-form details, settings, dashboard metrics, or normalizing live `v_bookings` migration drift.

## 2026-06-13 10:37 BRT — Beauty unpaid booking delete proof green

### Change

Validated the delete path without destroying the paid demo proof booking:

- created a separate unpaid delete-test booking through an authenticated seed;
- rendered it in the Agenda UI;
- clicked `Excluir`;
- confirmed the explicit `Excluir este agendamento?` dialog;
- verified the event disappeared while the paid proof booking remained visible.

Seeded delete-test identifiers:

- client: `TESTE-CODEX Delete 13:34`;
- booking: `71c134bc-18f5-408e-b191-4ac570ad99ce`;
- order: `44a1c6fc-2a86-485b-bf9f-19b6c207394e`;
- professional: `My Staff`;
- service: `Corte de cabelo`;
- local time: 12:00-12:25 BRT.

DB confirmation after UI delete:

- `saas_core.bookings` row removed;
- `saas_core.orders` row removed;
- seeded `saas_core.persons` client remains, which is the correct behavior because deleting an appointment must not delete the client record.

### Verification passed

Browser proof:

- route: `http://127.0.0.1:5180/#/agenda`;
- delete confirmation appeared and was accepted;
- screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-delete-proof-2026-06-13-1038.png`.

No code changed in this substep, so no new build gate was required beyond the immediately prior green Beauty/SDK gates.

### Self-improvement note

For delete testing, seed setup data with the authenticated test user and then exercise the destructive action through the UI. This isolates the path under test and preserves the primary demo booking.

### Next

Validate paid-cancel behavior using a separate paid booking. Expected behavior: with `financial_movements` present, delete should cancel booking/order/movements rather than hard-delete records.

## 2026-06-13 10:33 BRT — Beauty Agenda payment bridge proof green

### Change

Extended the Beauty Agenda proof from booking creation to status update + payment checkout:

- changed proof booking status from `scheduled` to `confirmed` through the Agenda UI;
- DB confirmed both `saas_core.bookings.status=confirmed` and the linked order status change before checkout;
- opened the booking financial action from Agenda;
- selected `PIX`;
- confirmed checkout for R$120.

DB confirmation after checkout:

- `financial_movements` movement `d37b4ccb-53b6-43e9-bbb0-c16a93bc67c1`;
- `invoice_id=ce97b3b7-93dd-448c-aa19-3ad872f2f88e`;
- `amount=120`, `paid_amount=120`, `status=paid`, `payment_date=2026-06-13`;
- `orders.reference_number=REC-00020`;
- `orders.metadata.paidAmount=120`.

Fixed two SDK consistency issues found during the proof:

- `@fayz-ai/plugin-agenda` bridge `resolvePaymentStatuses()` now resolves payment status from `financial_movements` in batch, not only from `orders.status`;
- `mapInvoiceStatus()` now treats agenda lifecycle statuses like `confirmed`, `in_progress`, and `no_show` as payment `none`;
- `@fayz-ai/plugin-financial` now updates `orders.status` on payment instead of writing legacy/non-portable `orders.stage`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/plugin-financial typecheck
pnpm --filter @fayz-ai/plugin-financial build
pnpm --filter @fayz-ai/plugin-agenda typecheck
pnpm --filter @fayz-ai/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Browser proof:

- after payment, UI showed `Pagamento confirmado`;
- after reload, the booking popover showed `R$ 120,00 · Pago`;
- screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-financial-paid-proof-2026-06-13-1034.png`.

Known non-blocking noise:

- Beauty Vite build still has existing dynamic-import/chunk-size warnings;
- SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Self-improvement note

Do not run a dependency package build in parallel with a dependent package typecheck/build when the build cleans `dist`. A parallel `plugin-financial build` temporarily removed declarations while `plugin-agenda` was compiling and caused a false red; rerunning Agenda after Financial finished passed.

### Next

Use a separate test booking for delete/cancel behavior. Keep the paid proof booking intact unless Vini asks to remove it, because it is useful demo evidence.

## 2026-06-13 10:26 BRT — Beauty booking create proof green, read model fallback added

### Change

Finished the first real Agenda mutation proof in Beauty:

- quick-created client `TESTE-CODEX Agenda` from the appointment modal;
- created an appointment for `Mano Capurro` at `Barra da Tijuca`;
- selected service `Corte de cabelo`, 25 minutes, R$120;
- created booking at `2026-06-13T12:00:00Z` / 09:00 BRT.

DB confirmation:

- `saas_core.persons`: client created;
- `saas_core.bookings`: booking `4144bdc9-7e9a-4483-b301-610e97b6dc25`;
- `saas_core.orders`: linked order `ce97b3b7-93dd-448c-aa19-3ad872f2f88e`, `kind=appointment`, `status=scheduled`, `total=120`.

Found and handled a schema drift:

- local migration `supabase/migrations/20260301000001_plugin_agenda.sql` defines `public.v_bookings` from `saas_core.bookings`;
- the live remote view still behaves like the older orders-based read model and did not expose the new canonical booking;
- `@fayz-ai/plugin-agenda` now merges `public.v_bookings` with canonical `saas_core.bookings` reads and falls back in `getBookingById()` by `bookings.id` / `bookings.order_id`.

Also fixed a silent-success edge:

- `createBooking()` now throws if the created record cannot resolve from the read model instead of returning `null` after the success toast.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/plugin-agenda typecheck
pnpm --filter @fayz-ai/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Browser proof:

- URL: `http://127.0.0.1:5180/#/agenda`;
- after login/reload, the created booking appears in the calendar on Saturday 13/06 at 09:00 under `Mano Capurro`;
- screenshot: `/Users/fayalabs/dev/fayz/beauty-booking-mutation-proof-2026-06-13-1026.png`.

Known non-blocking noise:

- Browser dev log stream still includes unrelated Fayz editor `ContainerStream` errors from the shared browser context;
- Beauty Vite build still has existing dynamic-import/chunk-size warnings;
- SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.

### Self-improvement note

For future Beauty proof, do not trust `public.v_bookings` alone until remote DB drift is normalized. Confirm both canonical tables and rendered UI. Keep only one Beauty browser tab when possible to reduce Supabase multi-client warnings.

### Next

Use the created booking to prove edit/delete and financial bridge lifecycle, then record whether the SDK fallback is enough for demo or whether remote `v_bookings` migration must be applied before customer-facing use.

## 2026-06-13 10:12 BRT — Beauty local SDK proof green, RPC 404 removed from static app path

### Change

Fixed Beauty's local SDK source aliases in `/Users/fayalabs/dev/fayz-app/beauty-saas`:

- `vite.config.ts`: `../fayz-sdk` → `../../fayz-sdk`;
- `tsconfig.json`: `@fayz-ai/*` paths now point to `../../fayz-sdk/...`;
- `tailwind.config.ts`: Tailwind preset/content now points to `../../fayz-sdk/...`.

Reason: Beauty is nested under `/Users/fayalabs/dev/fayz-app/beauty-saas`; the SDK is `/Users/fayalabs/dev/fayz-sdk`. The previous relative path resolved to the nonexistent `/Users/fayalabs/dev/fayz-app/fayz-sdk`.

Also adjusted `@fayz-ai/saas` shell runtime:

- tenant plugin RPC hydration is now explicit opt-in via `pluginRuntime.hydrateTenantPlugins === true`;
- static plugin apps no longer call missing `rpc/get_tenant_active_plugins` on every load;
- this removed the recurring console/network 404 from the Beauty Agenda proof.

### Verification passed

In `/Users/fayalabs/dev/fayz-sdk`:

```bash
pnpm --filter @fayz-ai/saas typecheck
pnpm --filter @fayz-ai/saas build
```

In `/Users/fayalabs/dev/fayz-app/beauty-saas`:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Browser proof:

- dev server: `http://127.0.0.1:5180`;
- login: `teste@teste.com` / `teste123` from Beauty `docs/testing.md`;
- route: `http://127.0.0.1:5180/#/agenda`;
- result: Agenda rendered week view with professionals, status filters, and schedule blocks;
- clean reload after RPC guard: `0 errors`, `1 warning`;
- screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-proof-post-rpc-guard-2026-06-13-1012.png`.

Known non-blocking noise:

- Beauty Vite build has chunk-size/dynamic-import warnings;
- SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`;
- the one browser warning is the dev/Supabase multi-client warning when multiple tabs exist in the same browser context.

### Self-improvement note

Do not re-run `pnpm install` in Beauty just to prove this path. The lockfiles are already dirty/stale, but `tsc` and Vite can validate through source aliases without mutating installs. Future browser proof should use the documented test credentials and open `#/agenda` directly; the nav button label is `Agenda`, but the actual plugin route is `/agenda`.

### Next

Move from render proof to booking mutation proof: create a test appointment through the Agenda UI or provider path, then confirm it appears through `public.v_bookings` and linked `saas_core.orders`.

## 2026-06-13 10:05 BRT — Beauty client Orders provider aligned with current archetype schema

### Change

Adjusted `@fayz-ai/saas` client-orders provider in `/Users/fayalabs/dev/fayz-sdk`:

- stopped selecting/filtering nonexistent `saas_core.orders.stage`;
- stopped selecting nonexistent `saas_core.orders.starts_at`;
- mapped the UI's historical stage filters to `orders.status`;
- fetched linked booking `starts_at` values from `saas_core.bookings` by `order_id` so appointment documents can still show booking dates.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/saas typecheck
pnpm --filter @fayz-ai/saas build
```

Known non-blocking noise:

- pnpm still warns that `.npmrc` references missing `${NODE_AUTH_TOKEN}`;
- `@fayz-ai/saas` build emits existing bundle warnings about unused external imports from `@fayz-ai/core`.

### Self-improvement note

The `stage` terminology remains in UI/types/i18n as a visual lifecycle label, but runtime data access should use `orders.status` unless a future migration explicitly adds `orders.stage`.

### Next

Attempt a Beauty app/package proof with minimal touch: inspect local scripts and dependency linkage first, then run typecheck/build or browser only if it will not overwrite the dirty app worktree.

## 2026-06-13 10:02 BRT — Beauty agenda provider aligned with `bookings` view contract

### Change

Adjusted `@fayz-ai/plugin-agenda` Supabase runtime in `/Users/fayalabs/dev/fayz-sdk`:

- `createBooking()` now creates `saas_core.bookings` + `saas_core.booking_items`, then returns the row through `public.v_bookings`;
- it still creates the linked `saas_core.orders` + `saas_core.order_items` record for financial bridge compatibility;
- `updateBooking()`, `deleteBooking()`, `checkConflict()`, `sendConfirmation()`, and `completeBooking()` now mutate `bookings` for agenda lifecycle state instead of treating `orders` as the booking table;
- financial bridge no longer selects/filters/updates nonexistent `orders.stage` or `orders.direction`;
- payment detail now derives status from `financial_movements` when present, otherwise from `orders.status`.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz-ai/plugin-agenda typecheck
pnpm --filter @fayz-ai/plugin-agenda build
```

Known non-blocking warning:

- pnpm still warns that `.npmrc` references missing `${NODE_AUTH_TOKEN}`.

### Self-improvement note

Future runs should not investigate `plugin-agenda` as an `orders-as-booking` provider anymore. The remaining Beauty risk is downstream: `@fayz-ai/saas` client-orders code still appears to assume `orders.stage`/`starts_at`, so inspect that path before claiming full Beauty proof.

### Next

Inspect and patch the narrow `@fayz-ai/saas` client Orders tab/provider if it blocks Beauty proof, then run the relevant package gates and browser-check Beauty only after confirming the dirty app worktree can be used without clobbering local changes.

## 2026-06-13 09:40 BRT — Autonomous execution green light + faster heartbeat

### Direction from Vini

Vini approved autonomous execution with persistent work, stopping only for blockers that require product/architecture approval. The docs must stay optimized for another agent reading every cycle and producing quick mobile updates.

### Execution loop adjusted

Updated Codex app automation:

- id: `fayz-sdk-weekend-autonomous-loop`;
- cadence changed from every 30 minutes to every 5 minutes;
- role clarified as fallback/resume loop, not the main worker;
- every run must inspect fast docs, compact git status, recent logs, and self-improve if executions are stuck, redundant, or too broad.

Updated docs:

- `docs/discovery/16-active-run-state.md` is now the fast resume snapshot.
- `docs/discovery/15-72h-supervision-protocol.md` now includes the thread heartbeat and self-improvement rule.

### Current work state

No Vini-level blocker.

Operational risks to manage:

- `fayz-sdk` remains dirty with SDK foundation/runtime/docs and quarantined packages.
- `fayz` remains dirty with the Panel/API manifest slice.
- `beauty-saas` remains dirty and behind `origin/main` by 2 commits.
- Beauty agenda proof still has the `saas_core.bookings` vs `saas_core.orders` mismatch.

### Next execution unit

Continue the current foreground work:

```bash
cd /Users/fayalabs/dev/fayz
npm run build:api
npm run build:web
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Then re-check SDK runtime/core gates in `/Users/fayalabs/dev/fayz-sdk`.

## 2026-06-13 09:42 BRT — Panel/API + SDK gates passed

### Verification passed

In `/Users/fayalabs/dev/fayz`:

```bash
npm run build:api
npm run build:web
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Results:

- API build passed.
- Web build passed.
- API targeted test passed: 3 tests.
- Web targeted test passed: 4 tests.

In `/Users/fayalabs/dev/fayz-sdk`:

```bash
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
pnpm --filter @fayz-ai/app-runtime typecheck
pnpm --filter @fayz-ai/app-runtime build
```

Results:

- Core typecheck/build passed.
- Runtime typecheck/build passed.

Known non-blocking noise:

- SDK pnpm warns about missing `${NODE_AUTH_TOKEN}`.
- Fayz web build emits existing Tailwind ambiguity/font/chunk-size warnings.

### Next

Browser-verify the editor Panel slice if a dev server/session is available, then continue cleanup/review of `FAY-1178`. Do not start scaffold or Beauty until the first slice remains clean after browser verification.

## 2026-06-13 09:47 BRT — Browser verification passed for bound Panel manifest

### Browser proof

Used the already-running local services:

- web: `localhost:5173`;
- API: `localhost:3001`;
- admin app also running on `localhost:5174`, not used for editor proof.

Auth path:

- `e2e-test@wowsome.local` authenticated but correctly hit project access `403`.
- Switched to the project's local shared proof user via non-production `POST /api/auth/test-login`.
- User: `hermes-dashboard-proof@wowsome.local`.

Verified URL:

```txt
http://localhost:5173/editor/ede4a8e6-3869-458d-a908-2a5062fbe7aa?view=dashboard
```

Result:

- Project loaded: `Churrascaria Rodízio Texas`.
- `Manifest surface` card visible.
- Manifest page `Agenda` visible.
- Host-owned controls still visible: `Visão Geral`, `Dados`, `Armazenamento`.
- No 403 or project-load error after using the shared proof user.

### Self-improvement note

The first browser attempt with `e2e-test@wowsome.local` produced a valid access-control failure. Future runs should use the bound project's shared proof user directly to avoid wasting a cycle on the expected 403.

### Next

Review and clean up the `FAY-1178` dirty changeset. Keep scaffold and Beauty paused until that review is done.

## 2026-06-13 09:50 BRT — API manifest validation cleanup

### Change

Tightened `POST /api/projects/:projectId/app-manifests` validation in `/Users/fayalabs/dev/fayz`:

- require `manifestVersion >= 1`;
- require each `SurfaceManifest.scaffold`;
- require `backend.adapterId` when `backend.provider = custom`;
- confirm `EDITOR` role before validating the detailed write body.

Added controller test:

- `apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Results:

- API targeted tests passed: 8 tests across 3 files.
- API build passed.

### Next

Continue `FAY-1178` changeset review. If no further issue appears, move to generated project scaffold prep (`FAY-1180`) rather than Beauty.

## 2026-06-13 09:57 BRT — Initial generated-project SDK scaffold prep, with package-source blocker isolated

### Change

Implemented the first `FAY-1180` scaffold prep slice in `/Users/fayalabs/dev/fayz`:

- confirmed `@fayz-ai/app-runtime` is not currently installable from npm public or GitHub Packages under the `@fayz` scope;
- avoided adding a hard dependency that would break generated project installs;
- added side-effect imports for generated plugin and app registry registration;
- added template `app.manifest.json`;
- added template `src/registry.tsx`;
- added template `src/plugins.generated.ts`;
- added template `AGENTS.md`;
- added scaffold coverage in `apps/api/src/modules/projects/__tests__/scaffold.test.ts`.

Important scope decision:

- Did **not** switch generated apps to `renderApp()` yet. The current change makes generated projects SDK-aware while keeping the existing SPA runtime stable. Full manifest-first mounting should come after one useful generated Panel/app proof defines the minimal route/component contract.
- Did **not** add `@fayz-ai/app-runtime` to generated package.json yet. Full dependency insertion is blocked until package publication/registry strategy is locked.

### Verification passed

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Results:

- 12 targeted API tests passed across 4 files.
- API build passed.

### Blocker isolated

Full `FAY-1180` package integration needs a package-source decision:

- publish `@fayz-ai/app-runtime` under an installable scope;
- change package scope to match the configured registry owner;
- configure generated projects with a private registry mapping/token path;
- or choose another durable install source.

Self-improvement note: future automated runs should not add `@fayz-ai/app-runtime` to generated `package.json` until this is resolved, because `npm view @fayz-ai/app-runtime` currently returns `404` in both npm public and GitHub Packages checks.

### Next

Continue generated manifest activation only for source files that do not break install, or move to Beauty agenda data-model cleanup while the package-source decision is pending.

## 2026-06-12 — Research lanes completed + first SDK stabilization

### Research completed

Five research lanes completed. Two Codex lanes could not write cross-repo output files directly due sandbox write roots, so Hermes captured their findings manually.

Research files now present:

- `docs/discovery/research/sdk-manifest-provider.md`
- `docs/discovery/research/fayz-panel-api.md`
- `docs/discovery/research/generated-project-scaffold.md`
- `docs/discovery/research/beauty-proof.md`
- `docs/discovery/research/package-design-system.md`

### Consolidation completed

Created:

- `docs/discovery/20-architecture-lock.md`
- `docs/discovery/21-implementation-plan.md`

### Implementation started: Workstream 1

Changed in `@fayz-ai/core`:

- added `BackendProvider = 'supabase' | 'fayz-api' | 'mock' | 'custom'`;
- extended `BackendRef` with `adapterId` and `options`;
- updated `app-manifest.schema.json` providers;
- strengthened `validateManifest()` for backend provider, duplicate page paths, duplicate plugin ids, empty paths/ids;
- added `packages/core/src/data/fayz-api.ts` with CRUD-compatible `createFayzApiProvider()`;
- made `resolveDataProvider()` accept optional backend/provider options while preserving default Supabase → archetype → mock behavior;
- exported new data provider utilities.

Changed in `@fayz-ai/app-runtime`:

- fixed export collisions by explicitly re-exporting `CreateThemeOptions` from `@fayz-ai/ui` and `SaasTheme` from `@fayz-ai/saas`;
- made `@fayz-ai/app-runtime/styles.css` real by copying `@fayz-ai/ui` CSS into runtime dist during build.

### Verification

Passed:

```bash
pnpm --filter @fayz-ai/app-runtime typecheck
pnpm --filter @fayz-ai/app-runtime build
pnpm --filter @fayz-ai/core typecheck
pnpm --filter @fayz-ai/core build
```

Known warning:

- `.npmrc` warns about missing `${NODE_AUTH_TOKEN}`; did not block local builds.

### Next

Continue Workstream 1 with tighter validation/tests if practical, then move to Fayz API `ProjectAppManifest` storage/resolver.

## 2026-06-12 — Fayz API manifest storage/resolver started

### Branch hygiene

Created feature branches after realizing the SDK repo was still on `main` and Fayz on `dev`:

- `~/dev/fayz-sdk`: `weekend-fayz-sdk-architecture-lock`
- `~/dev/fayz`: `weekend-fayz-sdk-panel-manifest`

### Codex open questions resolved without blocking Vini

Created:

- `docs/discovery/22-decisions-from-codex-open-questions.md`

Working defaults include:

- keep provider id `fayz-api`;
- generated apps default to `@fayz-ai/app-runtime` + `@fayz-ai/app-runtime/styles.css`;
- keep `createSaasApp` as compatibility sugar;
- no breaking permission rename this slice;
- quarantine courses/portal/plugin-courses;
- CRUD-only is enough for first Panel proof.

### Fayz API storage/resolver implemented

Changed in `~/dev/fayz`:

- added Prisma model `ProjectAppManifest`;
- added migration `packages/db/prisma/migrations/20260613010000_add_project_app_manifest/migration.sql`;
- added project relation `Project.appManifests`;
- added service `apps/api/src/modules/projects/app-manifests.service.ts`;
- added controller `apps/api/src/modules/projects/app-manifests.controller.ts`;
- added routes:
  - `GET /api/projects/:projectId/app-manifests/active`
  - `POST /api/projects/:projectId/app-manifests`

### Verification

Passed:

```bash
pnpm --filter @wowsome/db generate
pnpm --filter @wowsome/db exec prisma validate
pnpm --filter @wowsome/api build
```

Known warning:

- Fayz root has `workspaces` warning under pnpm; existing repo config issue, not caused by this slice.
