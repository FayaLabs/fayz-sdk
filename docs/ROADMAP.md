# Fayz SDK — Roadmap & Contributor Map

Fayz is an AI app builder. The SDK is the engine underneath it: a small set of
**foundation packages** plus a catalog of **composable plugins**. Each plugin is a
self-contained vertical capability — a `PluginManifest` bundling navigation, routes,
entities, dashboard widgets, AI tools, settings, permissions and i18n — that snaps
into a `defineSaas()` app. A salon, a restaurant and a clinic are the *same engine*
with a different set of plugins enabled.

This document is the honest map of where each package stands and where it's going.
If you want to contribute, this is the place to find a starting point.

## How to use this map

- **State** tells you maturity:
  - **Solid** — works end-to-end, real provider, used in dogfood apps.
  - **Partial** — core flow works, notable pieces missing or mock-backed.
  - **Early scaffold** — UI/shape exists, mostly mock data, foundations to build on.
- **Gaps / missing features** are real, derived from the source — not a wishlist.
- **Good first contributions** are scoped enough to land in a single PR.

## How a plugin is built

Every plugin exports a factory — e.g. `createCrmPlugin(options)` — that returns a
`PluginManifest`. The contract lives in
[`packages/core/src/types/plugins.ts`](../packages/core/src/types/plugins.ts), and the
layering rules are in [`docs/architecture-blueprint.md`](./architecture-blueprint.md).
The fastest way to learn the shape is to read a **Solid** plugin
(`plugin-financial`, `plugin-inventory`, `plugin-agenda`) and mirror it.

