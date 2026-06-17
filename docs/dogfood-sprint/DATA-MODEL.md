# DATA-MODEL — the archetype decision (resolves the doubt)

> Iteration 1 deliverable. This is the convention all four apps follow so we can lock it later
> and have Fayz generate it. Grounded in the real schemas: beauty-saas (34 migrations, archetype
> tables), `~/dev/beautyplace` (471 migrations, the production prototype), resto-saas (30 migrations),
> pulse-store (shop schema). Companion: [PLAN.md](PLAN.md), and the SDK reference plugin-tasks.

## The doubt, answered

> "I'm in doubt about the data model, the archetypes."

The model is **three concentric rings**. Get the rings right and the doubt dissolves — every app,
every plugin, every generated project sits in exactly one ring, and they never fight.

```
Ring 0  saas_core.*         shared spine: tenants, profiles, members, + 5 archetypes
Ring 1  <plugin-prefix>_*   capability tables a plugin OWNS (tsk_, crm_, shop_, fin_…)
Ring 2  public.* extensions app-/domain-owned tables that EXTEND an archetype (1:1 by id)
```

The mistake to avoid is putting domain detail in Ring 0 (turns the core into a giant CRM) or
duplicating an archetype inside a plugin (two sources of truth for "a person"). **Ring 0 stays
small and universal; richness lives in Ring 1 (plugins) and Ring 2 (app extensions).**

## Ring 0 — the five archetypes (universal, never per-domain)

Every business app is built from five nouns. This is the whole core vocabulary:

| Archetype | `saas_core` table | Kinds (discriminator) | Examples across apps |
|---|---|---|---|
| **person** | `persons` | `customer`, `staff`, `lead`, `vendor` | client, professional, agency contact, shopper |
| **product** | `products` | `good`, `service` | menu item, retail SKU, salon retail, course |
| **service** | (product, kind=service) | — | haircut, table booking slot, agency retainer |
| **location** | `locations` | `branch`, `room`, `zone` | salon unit, restaurant area, store |
| **booking** | `bookings` | `appointment`, `reservation`, `order` | appointment, table reservation, shop order |

Plus the spine: `tenants`, `profiles`, `tenant_members`, and the RLS function
`public.user_tenant_ids()`. **Everything is `tenant_id`-scoped; RLS is keyed on it.** (service is
modeled as `product.kind='service'` rather than a 6th table — beauty-saas and beautyplace both
prove this works; it keeps pricing/inventory/catalog logic unified.)

### Why "kind" instead of new tables
`person(kind=staff)` vs `person(kind=customer)` means one identity model, one search, one CRUD
engine, one set of RLS — and the archetype lookup (`createArchetypeLookup`) already routes UI by
(archetype, kind). beauty-saas does exactly this (`person+customer→clients`, `person+staff→professionals`).

## Ring 1 — plugin-owned capability tables (prefix = ownership)

A plugin owns its tables under a **prefix** and provisions them via its manifest `migrations[]`
(the Plugin Capability Contract). The prefix IS the isolation boundary. Confirmed prefixes:

| Plugin | Prefix | Owns |
|---|---|---|
| plugin-tasks | `tsk_` | `tsk_tasks`, `tsk_labels` |
| plugin-crm | `crm_` | leads, deals, pipelines, activities |
| plugin-financial | `fin_` | movements, receivables, payables, commission_rules |
| plugin-inventory | `inv_` | stock_locations, stock_movements, recipes |
| @fayz-ai/shop | `shop_` | products, orders, customers, discounts (+ `shop_place_order` RPC) |

Rule: a plugin **never** redefines an archetype. If financial needs "who got paid", it references
`saas_core.persons.id` — it does not store a copy of the person. Commission = `fin_` table that
joins `person(kind=staff)` × `booking` × rule.

## Ring 2 — app/domain extensions (the escape valve, 1:1 by id)

When an app needs fields the archetype doesn't have, it adds a `public.*` extension table whose
PK **is** the archetype's id (1:1), never a parallel entity. This is where domain richness and
app-owned code live — including resto's restaurant-specific needs.

```
saas_core.persons(id) ──1:1── public.clients(person_id PK, origin, total_spent, last_visit)
saas_core.persons(id) ──1:1── public.staff_members(person_id PK, role, commission_rate)
saas_core.products(id) ─1:1── public.menu_items(product_id PK, prep_time_minutes)
saas_core.bookings(id) ─1:1── public.appointments(booking_id PK, whatsapp_confirmed)
```

This is already the pattern in beauty-saas and resto-saas. We standardize it: **extensions are
1:1, id-shared, app-owned; they may add columns and app-specific tables (e.g. resto's
`restaurant_tables`, `kitchen_queue`) but must carry `tenant_id` + RLS.**

## Mapping beautyplace (the production prototype) onto the rings

beautyplace has ~112 tables; most are Ring 2 detail. The cherry-pick for beauty-saas:

