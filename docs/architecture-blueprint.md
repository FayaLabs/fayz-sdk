# Fayz Micro-SaaS Generator — Architecture Blueprint

> **Status:** Founding document, v1 (2026-06-11).
> **Companion docs:** `architecture-boundaries.md` (the ownership contract), `architecture-v2.md` (manifest-first design), `agent-guide.md` (how to *consume* the SDK).
> **Inputs:** full code exploration of `beautyplace` (legacy prototype, ~48 routes), `beauty-saas` (first SDK consumer), `fayz-sdk` (this repo), plus a live Playwright validation session of beauty-saas on 2026-06-11.

---

## 1. Vision & Non-Goals

**The generator thesis.** One abstraction set → N vertical SaaS products. Every business concept is built **once**, at the right layer, as a vertical-agnostic block; a new SaaS product is then a *composition* (config + plugins + theme + locale), not a codebase. The long-term ambition is an enterprise-grade micro-SaaS generator — the modular breadth of an ERP suite (SAP-class scope: scheduling, CRM, inventory, finance, fiscal compliance, messaging, analytics) with the per-vertical fit and iteration speed of a micro-SaaS.

The proof of the thesis is structural, not rhetorical: **a capability counts as "abstracted" only when two different vertical apps consume it with config-only changes** (see the dual-consumer rule, §8).

**Non-goals (what stays per-app forever):**
- Domain vocabulary: labels, entity kinds, status names, nav order, KPI selection.
- Brand: theme, logo, copy, onboarding text.
- Vertical-unique extension tables (e.g. `pet_species`) and their `EntityDef`s.
- Pricing/plan packaging per product.

---

## 2. The Layer Model (the blocks)

The scopes already exist as types (`PluginScope` in `packages/core/src/types/plugins.ts`); this section gives them **placement criteria** so every future concept has a deterministic home.

### L0 — `@fayz-ai/core` (headless kernel)
Contracts and runtime only: `EntityDef`/`FieldDef`, archetypes, `DataProvider`, `PluginManifest` + runtime, router, i18n, widget zones, aiTools — plus the new primitives in §4.

**Litmus tests:**
- Zero React-UI opinion beyond `ComponentType` slots.
- Every plugin (even a non-SaaS scaffold like storefront) could need it.
- It is a *contract*, not a feature.
- **Negative test:** if it names a business noun, it does not belong here. Core knows `schedule`, never "appointment"; `person`, never "client".

### L1 — `@fayz-ai/auth`, `@fayz-ai/saas`, `@fayz-ai/ui` + shared service packages (`@fayz-ai/shop`, future `@fayz-ai/messaging`)
- `@fayz-ai/saas`: anything whose removal breaks the **app shell itself**, not a feature — `createSaasApp`, `createCrudPage`, OrgAdapter/tenancy, RBAC, billing, the settings hub (live-verified: the SDK already ships a full settings shell — Geral, Perfil, Segurança, Marca, Equipe, Permissões, Locais, Regras de Campos + per-plugin tabs).
- `@fayz-ai/ui`: pure presentation. Test: could a landing page use this component with zero providers mounted?
- Shared service packages follow the `@fayz-ai/shop` pattern (provider + tenant resolver, no UI) when a domain service layer is consumed by 2+ scaffolds or plugins.
- **Rule:** a DB table with identical shape across verticals consumed by 2+ plugins → `saas_core` archetype table or an L1 service package — never plugin-private.

### L2 — Universal plugins (`scope: 'universal'`)
dashboard, agenda, crm, financial, inventory, reports, tasks, forms — plus the new ones in §6.

