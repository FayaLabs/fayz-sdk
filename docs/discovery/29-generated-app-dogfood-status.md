# 29 — Generated App Dogfood Status

Snapshot: 2026-06-15 02:02 UTC / 23:02 BRT

## Executive Status

Resultado:

- Four dogfood apps pass the generated-app contract and typecheck gate:
  Beauty/BeautyPlace, shopfront, Resto/The Chef, and marketplace/admin.
- The full gate currently reports zero warnings across the four apps.
- The current proof is no longer "can we build individual apps?". The proof is:
  generated apps keep business/product code in the repo while reusable SDK or
  private platform engines own repeated technical complexity.

Impacto:

- This is enough to continue toward Fayz Agent operation, but not enough to
  skip the remaining contract hardening.
- The next 12 hours should convert warnings into explicit gates and then let
  agents operate within those gates.

Risco:

- App quality work can still drift into vertical feature building. Only add
  product depth when it proves an SDK boundary, reusable primitive, override
  seam, or agent-safe edit surface.

Proximo:

- Keep objective typecheck/build gates green as apps evolve.
- Keep direct provider metadata out of generated apps unless an explicit
  optional adapter is selected.
- Keep app dogfood depth focused on SDK value: Beauty operations, commerce
  account/order/variation flows, Resto workflow seams, marketplace provider
  injection.

## Gate Matrix

| App | Contract + typecheck | Warnings | SDK value proven | Next objective gate |
|---|---:|---|---|---|
| Beauty / BeautyPlace | pass | none | salon app owns business config and vertical UX while agenda/CRM/financial shell uses SDK/private plugins | keep product UX work behind SDK primitives and the full dogfood gate |
| shopfront / Aurora | pass | none | commerce app customizes brand/checkout behavior while checkout/order/cart primitives stay in storefront/shop SDK internals | keep checkout/account/order tracking tests focused on SDK primitives, not app-local copies |
| Resto / The Chef | pass | none | app config registers private Orders/Menu/Tables engines instead of owning copied provider logic | keep workflow depth behind private Orders/Menu/Tables providers |
| Marketplace/admin | pass | none | marketplace dashboard/admin uses provider injection and SDK shop provider path | keep shop admin data behind injected provider |

## Operating Decision

Do not start broad Fayz Agent SDK operation yet. Start with constrained agent
operation after these hardening rules:

1. Generated-app gate is mandatory for every app edit.
2. Each dogfood app passes the full dogfood gate:

```bash
pnpm check:generated-dogfood:full
```

Once those are true, Fayz Agents can be asked to edit app-owned files first and
escalate repeated platform needs into SDK tasks.

## Verification

```bash
pnpm check:generated-dogfood
pnpm check:generated-dogfood:full
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/shopfront
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/resto-saas
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/marketplace-saas
cd /Users/fayalabs/dev/fayz-app/beauty-saas && npm run typecheck
cd /Users/fayalabs/dev/fayz-app/marketplace-saas && npm run typecheck
```
