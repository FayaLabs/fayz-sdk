# CRUD Audit — beauty-saas

> **2026-06-17.** Method: read every EntityDef, introspected the **live** Supabase
> schema (`information_schema` via Management API), cross-checked each binding, and
> **rendered each CRUD in the running app** as the test user (RLS-scoped). Not
> "typecheck passed" — actually observed against real data.
> Project: `gphxclpkbtbucoqclbco` · tenant `b9c35035…` (test user is owner).

## Verdict (one line)
**The data model is genuinely ERP-grade and coherent.** Every problem found was a
**binding/wiring bug**, not a model problem — and the three load-bearing ones are now fixed.

---

## The model — three rings, confirmed in the live DB

- **Ring 0 — `saas_core` archetypes**, each with a `kind` discriminator + `tenant_id` + RLS:
  `persons` (kind ∈ customer/staff/supplier/partner/contact/lead), `products` (kind),
  `services` (own table), `categories` (kind), `locations` (kind), `bookings` (kind),
  `orders`/`order_items`/`booking_items`, `schedules`, `transactions`.
  Live distribution proves it's really used: `persons.kind` = {customer 8, staff 1, supplier 1},
  `categories.kind` = {service_category 2}, `bookings.kind` = {appointment 4}.
- **Ring 2 — 1:1 app extensions** (PK = archetype id): `clients(person_id)`, `staff_members(person_id)`,
  `appointments(booking_id)`, `deal_extensions(order_id)`. Correct pattern.
- **Read models** — denormalized views for the UI: `v_clients`, `v_staff`, `v_bookings`, `v_leads`,
  `v_deals`, `v_financial_movements`, `v_documents`, `v_stock_movements`.
- **Ring 1 — plugin-owned, prefixed**: `tsk_*` (tasks), `frm_*` (forms), `crm_*`, `dsh_*` (dashboard prefs).

This is a real ERP backbone, not a toy: `chart_of_accounts`, `cost_centers`, `cash_register_sessions`,
`financial_movements` (direction debit/credit), `commission_rules` + `price_variations`/`price_tables`,
`stock_locations`/`stock_positions`/`stock_movements` + `recipes` + `measurement_units`, CRM
`pipelines`/`pipeline_stages`. It is coherent and scales.

---

## Per-CRUD audit (app-owned — `src/types`, registered in `pages.tsx`)

| CRUD | Ring / archetype | Table (schema) | Live status |
|---|---|---|---|
| **Clients** | R2 ext of person(customer) | `public.clients` ⨝ `persons` → reads `v_clients` | ✅ **8 rows render** |
| **Services** | R0 `service` | `saas_core.services` | ✅ **FIXED 0 → 2** (was missing `data{}`) |
| **Service Categories** | R0 category(service_category) | `saas_core.categories` | ✅ works (2 rows) |
| **Origins** | R0 category(origin) | `saas_core.categories` | ✅ works (0 rows) |
| **Staff** | R2 ext of person(staff) | `public.staff_members` ⨝ `persons` → `v_staff` | ✅ **FIXED** profession + commission now shown/editable |
| **Contacts** | R0 person(contact) | `saas_core.persons` | ⚠️ works, but `kind='contact'` isn't in any lookup (orphan bucket) |
| **Suppliers** | R0 person(supplier) | `saas_core.persons` | ✅ works (1 row); fields minimal |
| **Partnerships** | R0 person(partner) | `saas_core.persons` | ✅ works (0 rows) |
| **Equipment** | R0 product(asset) | `saas_core.products` | ✅ works (0 products seeded) |
| **Accounts** | standalone | `public.bank_accounts` | ✅ works (0 rows); **overlaps Financial plugin** |
| ~~Appointments~~ | — | — | ❌ **removed** — dead code, archetype wrongly `schedule` |

## Plugin CRUDs (Ring 1 / SDK-owned — spot-checked against schema)
- **Agenda** → `saas_core.bookings`/`booking_items` (`v_bookings`), `bookings.kind='appointment'` — 4 live ✅
- **Financial** → `financial_movements`, `payment_methods`/`payment_method_types`, `commission_rules`,
  `chart_of_accounts`, `cost_centers`, `cash_register_sessions`, `card_brands`, `bank_accounts` ✅
- **Inventory** → `saas_core.products`, `product_categories`, `stock_locations/positions/movements`,
  `recipes`/`recipe_ingredients`, `measurement_units` (empty — no products seeded)
- **CRM (Vendas)** → `orders`(deal) + `deal_extensions`, `pipelines`/`pipeline_stages`, `v_leads`,
  `crm_activities`, `lead_sources`, `crm_tags` ✅
- **Tasks** → `tsk_tasks`/`tsk_labels` ✅ · **Forms** → `frm_templates`/`frm_documents`/`frm_core_documents` ✅
- **Marketing** → mock (no tables) — surfaces a mock "Bookings" KPI on the dashboard

---

## Findings & fixes

### 🔴 Fixed — Services CRUD was broken
`serviceEntity` had **no `data{}` block**, so the provider couldn't resolve a table and the list
fell back empty — **0 services shown despite 2 in `saas_core.services`**. Added
`data:{table:'services', schema:'saas_core'}`. Now renders 2. *(Verified in browser.)*

### 🟠 Fixed — Staff commission was invisible & uneditable
`v_staff` didn't expose `profession` (the CRUD column was blank) and there was **no `commissionRate`
field** — so the commission rate the agenda→financial bridge (B5) depends on could only be set via
SQL. Added the `commissionRate` field + recreated `v_staff` to expose `profession` + `commission_rate`
(migration `20260617000001`). Staff CRUD now shows **Profissão + Comissão (%)**. *(Verified live.)*

### 🟡 Fixed — dead `appointmentEntity`
Defined + exported but never wired into any page; its `archetype` was wrongly `'schedule'`
(appointments extend `bookings`, not the availability `schedules` table). The agenda plugin owns
appointments. Removed.

### 🟡 Open — design / data-quality (not model bugs)
- **`bank_accounts` has two owners** — the registry "Accounts" CRUD and the Financial plugin both
  manage it. Pick one canonical entry point.
- **"Contacts" bucket** (`persons.kind='contact'`) isn't referenced by any archetype lookup — clarify
  its role vs CRM leads/contacts, or drop it.
- **Suppliers/Partnerships are thin** — `persons` carries `document_number`/`address` (CNPJ, etc.) but
  the CRUDs don't surface them. For a real ERP supplier record, add them.
- **Equipment = `product(kind='asset')`** shares the `products` table with retail/ingredient products —
  fine, but ensure the Inventory product list filters by `kind` so assets don't appear as sellable stock.
- **Data hygiene**: a service is named `21998803190` (phone as name); several clients are duplicate
  `Faya Labs / creators@fayalabs.com`; `products` is empty. Seed/clean before demos.

---

## Bottom line for the ERP
The archetype model **makes sense and is solid** for the ERP you're building: small universal Ring-0
core, kind-discriminated, 1:1 extensions for domain richness, prefixed plugin tables, and denormalized
read views. The CRUDs work once correctly bound — and the three that weren't are now fixed and verified
against the live database. Remaining items are design decisions and data hygiene, not foundation cracks.