**Litmus tests:**
- ≥3 of the 5 verticals (`beauty/food/health/services/retail`) would install it with **config-only** changes (labels, lookups, `archetypeKind`s — the agenda plugin's `bookingKind: 'appointment'` config in beauty-saas is the reference pattern).
- Owns its own tables via `PluginMigration`, but touches shared data only through archetypes/lookups/events/exported providers — never another plugin's private tables.

### L3 — Vertical plugins (`scope: 'vertical'`, `verticalId` set)
menu, tables (food); future kitchen (food), treatment-records (health).

**Litmus tests:**
- The *workflow shape* (state machine), not just the labels, is vertical-specific — a kitchen queue cannot be expressed by relabeling a universal plugin.
- It composes universal plugins rather than reimplementing them.
- **Anti-test:** writing the same vertical plugin twice with different nouns means it was actually universal.

### L4 — Addon plugins (`scope: 'addon'`)
fiscal-br, banking-br, channel-whatsapp/sms/email, payments-pix/stripe.

**Litmus tests:**
- Implements a **driver interface declared lower in the stack** (connector framework, §4.7).
- Removal degrades a feature gracefully; it never owns a primary nav page.
- Jurisdiction-, regulation-, or third-party-API-specific? → always addon.

### L5 — Tenant plugins + per-app config
Labels, lookups, theme, KPI selection, permission profiles, registries with `seedData`, vertical-unique `EntityDef`s.

### Placement decision table

| Question (first "yes" wins, top-down) | Layer |
|---|---|
| Is it a contract every layer above needs? | L0 `@fayz-ai/core` |
| Does removing it break the app shell, not a feature? | L1 `@fayz-ai/saas` / `@fayz-ai/ui` |
| DB table identical across verticals, consumed by 2+ plugins? | `saas_core` archetype / L1 service package |
| Driver for an external system or jurisdiction? | L4 addon |
| Workflow shape unique to one vertical? | L3 vertical plugin |
| Feature installable by ≥3 verticals with config-only changes? | L2 universal plugin |
| Labels, enums, lookups, theming, composition? | L5 app config / registries |

### Dependency rules between layers
- Imports flow downward only (L5 → … → L0).
- Universal plugins may depend on L1 services and on **at most one** other universal plugin.
- Addons depend on exactly the plugins/interfaces whose drivers they implement.
- Cross-plugin data flows use archetypes, the event bus (§4.1), or exported providers (the `createSafeFinancialProvider` pattern) — **never direct cross-plugin table reads**.

---

## 3. Data Architecture

- **Archetype tables** (`saas_core.*`): `persons`, `products`, `services`, `categories`, `locations`, `schedules`, `orders` — polymorphic via `kind` (`archetypeKind`). Live-verified: this works well — agenda reads `persons?kind=staff` and immediately sees staff created by the app's registry.
- **Extension tables**: app- or plugin-owned rows keyed to an archetype row (`staff_members` → `persons`, `clients` → `persons`). Live-verified: creating a Professional writes `persons` then `staff_members` in one flow (two POSTs, both 201).
- **Plugin-owned tables**: created via `PluginMigration`; private to the plugin; exposed only through providers/views.
- **Views as the read contract for cross-domain reads**: `v_bookings` (live-verified working) is the pattern — reports/dashboard read views, never plugin internals. The missing `rep_*` views are instances of this contract not yet fulfilled.
- **`metadata` JSONB on archetype rows** is the escape hatch for tenant custom fields (§4.11) — never add per-tenant columns.

---

## 4. Missing Core Primitives (the gap that matters most)

Everything below was repeatedly reinvented in beautyplace as one-off features. Each is a core contract (`packages/core/src/types/`) + reference implementation. Ordered roughly by leverage.

### 4.1 Event/automation bus
`PluginManifest.events?: PluginEventDefinition[]` (sibling of `aiTools`); plugins emit (`booking.confirmed`, `order.paid`, `stock.below_minimum`), subscribers bind `{ event, condition?, action }`. The substrate for message triggers, commission accrual, waitlist offers, campaign automation. The existing `createFinancialBridge` and the `window.dispatchEvent('agenda:open-booking')` hack in beauty-saas are evidence this is overdue — both become ordinary event subscriptions.

### 4.2 Entity attachments & media
`saas_core.attachments` (`entity_archetype`, `entity_id`, `kind`, storage path, metadata, folder) + `AttachmentProvider` + a generic attachments `DetailTab` in `@fayz-ai/ui`. Absorbs beautyplace's client photos/folders, client files, NF-e XMLs, form captures, contract PDFs. The client detail page already has a "Documentos" tab slot (live-verified) — this primitive fills it for every entity, every vertical.

### 4.3 Document/template engine
Template (merge fields bound to `EntityDef` paths) → rendered HTML/PDF → stored as attachment. One merge-field resolver shared by: contracts, quotes, receipts, **and message templates** (§4.4 of the messaging stack). Absorbs beautyplace's contract templates + generation.

### 4.4 Public surface + share tokens — *highest leverage single gap*
`PluginRouteDefinition.guard` currently knows `'authenticated' | 'role'`; add `'public' | 'share-token'` + `saas_core.share_tokens` (scope, entity ref, expiry, capabilities). **Five** flagship beautyplace features hang off this one primitive: public booking wizard, client self-service portal (`/cliente/:token`), TV/KPI panel share links, public digital menu, quote-approval links. Live-verified in beautyplace: `/cardapio-digital` runs unauthenticated today; the SDK has no equivalent.

### 4.5 Metric registry
`PluginManifest.metrics?: MetricDefinition[]` — every plugin publishes computable metrics (id, category, format, compute/dataSource); dashboard, reports, and a future KPI-panel builder all consume the registry. Today beauty-saas inlines ~90 lines of **mock** metric `compute` functions in `App.tsx` (live-verified: dashboard shows hard-coded 12 / R$ 3.240 / 148 / 4,9). beautyplace's 150+-metric panel builder is the target state.

### 4.6 Policy/rules engine
Declarative `{ scope: 'pricing'|'discount'|'cancellation'|'commission', conditions, effect, priority }` + one resolver. Collapses five beautyplace settings pages (price tables, price variations, discount rules, cancellation rules, commission rules) into one primitive with per-plugin policy scopes.

### 4.7 Connector/driver framework
Generic registration of external integrations (config, secrets, health). Fiscal (NF-e), banking (statement sync), payment gateways, WhatsApp BSPs are all drivers. Addons = packages that register drivers. Prerequisite for the L4 layer to exist at all.

### 4.8 Revisions & audit
Row-version history + actor audit at the `DataProvider` write chokepoint (`packages/core/src/data/supabase.ts`). Absorbs service revisions, price history, payment deletion logs.

### 4.9 Typed entity relations
`saas_core.entity_links` (`from`, `to`, `relation_kind`) so "service → default products", "service → required form", "booking → contract" stop inventing join tables. `createArchetypeLookup` covers the read side; this persists associations.

### 4.10 Background jobs contract
Campaign sends, waitlist offers, reminder dispatch, reconciliation polling. Define the contract in core even if the first runtime is Supabase pg_cron + edge functions.

### 4.11 Tenant-level EntityDef customization — *partially exists*
Live finding: the settings hub already ships **"Regras de Campos"** (field rules). Extend it to full per-tenant FieldDef patches (required, hidden, custom fields → `metadata` JSONB) to absorb beautyplace's RequiredFields + FieldVisibility pages.

---

## 5. Capability Abstraction Taxonomy

Every beautyplace capability, mapped once. Status: **EXISTS** (SDK native, verified) / **PARTIAL** (bridged to saas-core, or subset) / **NEW** (must be built). Vertical tag: U = universal, V:food = food vertical, A = addon, P = platform.

| beautyplace capability | Abstract concept | Target layer/plugin | Status | Tag |
|---|---|---|---|---|
| Agenda + drag-reschedule + resource columns | Resource-time booking w/ status lifecycle | plugin-agenda | PARTIAL (bridged; calendar live-verified working) | U |
| Confirmation workflows/checklist | Booking status lifecycle + channel actions | plugin-agenda (`confirmationChannels` exists) | PARTIAL | U |
| Waiting list | Scheduling demand queue (auto-offer on cancellation) | plugin-agenda module `waitlist` | NEW | U |
| Holidays/blocked dates | Calendar exception registry | agenda registries (schedule `kind:'block'` exists) | PARTIAL | U |
| Client CRM (profile, journey, notes) | Person archetype + interaction timeline | plugin-crm | PARTIAL (bridged; client CRUD + tabs live-verified) | U |
| Client photos/files/folders | Entity attachments | core §4.2 + ui DetailTab | NEW | U |
| Quotes | Priced proposal documents | plugin-crm quotes (nav exists, live-verified) | PARTIAL | U |
| Client self-service portal (`/cliente/:token`) | Tokenized external-actor portal | new plugin-portal over §4.4 | NEW | U |
| Services + packages | Service archetype + bundle/composite pricing | service archetype EXISTS; bundles via §4.6 | PARTIAL | U |
| Service revisions | Entity revision history | core §4.8 | NEW | U |
| Default products/forms per service | Typed entity relations | core §4.9 | NEW | U |
| Professionals + work schedules | person `kind:'staff'` + `working_hours` schedules | EXISTS (live-verified incl. extension-table write) | U |
| Commissions | Derivative compensation policies | plugin-financial commissions module (nav live-verified) on §4.6 | PARTIAL | U |
| Inventory products + barcodes | Product archetype + identifier field type | plugin-inventory + new `barcode` FieldType | PARTIAL | U |
| Recipes/composition | Bill-of-materials | plugin-inventory `recipes` module flag | PARTIAL | U |
| Stock locations/movements | Multi-location stock ledger | plugin-inventory + location archetype | PARTIAL | U |
| DANFE/NF-e import + DFe inbox | Fiscal document ingestion | addon plugin-fiscal-br on §4.7 | NEW | A |
| Payables/receivables/installments | Money-movement ledger + payment schedules | plugin-financial (nav live-verified; installments NEW) | PARTIAL | U |
| Cash-register sessions | Session-based drawer accounting | plugin-financial `cashRegisters` ("Caixas" nav live-verified) | PARTIAL | U |
| Bank integrations/reconciliation | Statement ingestion + matching | addon plugin-banking-br + financial reconciliation UI ("Extratos"/"Conciliação" navs exist) | NEW | A |
| Chart of accounts / cost centers | Hierarchical accounting dimensions | plugin-financial tree registries | NEW | U |
| Marketing campaigns | Audience segmentation + scheduled outbound | new plugin-marketing → [messaging, crm] | NEW | U |
| WhatsApp/email/SMS templates + dispatch log + triggers | Messaging service (templates, channels, outbox, trigger bindings) | new `@fayz-ai/messaging` L1 + plugin-messaging + channel addons | NEW | U+A |
| Dynamic form builder | Schema-as-data forms (runtime FieldDef[]) | plugin-forms (template UI live-verified in settings) | PARTIAL | U |
| Stencil/camera overlay forms (recent) | Annotated-capture field type (`image-annotation`) | new FieldType in core + renderer in ui | NEW | U |
| Contract templates + generation | Document/template engine | core §4.3; plugin-forms grows into forms+documents | NEW | U |
| Custom KPI panels (150+ metrics) | Metric registry + panel composer | core §4.5 + dashboard plugin | NEW | U |
| Public TV-panel share links | Share-token public surface | core §4.4 | NEW | U |
| Public booking wizard (`/booking/:configId`) | Unauthenticated booking flow over agenda availability | new plugin-booking → [agenda, messaging] + §4.4 | NEW | U |
| Public digital menu | Unauthenticated catalog (live-verified working in beautyplace) | plugin-menu + §4.4; overlaps `@fayz-ai/storefront` | PARTIAL | V:food |
| Waiter app / kitchen queue / table POS | Role-scoped operational sub-apps over orders | plugin-tables + new plugin-kitchen | PARTIAL/NEW | V:food |
| Price tables/variations, discount & cancellation rules | Policy resolution | core §4.6 | NEW | U |
| Super-admin license management | Cross-tenant control plane | separate `fayz-admin` scaffold (`ScaffoldType` is extensible) | NEW | P |
| RBAC permission rules | Feature grants + profiles | `@fayz-ai/saas` permissions (settings UI live-verified) | EXISTS | U |
| Required fields / field visibility | Tenant EntityDef patches | core §4.11 ("Regras de Campos" partially exists) | PARTIAL | U |
| Global search | Cross-archetype search | `@fayz-ai/saas` (⌘K shell exists) | PARTIAL | U |
| Onboarding wizards per module | Plugin onboarding steps | EXISTS (live-verified in inventory/CRM/financial) | U |
| AI assistant + plugin aiTools | aiTools manifest + chat surface | EXISTS (live-verified: contextual suggestions per page) | U |

---

## 6. Plugin Catalog & Dependency Graph (target state)

```
@fayz-ai/core ── @fayz-ai/auth ── @fayz-ai/saas ── @fayz-ai/ui
                   │
        L1 services: @fayz-ai/shop · @fayz-ai/messaging (new)
                   │
 universal:  dashboard · crm · agenda · inventory · financial · tasks · reports
             forms+documents (forms ⊕ §4.3)
             messaging-ui            → [@fayz-ai/messaging]
             marketing               → [messaging, crm]
             booking (public wizard) → [agenda, messaging]
             portal (external actor) → [crm]
 vertical:   menu (food) → [inventory]
             tables (food) → [menu, financial]
             kitchen (food, new) → [tables]
             shop (retail) → [@fayz-ai/shop]
 addons:     fiscal-br → [inventory, financial]
             banking-br → [financial]
             channel-whatsapp / channel-sms / channel-email → [messaging]
             payments-pix / payments-stripe → [financial]
 platform:   fayz-admin scaffold (licenses, tenants, profiles)
```

Graph rules: see §2 dependency rules. `PluginManifest.dependencies` and the runtime's `missing_dependency` checks already enforce the mechanics; this section fixes the *intended* edges.

---

## 7. De-Bridging Plan (saas-core exit)

7 of 11 plugins are facades over legacy `@fayz/saas-core`. Two sources of truth block primitive work — de-bridge first, smallest-first, public `create*Plugin` APIs frozen so beauty-saas needs zero changes:

1. **tasks**, **forms** (smallest, few cross-deps)
2. **inventory**
3. **crm**
4. **financial**
5. **agenda**
6. **reports** (last — it reads the others)

Each step: move code + migrations into the plugin package, keep API frozen, validate by running beauty-saas unchanged.

---

## 8. Epic Roadmap & Sequencing

| Phase | Epic | Contents | Unblocks |
|---|---|---|---|
| 0 | **De-bridge** | §7 order | everything |
| 1 | **Core primitives wave 1** | event bus (§4.1), attachments (§4.2), public surface + share tokens (§4.4), entity relations (§4.9) | most NEW concepts |
| 2 | **Messaging stack** | `@fayz-ai/messaging`, template engine (§4.3 shared), channel addons, jobs contract (§4.10) | booking, marketing, reminders |
| 3 | **Public-facing plugins** | plugin-booking, plugin-portal, panel share links | beautyplace's flagship commercial features |
| 4 | **Policy & money depth** | policy engine (§4.6) → price/discount/cancellation UIs, commissions on policies, installments, chart of accounts/cost centers, cash-register hardening | financial parity |
| 5 | **Compliance & integration addons** | connector framework (§4.7), fiscal-br (DANFE import first), banking-br reconciliation | BR enterprise readiness |
| 6 | **Long tail** | metric registry (§4.5) + KPI panel builder, revisions/audit (§4.8), tenant field customization (§4.11 full), marketing campaigns, food kitchen/waiter, fayz-admin scaffold | SAP-class breadth |

**Dual-consumer rule (structural guarantee).** A second vertical app (food or health) must adopt each universal plugin within one phase of beauty-saas adopting it. If the second app needs code changes in the plugin, the abstraction failed the litmus test — fix the plugin, not the app. `pnpm-workspace.yaml` already lists `resto-saas`; it is the designated second consumer.

**App-side cadence.** beauty-saas is the validation consumer for every phase (its own backlog: `../../beauty-saas/docs/roadmap/backlog.md`). Live-test bugs found on 2026-06-11 (agenda client/service lookups inert, `get_tenant_active_plugins` RPC missing, mock dashboard metrics, missing `rep_*` views, no delete affordance in CRUD detail, i18n leaks) are tracked there and tagged to the epics above.

---

## 9. Per-Vertical Composition Examples

| | beauty (beauty-saas) | food (resto-saas) | health (future) |
|---|---|---|---|
| Universal | dashboard, agenda, crm, financial, inventory, forms+documents, booking, portal, messaging, reports, tasks | dashboard, crm, financial, inventory, menu? no—vertical, messaging, reports, tasks | dashboard, agenda, crm, financial, forms+documents, portal, messaging, reports |
| Vertical | — (pure config) | menu, tables, kitchen | treatment-records |
| Addons | fiscal-br, channel-whatsapp, payments-pix | fiscal-br, channel-whatsapp, payments-pix | channel-whatsapp, payments-stripe |
| App config | beauty labels, `bookingKind:'appointment'`, salon theme, BRL/pt-BR | table-service labels, `bookingKind:'reservation'`, restaurant theme | clinic labels, `bookingKind:'consultation'` |

The beauty column requiring **zero vertical plugins** is the point: a services-vertical product is pure composition.
