# M5 App Smoke Harness — industry pools

Status: authored 2026-07-14 (feat/industry-pools). Purpose: per-app manual smoke
after each app's pool is converted (M3) and the SDK publish wave lands (M4). This
file is **authoring only** — do NOT run any create-record step against a live pool
until the founder gates M3/M4. `beauty-saas` is REAL clinic data (read-mostly).

Each app already has a `feat/industry-pools` branch with tarball SDK deps + pool
repoint. Dev ports were pinned on that branch (this commit wave). Start command is
`npm run dev` from the app dir; the port is fixed via `strictPort` so a busy port
fails loudly instead of drifting.

## Quick table

| App | Dir | Port | Pool (cluster / projectRef) | tenant / store id | Auth smoke | Create-record smoke |
|---|---|---|---|---|---|---|
| beauty-saas | ~/dev/fayz-app/beauty-saas | 5301 | cluster-salon-br-01 / gphxclpkbtbucoqclbco — **REAL DATA, read-mostly** | runtime (getActiveTenantId, post-login membership) | admin shell, split login, email+password (+Google OAuth) | `/clients/new` create client — **SCRATCH TENANT ONLY**, never the live clinic tenant |
| resto-saas | ~/dev/fayz-app/resto-saas | 5302 | cluster-restaurant-br-01 / mgctsbkyykomwaopkbjm (3 tenants) | TBD post-conversion (runtime) | admin shell, split login, email+password (mock adapter while `VITE_SUPABASE_URL` blank) | `/menu` (Cardápio) create a menu item |
| agency-os | ~/dev/fayz-app/agency-os | 5303 | cluster-agency-br-01 / bcxumqjrduekrsasduwe (1 tenant) | TBD post-conversion (runtime) | admin shell, split login, email+password (+Google); unmock gated by `VITE_SUPABASE_ENABLED` | `/contacts` create a CRM contact |
| artorious-shop | ~/dev/fayz-app/artorious-shop | 5304 | cluster-ecommerce-br-01 / yfxutrkyhydgltakbqle | store `PUBLIC_FAYZ_STORE_ID` = 10000000-0000-4000-8000-000000000104 | storefront, **guest checkout — no login gate** (optional `/account`) | `/` → add to cart → `/checkout` (guest) → place order → `/order/:id` |
| marketplace-saas | ~/dev/fayz-app/marketplace-saas | 5305 | cluster-ecommerce-br-01 / yfxutrkyhydgltakbqle | store `VITE_FAYZ_STORE_ID` = 10000000-0000-4000-8000-000000000101 (aurora/shopfront) | admin shell (surface:'admin', **not** a storefront), split login, email+password | Shop admin → create a Product (cheapest shop write) |
| course-admin | ~/dev/fayz-app/course-admin | 5306 | — | — | **SKIPPED** (no feat/industry-pools branch; shared repo on Vini's Lovable WIP) | — |
| hempdent | ~/dev/fayz-app/hempdent | 5307 | cluster-dentist-br-01 / mcbfebruhimlbvlvczsn (intended; see drift note) | HEMPDENT_TENANT_ID = 11111111-1111-4111-8111-000000000001 | public booking site — no admin login; phone captured in booking flow | `/agendar` complete a booking |
| great-djs-school | ~/dev/fayz-app/great-djs-school | 5308 | cluster-school-br-01 / pjugfwxomeohuaxyjtyu (intended; see drift note) | GREAT_TENANT_ID = 22222222-2222-4222-8222-000000000001 | public booking site — no admin login | `/agendar` complete a booking |
| espaco-renova-rio | ~/dev/fayz-app/espaco-renova-rio | 5309 | cluster-salon-br-01 / gphxclpkbtbucoqclbco (via `VITE_FAYZ_CALENDAR_URL`, distinct from site's own Supabase) | RENOVA_TENANT_ID = 33333333-3333-4333-8333-000000000001 | public booking site — no admin login | `/agendar` complete a booking |

Anon keys for the three booking sites (hempdent/great-djs/espaco) are still
`PENDING_POOL_ANON_KEY` — fill at M3 step 5 (post pool provisioning) before smoke.

## Per-app detail

### beauty-saas (5301) — cluster-salon-br-01 · REAL DATA (read-mostly)
- Start: `cd ~/dev/fayz-app/beauty-saas && npm run dev` → http://localhost:5301
- Surface: `renderApp(beautyManifest, { surface: 'admin' })`.
- Auth smoke: hit `/`; unauthenticated shell renders the split login (config
  `auth.loginLayout: 'split'`, `showOAuth: true`, `oauthProviders: ['google']`).
  Sign in with **email + password** (or Google). Session → active tenant resolved
  via `getActiveTenantId()` from the user's membership.
- Create-record smoke: nav `/clients` → `/clients/new` (createCrudPage(clientEntity)).
  **Guardrail: this pool holds the live clinic's real client data. The create MUST
  target a SCRATCH tenant** (a throwaway tenant + membership), never the real clinic
  tenant. Treat everything else as read-only.
- Post-conversion follow-ups (from tracker): app's own `appointments` extension was
  renamed `appointment_execution`; move `legacy_pre_pools.appointments` rows into it.
  Verify `v_clients`/`v_staff` app views survive the OID re-render. Re-run drizzle
  regen + seed-saas-core re-home.

### resto-saas (5302) — cluster-restaurant-br-01
- Start: `cd ~/dev/fayz-app/resto-saas && npm run dev` → http://localhost:5302
- Surface: admin. Note: `.env` `VITE_SUPABASE_URL` is blank → runs in mock / runtime-API
  mode (auth+org come from the mock adapter) until the pool URL/key are filled.
- Auth smoke: `/` → split login, email+password (+Google). In mock mode any
  credentials pass; against the real pool use a seeded restaurant-tenant user.
- Create-record smoke: nav `/menu` (Cardápio, menu plugin) → create a menu item
  (cheapest write). App also carries `restaurant_orders`/`restaurant_order_items`
  drizzle extension tables (renamed from orders/order_items at restaurant conversion).
- tenantId: TBD — fill after conversion picks the runtime tenant.

### agency-os (5303) — cluster-agency-br-01
- Start: `cd ~/dev/fayz-app/agency-os && npm run dev` → http://localhost:5303
- Surface: admin. Unmock gated by `VITE_SUPABASE_ENABLED` (leave unset for mock; set
  to flip to the pool). CRM `conversations` FK/RLS re-point handled by converter Fix 5.
- Auth smoke: `/` → split login, email+password (+Google).
- Create-record smoke: nav `/contacts` (createCrudPage(contactEntity)) → create a CRM
  contact (person kind=contact + `public.contacts` Ring-2 extension).
- tenantId: TBD post-conversion.

### artorious-shop (5304) — cluster-ecommerce-br-01
- Start: `cd ~/dev/fayz-app/artorious-shop && npm run dev` → http://localhost:5304
- Surface: `createStorefront(...)` — public storefront, not an admin.
- Auth smoke: **none required** — checkout is guest. (Optional customer account at
  `/account` if `features.accounts` on.)
- Create-record smoke (place test order): `/` home → open a product `/product/:slug` →
  add to cart → `/checkout` (guest form testids: checkoutEmail/checkoutName/
  checkoutStreet/checkoutCity/checkoutZip/checkoutCard/checkoutExpiry) → place order →
  lands on `/order/:id` confirmation. Store scoped by `PUBLIC_FAYZ_STORE_ID`
  (10000000-0000-4000-8000-000000000104).

### marketplace-saas (5305) — cluster-ecommerce-br-01
- Start: `cd ~/dev/fayz-app/marketplace-saas && npm run dev` → http://localhost:5305
- Surface: `renderApp(marketManifest, { surface: 'admin' })` — this is the **shop
  admin** ("Mercado"), NOT a storefront. There is no `/checkout`; a "place order via
  storefront" step does not apply here.
- Auth smoke: `/` → split login (config `loginLayout: 'split'`), email+password.
  Post-conversion: create a user + tenant membership for store
  10000000-0000-4000-8000-000000000101 (aurora/shopfront) so login resolves a tenant.
- Create-record smoke: Shop plugin admin → create a **Product** (cheapest shop write;
  `createShopPlugin` with `getMarketShopProvider`, `VITE_FAYZ_STORE_ID`
  = 10000000-0000-4000-8000-000000000101).

### hempdent (5307) — cluster-dentist-br-01 (booking site)
- Start: `cd ~/dev/fayz-app/hempdent && npm run dev` → http://localhost:5307
- Booking backend: `createPublicBookingPlugin({ tenantId: HEMPDENT_TENANT_ID })`,
  global Supabase client → dentist pool (code fallback `mcbfebruhimlbvlvczsn`), anon
  key `PENDING_POOL_ANON_KEY`.
- **DRIFT to fix at M3:** `.env` currently sets `VITE_SUPABASE_URL=…yfxutrkyhydgltakbqle`,
  which overrides the dentist fallback at runtime. Update `.env` to the dentist pool
  URL + real anon key when filling keys, or the booking client will hit the wrong pool.
- Auth smoke: no admin login. Booking flow captures the customer's phone/details; the
  booking→auth bridge runs inside `/agendar`. Public route (guard:'public').
- Create-record smoke: `/agendar` — pick service (from `v_public_services`) → slot
  (`get_available_slots`) → enter contact details → confirm → writes via
  `create_public_booking` RPC scoped by `HEMPDENT_TENANT_ID`.

### great-djs-school (5308) — cluster-school-br-01 (booking site)
- Start: `cd ~/dev/fayz-app/great-djs-school && npm run dev` → http://localhost:5308
- Booking backend: `createPublicBookingPlugin({ tenantId: GREAT_TENANT_ID })` → school
  pool (code fallback `pjugfwxomeohuaxyjtyu`), anon `PENDING_POOL_ANON_KEY`. Bespoke
  pt-BR tables + 25 real leads preserved in this pool — read-mostly outside the smoke.
- **DRIFT to fix at M3:** `.env` `VITE_SUPABASE_URL=…yfxutrkyhydgltakbqle` overrides the
  school fallback — repoint to the school pool URL + anon key at key-fill.
- Auth smoke: no admin login (public booking).
- Create-record smoke: `/agendar` — same flow as hempdent, scoped by `GREAT_TENANT_ID`.

### espaco-renova-rio (5309) — cluster-salon-br-01 (booking site)
- Start: `cd ~/dev/fayz-app/espaco-renova-rio && npm run dev` → http://localhost:5309
- Booking backend: `createPublicBookingPlugin({ tenantId: RENOVA_TENANT_ID })` reads
  **`VITE_FAYZ_CALENDAR_URL` / `VITE_FAYZ_CALENDAR_ANON_KEY`** (distinct from the site's
  own Supabase project used by `src/integrations/supabase/client.ts`). Fallback URL =
  salon pool `gphxclpkbtbucoqclbco`; anon `PENDING_POOL_ANON_KEY`. No yfxu drift here
  because the calendar vars are separate from `VITE_SUPABASE_URL`.
- Note: salon pool is REAL clinic data (converted LAST, read-only gate) — the booking
  write on the seeded RENOVA_TENANT is the only mutation; keep everything else read-only.
- Auth smoke: no admin login (public booking).
- Create-record smoke: `/agendar` — same flow, scoped by `RENOVA_TENANT_ID`.

## Skipped

- **course-admin (5306):** no `feat/industry-pools` branch (local or remote). Repo is
  shared with Vini's Lovable.dev WIP and currently on `feat/admin-plugin-manifest`.
  Not touched. Revisit once a `feat/industry-pools` branch is cut for it.

## Boot verification (this commit wave)

All 8 in-scope apps booted `npm run dev` on their pinned port and returned HTTP 200
on `/` (server killed after). Apps may render an error/empty state until their pool is
converted + anon keys filled — boot (not data) is what this step verifies.
