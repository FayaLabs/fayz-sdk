# Data-Model Refactor — order-to-cash spine (Salesforce-grade, modular)

> **Status: IN-PROGRESS working doc** (execution plan under active work, not current state —
> the applied data model is [`data-model.md`](./data-model.md)).

> **2026-06-17.** Goal: make the shared `orders` spine *redondo e flexível* — clean
> responsibility separation (operational vs commercial vs financial), zero drift,
> reports that can't lie. Each step is **additive then flip**, verified live before
> the next. Destructive changes (drop column / drop table) only after a green verify.

## Target model (the contract)

```mermaid
flowchart TD
  subgraph SALES["Sales (CRM)"]
    Q[order kind=quote/deal<br/>+ deal_extensions]
  end
  subgraph COMMERCE["Commercial document"]
    O[order<br/>party, totals, terms]
    OI[order_items<br/>the ONLY line items]
    O --> OI
  end
  subgraph OPS["Operational (Agenda)"]
    B[booking<br/>time, professional, room<br/>status: scheduled→done→no_show]
  end
  subgraph FIN["Financial"]
    INV[invoice = order in financial role<br/>kind=invoice_* / stage]
    MOV[(financial_movements<br/>APPEND-ONLY ledger)]
    BAL[/v_invoice_balances<br/>balance & status = SUM(movements)/]
    INV --> MOV --> BAL
  end
  Q -- promote --> O
  B -- N:1 --> O
  O -- becomes / links --> INV
  COMMERCE -. canonical views .-> R[(v_revenue · v_receivables · v_appointments)]
  FIN -. canonical views .-> R
```

**One sentence:** the *order* is the commercial document; *booking* is the operational
execution of it; *invoice* is its financial role; *financial_movements* is the immutable
cash ledger and **balances are always derived from it, never stored**.

## The 5 invariants (what keeps it redondo)
1. **One writer per fact.** Operational status → only `bookings`. Financial status → derived from the ledger. Sales status → only the order/deal. Never copy a status between tables; derive it in a view.
2. **Money is event-sourced.** `financial_movements` is append-only & immutable. `paid_amount`/`balance`/`paid|partial|overdue` are a **VIEW** (`SUM(movements)`), not stored mutable fields.
3. **Cross-document transitions are transactional DB functions** (`fn_invoice_from_order`, `fn_pay_invoice`) — atomic, one place. Plugins call them; they don't re-implement multi-step writes.
4. **Reports read canonical views only** (`v_revenue`, `v_receivables`, `v_appointments`) — never raw tables, never per-plugin JOINs.
5. **Lifecycle is constrained.** A documented `(kind → allowed status/stage)` matrix enforced by a CHECK/trigger; no more arbitrary tuples.

## Execution sequence (Phase 1 — no new tables)

| Step | Adjustment | Risk | Verify |
|---|---|---|---|
| **S1** | `v_invoice_balances` — derive amount/paid/balance/status from `financial_movements` (event-sourced money) | 🟢 additive | balances match live invoices |
| **S2** | Financial plugin **reads** derived balance/status from S1; stop storing `paidAmount` in metadata | 🟠 flip reader | receive flow shows correct paid/balance |
| **S3** | Single-writer status: operational status lives only on `bookings`; `v_bookings` derives display status from `bookings.status`; agenda stops writing `orders.status` for scheduling | 🟠 flip | agenda calendar unchanged, no drift |
| **S4** | De-dup line items: `order_items` is the single source; `booking_items` → thin operational view/link (no price copy) | 🟠 | booking detail unchanged |
| **S5** | Transactional transitions: `fn_invoice_from_order(id)` + `fn_pay_invoice(...)` (SECURITY DEFINER); CRM/agenda/financial call them | 🟠 | quote→invoice→receive e2e atomic |
| **S6** | Lifecycle CHECK matrix on `orders(kind,status,stage)` | 🟡 | invalid combos rejected; existing rows normalized first |

## Phase 2 (when a vertical needs bundled/partial billing)
- Real `invoices` + `invoice_lines(invoice_id, source_type, source_id)` for invoice↔N bookings/orders.
- Additive — Phase 1 already decoupled ops/commercial/financial and event-sourced the money, so this is a new layer, not a rewrite.

## Parallel cleanup track (the other mapped items)
| Item | Action | Severity |
|---|---|---|
| `orders.status`/`stage`/`direction` overload | resolved by S1–S3 + S6 | 🔴 |
| Receivable has two representations (quote vs invoice_receivable) | S5 decides: approved quote flips to `invoice_receivable`, OR `stage` is the canonical financial state (documented) | 🟠 |
| `booking_items` duplicates `order_items` | S4 | 🟠 |
| Cross-plugin manual sync | S5 (DB functions) | 🟠 |
| Plugin-local tenant context now dead weight | remove `setXxxTenantId`, standardize on core active tenant | 🟢 cleanup |
| `bank_accounts` two owners (registry + financial) | pick canonical owner (financial), drop registry CRUD | 🟡 |
| "Contacts" orphan `persons.kind='contact'` | clarify vs leads, or remove the bucket | 🟡 |
| Thin Suppliers/Partnerships | surface `document_number`/address on `persons` | 🟡 |
| `orderKind:'service_order'` dead config (agenda hardcodes 'appointment') | honor it or remove | 🟢 |
| Data hygiene (dup clients, service named with a phone, no products) | seed/clean | 🟡 |

## Working rules for this refactor
- Every schema change ships as a migration file in the app's `supabase/migrations/` AND is applied live (Management API) + verified.
- Backwards-compatible until the flip is verified; only then remove the old path.
- Touch the SDK once → benefits beauty/resto/agency + generated apps.