Pick a "Good first contribution" below, open an issue or PR against
[`FayaLabs/fayz-sdk`](https://github.com/FayaLabs/fayz-sdk), and ship.

---

# Foundation packages

## sdk
**Package:** `@fayz-ai/sdk` · **State:** Solid
**What works today:** Typed Fayz client (`fayz.auth.me()`, `fayz.data` row CRUD with filters/paging), runtime OAuth broker (plugin grant exchange + Google Calendar), shop read provider, app-params resolution, and release-channel resolution. Has a vitest setup.
**Gaps / missing features:**
- Data client is row-oriented over Fayz tables only; no realtime/subscriptions, no batch/transaction support.
- Runtime broker is narrow — Google Calendar is the only first-class integration; other providers are generic OAuth exchange.
- `auth` surface is read-only (`me()`); no sign-in/sign-out/token-refresh helpers in this package.
- Shop provider is read-only (list products/orders/customers/discounts); no write/checkout path.
**Good first contributions:**
- Add `getRow`/single-record fetch to `data` alongside `listRows`.
- Add typed error helpers / retry wrapper around `FayzApiError`.
- Document and test the `release-channels` resolver edge cases (unknown channel, partial version sets).

## core
**Package:** `@fayz-ai/core` · **State:** Solid
**What works today:** Headless plugin runtime (`definePlugin`, runtime resolution, widget/zone resolution), multi-backend data providers (Supabase/Fayz API/mock/archetype + cache) behind one `DataProvider`, entity + uniform registry, app-manifest define/render/migrate/validate with JSON schema, blocks, i18n, router adapters, event bus.
**Gaps / missing features:**
- No test script in package.json (`build`/`typecheck`/`clean` only) — runtime resolution and migrations are untested at the package level.
- `check-manifest-contract.mjs` script implies the manifest contract is enforced by an external script, not types — drift risk.
- Two parallel router adapters (hash/window) but no history/Next adapter.
- Tenant context is global singleton DI (`setActiveTenantId`) — awkward for SSR/concurrent tenants.
**Good first contributions:**
- Add a vitest suite for `migrateManifest` / `validateManifest` round-trips.
- Add a `createMemoryProvider` or improve `createMockProvider` fixtures for plugin demos.
- Write a history-based `RouterAdapter` for Next/React Router apps.

## auth
**Package:** `@fayz-ai/auth` · **State:** Partial
**What works today:** Supabase and mock auth adapters behind the core `AuthAdapter` contract, a Zustand session store, and `AuthProvider` + `useAuth`. Small, clean surface.
**Gaps / missing features:**
- Only two adapters (Supabase, mock) — no OAuth-only, magic-link, or custom-JWT adapter exported.
- No tests; `main`/`types` point at `src/index.ts`.
- No password reset / email verification / MFA helpers surfaced from the hook.
- Session refresh and persistence behavior aren't documented or exported as a public API.
**Good first contributions:**
- Add an `createOAuthAuthAdapter` (or document Supabase OAuth flow through the existing adapter).
- Add vitest coverage for `useAuthStore` transitions using `createMockAuthAdapter`.
- Expose typed `signIn`/`signOut`/`refresh` helpers consistently across adapters.

## ui
**Package:** `@fayz-ai/ui` · **State:** Solid
**What works today:** Broad Radix+Tailwind primitive set, TanStack `DataTable`, full layout shell (AppShell/Sidebar/Topbar/ModulePage/SaveBar/transitions), theme token system with presets, and a dashboard widget kit with `defineKpiWidget`/`defineChartWidget`/`defineTableWidget` and recharts.
**Gaps / missing features:**
- No test script and no visual/regression tests — large component surface unverified.
- No Storybook or component catalog for a public component library.
- CRUD-view exports live in `@fayz-ai/saas`, not here, so the `./crud` entry is thin relative to its sibling layers (docs could clarify the split).
- Theming is token-based but there's no documented design-token reference.
**Good first contributions:**
- Stand up Storybook (or a docs site) for the primitives.
- Add a11y tests (axe) for Modal/Sheet/Dropdown/Select.
- Document the `createFayzTheme` token shape and the available `fayzThemePresets`.

## saas
**Package:** `@fayz-ai/saas` · **State:** Partial
**What works today:** `defineSaas`/`createSaasApp` manifest-first admin app, native CRUD engine (list/form/detail/card-grid/import/export), org multi-tenancy (Supabase/mock adapters, `useTenant`), permissions (`PermissionGate`, hooks), billing store (Stripe-backed types), and plugin framework UI.
**Gaps / missing features:**
- Source comments flag an in-progress de-bridge: the default `createCrudPage` and native shell "co-migrate atomically" with bridged pieces still present — architecture is mid-refactor.
- No test script in package.json; the orchestrator (`createSaasApp`) is large and untested at package level.
- Billing exposes a store + types but no Stripe checkout/webhook flow in this package — billing is type-shaped, not wired end-to-end.
- Permissions are runtime-gate driven; no documented policy/role authoring surface.
**Good first contributions:**
- Document the bridged-vs-native CRUD split and track the remaining de-bridge tasks.
- Add integration tests for `defineSaas` → rendered admin shell using `createMockOrgAdapter` + `createMockAuthAdapter`.
- Add an example wiring `useBillingStore` to a real Stripe subscription flow.

## db
**Package:** `@fayz-ai/db` · **State:** Early scaffold
**What works today:** A minimal Drizzle spine (`tenants`, `persons`, `orders`, `bookings`, `products`, `orderItems`, `saasCore`), column helpers (`tenantId()`, `timestamps`, `createdAt`), and a single-instance re-export of `drizzle-orm/pg-core`.
**Gaps / missing features:**
- Very small surface — spine tables are reference points; no relations, indexes, or RLS policy helpers exported.
- No migration tooling/helpers despite the description mentioning "migration helpers."
- No tests, no `orderItems`-to-`orders` relation helpers, no enum/status primitives shared by plugins.
- `saasCore` schema object is exported but undocumented.
**Good first contributions:**
- Add Drizzle `relations()` definitions for the spine tables.
- Add shared enum/status column helpers (e.g. order status, booking status) that plugins reuse.
- Document the Ring 0 / Ring 1 schema model and provide a sample `drizzle.config` composing spine + a plugin schema.

---

# Plugins — time & money

## plugin-agenda
**Package:** `@fayz-ai/plugin-agenda` · **State:** Solid
**What works today:** FullCalendar-based calendar at `/agenda` (day/week/month/list + resource time-grid) with booking types (appointment/task/block), time-aware statuses, working hours, conflict detection, drag-and-drop, and an optional financial bridge that auto-creates orders. Ships `listAppointments`, `createAppointment`, `checkAvailability` AI tools.
**Gaps / missing features:**
- `widgets: []` and no `dashboardWidgets` — agenda contributes nothing to the dashboard (no upcoming-appointments or occupancy widget) despite sibling plugins doing so.
- `confirmationChannels` is config plumbing only; no actual reminder/confirmation send (SMS/WhatsApp/email) is implemented.
- Single route (`/agenda`); no per-appointment deep-link route or shareable booking page.
- Recurring appointments are not modeled in options/config.
**Good first contributions:**
- Add an `upcomingAppointments` dashboard widget using the existing provider/store.
- Wire `checkAvailability` to respect the `scheduleBlockDefaults` buffer/concurrency config.
- Add a `defaultEnabled`/options flag and UI for recurring bookings.

## plugin-financial
**Package:** `@fayz-ai/plugin-financial` · **State:** Solid
**What works today:** Full `/financial` page with receivables, payables (incl. recurring), cash registers, statements, commissions, and cards (overview + reconciliation), all toggleable modules. Invoice list/detail/form with configurable item types and entity lookups. Dashboard KPIs (balance/receivable/payable), cash-flow chart, breakdown/overdue panels, recent-transactions table. AI tools: `getRevenue`, `createInvoice`, `listPayables`.
**Gaps / missing features:**
- No payment-gateway integration (MercadoPago/Pix per platform direction) — invoices are recorded, not collected.
- `enableServiceExecution` exists but service-execution tracking is opt-in/partial; no docs on its full behavior.
- No export (CSV/PDF) of financial statements from the views, unlike `plugin-reports`.
- Card reconciliation view exists but acquirer/statement import is manual.
**Good first contributions:**
- Add CSV export to `StatementsView` / `InvoiceListView`.
- Add a `getCommissions` AI tool mirroring `getRevenue`.
- Document and harden the `enableServiceExecution` flow on invoice items.

## plugin-reports
**Package:** `@fayz-ai/plugin-reports` · **State:** Partial
**What works today:** Config-driven reports at `/reports` — a searchable report hub plus a single-report viewer with declarative `ReportDef` (columns, filters, date ranges, badges, data source), date presets, currency formatting, and CSV/Excel/PDF export. Supabase-or-mock provider exported for custom wiring.
**Gaps / missing features:**
- `reports` is a required option with no bundled/default report set — an app gets an empty hub until it declares its own.
- No `aiTools`, no `dashboardWidgets`, and `registries: []` — reports don't surface to the assistant or dashboard.
- No charting in the viewer; output is tabular only (despite the analytics framing).
- No scheduled/emailed report delivery.
**Good first contributions:**
- Ship a small library of default `ReportDef`s for the financial/agenda data sources.
- Add a chart/visualization option to `ReportViewer` driven by `ReportDef`.
- Add a `runReport` AI tool that executes a declared report by id.

## plugin-tasks
**Package:** `@fayz-ai/plugin-tasks` · **State:** Solid (intentionally minimal)
**What works today:** Self-installing task plugin (bundled `tsk_tasks` / `tsk_labels` migration with tenant RLS). Topbar drawer widget at `shell.topbar.end` for quick-add; tasks with status, priority, due date, labels, assignee, and subtasks. `getTasksSummary` AI tool. Settings tab, i18n, Supabase-or-mock auto-selection.
**Gaps / missing features:**
- No navigation entry or full-page board/list view — tasks live only in the topbar drawer (`navigation: []`, `routes: []`).
- Only one AI tool (`getTasksSummary`, read-only); no `createTask` / `completeTask` persist tools.
- No `dashboardWidgets` (e.g. "tasks due today" KPI).
- Labels table exists but no label-management UI beyond settings.
**Good first contributions:**
- Add a `createTask` AI tool (`mode: 'persist'`) using the existing store/provider.
- Add an optional full-page Kanban/list route behind a `navSection`/`navPosition` option.
- Add a "due today / overdue" dashboard widget.

---

# Plugins — commerce

## plugin-shop
**Package:** `@fayz-ai/plugin-shop` · **State:** Partial
**What works today:** A `/shop` admin page (products, orders, customers, discounts) rendered via `@fayz-ai/shop` provider, scoped to the active org. Two read AI tools (`listProducts`, `listOrders`) and a currency-aware settings tab.
**Gaps / missing features:**
- No dashboard widgets (`widgets: []`, no `dashboardWidgets`) — shop contributes nothing to the home/overview.
- AI tools are read-only; no create/update product or order tools, despite the manifest re-exporting `CreateProductInput` / `CreateOrderInput`.
- Settings tab is hardcoded Portuguese and not i18n'd; no `locales` on the manifest.
- Single bundled page component; no deep-link sub-routes for product/order detail.
**Good first contributions:**
- Add a low-stock / pending-orders dashboard KPI widget.
- i18n the settings tab and add a `locales` bundle.
- Add `createProduct` / `updateOrderStatus` persist-mode AI tools wired to `ShopProvider`.

## plugin-orders
**Package:** `@fayz-ai/plugin-orders` · **State:** Partial
**What works today:** An `/orders` kanban + history page, provider-first (mock + `createFayzOrdersProvider`), configurable order sources/currency/labels, three AI tools including a persist-mode `createOrder`, settings panel, and locales.
**Gaps / missing features:**
- Only one view file (`OrderKanbanView`); "history" / order-detail surfaces appear thin or page-embedded.
- No dashboard widgets even though `getOrdersSummary` computes revenue/avg-ticket — a natural KPI source.
- `onOrderCompleted` is the only lifecycle hook; no events for status transitions or payment.
- Hard `dependencies: ['menu']` with no graceful degradation if menu is absent.
**Good first contributions:**
- Add today-revenue / active-orders dashboard KPI widgets backed by the summary.
- Build an order-detail view and a dedicated history/list view.
- Add status-transition lifecycle hooks (e.g. `onStatusChanged`).

## plugin-menu
**Package:** `@fayz-ai/plugin-menu` · **State:** Partial
**What works today:** A `/menu` manager page (items + categories), provider-first (mock + `createFayzMenuProvider`), `modifiers`/`deliveryPricing` modules, two AI tools (`listMenuItems`, `toggleMenuItemAvailability`), settings panel, and locales. Public domain types exported.
**Gaps / missing features:**
- Single view file (`MenuManagerView`); no dedicated category manager, modifier editor, or item-detail route.
- No dashboard widgets — menu contributes nothing to the home/overview.
- AI tools cover list + availability toggle only; no create/update/price item tools.
- `deliveryPricing` module is exposed but its UI surface is unclear from the manifest.
**Good first contributions:**
- Add a `createMenuItem` / `updateMenuItem` persist AI tool.
- Build a standalone category + modifier management view.
- Add a "menu health" dashboard widget (sold-out count, item count).

## plugin-inventory
**Package:** `@fayz-ai/plugin-inventory` · **State:** Solid
**What works today:** An `/inventory` surface (catalog, stock entry/exit, movement history, recipes) with a real Supabase provider that safely falls back to mock. Five dashboard widgets, declared features, a `getLowStock` AI tool, settings, and locales.
**Gaps / missing features:**
- Only one AI tool (`getLowStock`, read); no stock-adjustment, receive-stock, or recipe-cost persist tools.
- `batchTracking` module is an option flag but its end-to-end support is unverified from the manifest.
- No order/menu consumption wiring surfaced here (recipes exist, but stock deduction on sale lives elsewhere).
- Settings is a single general tab; locations are passed via options rather than managed in-UI.
**Good first contributions:**
- Add a `receiveStock` / `adjustStock` persist AI tool.
- Add a location management UI (currently config-only via `locations`).
- Add a stock-movement trend dashboard widget beyond the recent-activity panel.

---

# Plugins — CRM & engagement

## plugin-crm
**Package:** `@fayz-ai/plugin-crm` · **State:** Solid
**What works today:** Full `/sales` workspace (dashboard, pipeline, leads, deals, quotes, activities) with configurable labels/stages/sources, currency-aware quotes, lead→client conversion, dashboard widgets, two AI tools (`countCustomers`, `listLeads`), and a mock/Supabase data-provider seam.
**Gaps / missing features:**
- Only read-mode AI tools — no create/update tools (create lead, advance deal, generate quote) despite `persist` mode existing in sibling plugins.
- No domain `events` emitted (CRM doesn't broadcast lead/deal/quote lifecycle events that marketing/automations could subscribe to).
- `clientConversion` is single-archetype; no multi-archetype or reversible conversion.
- Pipeline is a view, not a true drag-and-drop kanban surface.
**Good first contributions:**
- Add `createLead` / `convertLead` AI tools (mirror marketing's `createCampaign`).
- Emit `crm.lead.created` / `crm.deal.won` / `crm.quote.sent` events.
- Add a `dealStages` validation helper (probabilities should be monotonic / 0–100).

## plugin-marketing
**Package:** `@fayz-ai/plugin-marketing` · **State:** Partial
**What works today:** Full `/marketing` workspace (overview, channels, campaigns + composer, funnel, landing pages) computed generically over a `domain` preset; four AI tools incl. `createCampaign`; lifecycle events; dashboard widgets and Settings. Runs on a vertical-flavored mock.
**Gaps / missing features:**
- No real data — `createSafeProvider` always returns the mock; `AttributionBridge` and `SitesPerformanceBridge` are declared seams with no concrete implementations.
- No Supabase-backed provider (comment says "land later").
- Outbound broadcasts / journeys are reserved behind flags, not implemented.
- `createCampaign` likely writes to the mock only (no persistence path).
**Good first contributions:**
- Implement a `createSupabaseMarketingProvider` reading campaigns/channels.
- Provide a reference `AttributionBridge` that reads conversions from `plugin-crm` / orders.
- Wire `marketing.conversion.tracked` to actually fire on attributed events.

## plugin-conversations
**Package:** `@fayz-ai/plugin-conversations` · **State:** Early scaffold
**What works today:** Full-bleed `/conversations` inbox UI on a Zustand store, a `ConversationsProvider` seam with mock + Supabase providers (tenant-scoped, reads/writes `conversations` + `conversation_messages`), two AI tools (`listConversations`, `sendMessage`), and message events.
**Gaps / missing features:**
- No real channel connectors — Twilio, WhatsApp Cloud, Meta, IMAP are all next-milestone; `sendMessage` doesn't dispatch to a real channel.
- No inbound webhook/ingestion path for `conversations.message.received`.
- No per-channel auth/settings UI (no Settings tab in the manifest).
- Package is `private: true` — not yet published.
**Good first contributions:**
- Add a Settings tab for channel connection state.
- Implement one real connector end-to-end (e.g. WhatsApp Cloud send + inbound webhook).
- Add channel filtering/unread state to `InboxView` matching the `listConversations` enum.

## plugin-reputation
**Package:** `@fayz-ai/plugin-reputation` · **State:** Early scaffold
**What works today:** A single polished `/reputation` home — average rating, star-distribution bars, review feed with reply actions, and a "Request reviews" CTA — rendered from mock data.
**Gaps / missing features:**
- No data-provider seam, store, options for data, or backend — everything is inline constants in `ReputationHome.tsx`.
- No AI tools, no events, no Settings tab, no i18n/locales (unlike the other engagement plugins).
- No Google/Facebook review sync and no automated review-request flow.
- Package is `private: true` — not yet published.
**Good first contributions:**
- Extract a `ReputationProvider` seam + mock provider (mirror conversations' data layer).
- Add `replyToReview` / `requestReview` AI tools and reputation events.
- Add locales + a Settings tab for connected review sources.

---

# Plugins — build & content

## plugin-forms
**Package:** `@fayz-ai/plugin-forms` · **State:** Partial
**What works today:** Template/document data model over Supabase `frm_*` tables (mock fallback), a `form-categories` registry, a `person.detail.documents` widget, a settings tab, a `registerDocumentTypeProvider` extension API, and two read-only AI tools (`listFormTemplates`, `listDocuments`). Factory: `createCustomFormsPlugin`.
**Gaps / missing features:**
- `navigation` and `routes` are empty — no standalone forms page; documents are reachable only via the person-detail widget and settings tab.
- No actual form-builder/renderer surfaced in the manifest (`TemplateListView` exists but isn't wired to a route).
- E-signature is implied (status `signed`) but no signing flow is exposed.
- No write/persist AI tools — assistant can read templates/documents but not create or fill them.
**Good first contributions:**
- Add a `/forms` route + nav entry wiring `TemplateListView` into the manifest.
- Add a `fillDocument`/`createTemplate` persist AI tool behind `custom_forms:edit`.
- Document the `frm_*` schema and the `registerDocumentTypeProvider` contract with an example.

## plugin-sites
**Package:** `@fayz-ai/plugin-sites` · **State:** Early scaffold
**What works today:** A universal plugin with a `/sites` nav entry + route rendering `SitesHome` — a static mock of funnels, landing pages, and websites with visits/conversion stats. Declares the `sites` feature.
**Gaps / missing features:**
- Entirely mock — `SITES` is a hardcoded array; no data provider, store, or persistence.
- No drag-and-drop page/block builder (explicitly deferred).
- No public-facing rendered pages or funnels; no lead capture into the tenant.
- No AI tools, no settings tab, no entities/registries.
**Good first contributions:**
- Define a `SitesDataProvider` interface + mock provider mirroring the forms/tables pattern.
- Add an entity/registry for sites so the list reads from data instead of constants.
- Add an `options.dataProvider` to the factory and wire `SitesHome` to it.

## plugin-tables
**Package:** `@fayz-ai/plugin-tables` · **State:** Partial
**What works today:** A vertical-scoped plugin with a `/tables` floor-plan view, configurable zones, optional reservations/session-history modules, `onTableSeated`/`onTableClosed` hooks, a settings tab, a registries-backed model, locales, and two AI tools (`getTableAvailability`, `seatGuests`). Ships a mock provider plus an exported `createFayzTablesProvider`.
**Gaps / missing features:**
- Defaults to the mock provider — real persistence requires explicitly passing `createFayzTablesProvider`.
- `reservations` and `sessionHistory` are option flags, but only `FloorPlanView` is rendered in `TablesPage`; reservation/history views aren't surfaced.
- No dashboard widgets despite live-status data being a natural overview candidate.
**Good first contributions:**
- Render reservation and session-history views in `TablesPage` when the modules are enabled.
- Add a `dashboardWidgets` entry summarizing occupancy/turn time.
- Add a persist AI tool for closing/transferring a table to complement `seatGuests`.

## plugin-automations
**Package:** `@fayz-ai/plugin-automations` · **State:** Early scaffold
**What works today:** A universal plugin with an `/automations` nav entry + route rendering `AutomationsHome` — a static mock of workflows (trigger, multi-step sequence, enrollment counts). Declares the `automations` feature.
**Gaps / missing features:**
- Entirely mock — `WORKFLOWS` is hardcoded; no data layer, store, or persistence.
- No execution engine: triggers and actions are display-only; nothing runs against the core event bus or scheduler.
- No workflow editor/builder UI, no AI tools, no settings tab.
**Good first contributions:**
- Define `Workflow`/`Trigger`/`Action` types + an `AutomationsDataProvider` with a mock.
- Wire `AutomationsHome` to a provider so workflows load from data.
- Prototype a single trigger→action handler bound to one core event (e.g. `form.submitted`) to prove the engine path.

---

# Plugins — insight & learning

## plugin-dashboard
**Package:** `@fayz-ai/plugin-dashboard` · **State:** Solid
**What works today:** Provides the `/` home surface (`DashboardCanvas`) driven by a widget registry; turns `metrics`/`sections`/`onboardingSteps`/`customWidgets` into widgets, supports app-level `layout` curation, a shared `range` control, per-surface user preferences, a `getKpiSummary` AI tool, and i18n. Other plugins contribute `dashboardWidgets` that render here automatically.
**Gaps / missing features:**
- `getKpiSummary` is dashboard-generic; no per-widget/chart/table AI introspection tools.
- No drag-and-drop reordering on the home — ordering is via `defaultOrder` + app `layout`, not interactive.
- The factory only auto-builds KPI/section/onboarding widgets; richer chart/table widgets must be hand-defined by other plugins.
- No built-in widget refresh wiring beyond `range.onChange` — the app must drive refetching.
**Good first contributions:**
- Add `charts?:` / `tables?:` convenience arrays to the factory mirroring `metrics`.
- Wire an optional drag-to-reorder UI on top of the per-surface preferences store.
- Add AI tools for chart/table widgets so an assistant can read trend/series data, not just KPIs.

## plugin-courses
**Package:** `@fayz-ai/plugin-courses` · **State:** Partial
**What works today:** Admin nav entry plus `/courses` list (create-and-open, draft/published/archived) and `/courses/:id` editor with Details + Curriculum tabs (modules and lessons). Runs on the `@fayz-ai/courses` provider with a bundled mock fallback; self-registers the `courses` factory; full i18n.
**Gaps / missing features:**
- No dashboard widgets, AI tools, settings tab, or permissions declared in the manifest.
- Enrollments/progress exist in the provider contract but the admin pages don't surface enrollment management or learner progress views.
- Package is `private: true` at `0.1.0` — not yet published.
- Curriculum editing lacks lesson content/media authoring beyond basic structure.
**Good first contributions:**
- Add an "Enrollments" tab to the course editor reading `listEnrollments`/`listProgress`.
- Contribute `dashboardWidgets` (active courses, total enrollments) into the dashboard home.
- Add a Supabase-backed `CoursesProvider` implementation alongside the mock.