| beautyplace table | Ring | Lands as |
|---|---|---|
| `professionals` (commission_rate) | 2 | `public.staff_members` extension of `person(kind=staff)` |
| `clients` | 2 | `public.clients` extension of `person(kind=customer)` (already exists) |
| `services` | 0 | `product(kind=service)` |
| `appointments` (whatsapp_*) | 0+2 | `booking(kind=appointment)` + `public.appointments` ext |
| `commission_rules` | 1 | `fin_commission_rules` (plugin-financial) |
| `financial_accounts` | 1 | `fin_` receivables/payables |
| `work_schedules`, `schedule_blocks` | 2 | `public.work_schedules` (staff × location availability) |
| `recipes`, `stock_*`, `products` | 1 | `inv_` (plugin-inventory) |
| `form_templates`, field rules | 1 | plugin-forms tables |
| `table_orders`, `kitchen_queue`, POS | — | **out of scope for beauty** — these are resto-domain (Ring 2 of resto-saas) |
| fiscal/DANFE, licensing, software_profiles | — | platform concerns, not app data — defer |

**Verdict:** beautyplace's richness maps cleanly onto the three rings with zero changes to Ring 0.
The 112 tables collapse to: a handful of Ring 2 extensions + existing Ring 1 plugins. Nothing in
beautyplace forces a new archetype. That is the signal the model is right.

## The convention to lock (and later generate)

1. **Ring 0 is fixed and small** — 5 archetypes + spine. New apps never add to it.
2. **Capabilities are plugins** — prefixed tables, provisioned by manifest `migrations[]`, tenant-scoped + RLS. Adding a capability = installing a plugin, not editing core.
3. **Domain richness is Ring 2** — 1:1 id-shared extensions + app-owned tables, in the app's repo, carrying `tenant_id` + RLS, free to hold custom code that calls SDK providers.
4. **One isolation rule, everywhere — LOCKED (M-LOCK / L4).** Every non-public table has `tenant_id` and RLS `USING (tenant_id IN (SELECT public.user_tenant_ids()))`. The capability gate audits the form each plugin's migrations use (`node scripts/check-plugin-capability.mjs` → "RLS isolation form": canonical · divergent · deferred · no-rls · other) **and now ENFORCES it**: under `--strict` any plugin whose form is `divergent`, `no-rls`, or `other` fails CI (exit 1). canonical / deferred / n/a pass. So a future plugin can no longer merge a non-canonical tenant-isolation policy. Current state at lock: **2 canonical · 0 divergent · 3 deferred · 0 no-rls · 0 other**.
   - **canonical** (the locked form) — policies write `tenant_id IN (SELECT public.user_tenant_ids())` inline (plugin-tasks; plugin-forms + resto-saas standardized to it in L2).
   - **deferred == canonical-at-apply** (confirmed L3) — crm/financial/inventory ship `ENABLE ROW LEVEL SECURITY` but **no** `CREATE POLICY`; their `public.<table>` (normal-named base tables with a `tenant_id` column) are caught by the `project_rls.sql` auto-detect DO-block, which emits exactly the canonical `tenant_id IN (SELECT public.user_tenant_ids())` policy for SELECT/INSERT/UPDATE/DELETE at apply time. So a `deferred` plugin lands as canonical on a real DB — it is **not** a divergence, only a deferral of *where* the policy text lives (the app's `project_rls.sql`, not the plugin's migration). Requirement for deferral to be safe: the table is in `public`, is a `BASE TABLE`, has a `tenant_id` column, and is **not** prefixed with `_` (the loop's `NOT LIKE '\_%'` filter).
   - **divergent** / **no-rls** / **other** — now a hard CI failure under `--strict`; standardize to canonical before merge.

## Handed to Fayz generation (the locked emit-target)

With all four apps on the rings and the RLS form locked + CI-enforced, Fayz generation emits exactly this, every time:

- **Ring 0** verbatim — `saas_core` spine (`tenants`/`profiles`/`tenant_members`) + 5 archetypes + `public.user_tenant_ids()`. Never extended per-app.
- **Ring 1** per installed plugin — prefixed (`tsk_`/`crm_`/`fin_`/`inv_`/`shop_`…) tables provisioned by the plugin manifest `migrations[]`.
- **Ring 2** per app — 1:1 id-shared `public.*` extensions, app-owned, each carrying `tenant_id`.
- **RLS on every `tenant_id` table** — emit the **canonical** form inline: `CREATE POLICY … USING (tenant_id IN (SELECT public.user_tenant_ids()))` for SELECT/INSERT/UPDATE/DELETE. (Deferral to a `project_rls.sql` auto-detect DO-block is an equivalent fallback, but generation prefers the explicit canonical policy.)
- **Gate as the contract test** — generated plugins must pass `check-plugin-capability.mjs --strict`; the RLS lock guarantees no generated capability ships a non-canonical isolation form.

When all four apps run e2e on these rings (the four human checkpoints), the architecture is fully validated; the convention is already locked and CI-enforced here.
