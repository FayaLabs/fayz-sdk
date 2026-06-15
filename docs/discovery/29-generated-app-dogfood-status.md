# 29 — Generated App Dogfood Status

Snapshot: 2026-06-15 01:47 UTC / 22:47 BRT

## Executive Status

Resultado:

- Four dogfood apps pass the generated-app contract and typecheck gate:
  Beauty/BeautyPlace, shopfront, Resto/The Chef, and marketplace/admin.
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
- Move remaining provider/type metadata behind SDK-owned or explicit adapter
  contracts.
- Keep app dogfood depth focused on SDK value: Beauty operations, commerce
  account/order/variation flows, Resto workflow seams, marketplace provider
  injection.

## Gate Matrix

| App | Contract + typecheck | Warnings | SDK value proven | Next objective gate |
|---|---:|---|---|---|
| Beauty / BeautyPlace | pass | Supabase type metadata remains; `typecheck` script exists only in current Beauty migration worktree | salon app owns business config and vertical UX while agenda/CRM/financial shell uses SDK/private plugins | package the pending Beauty migration coherently or move the typecheck script into that milestone |
| shopfront / Aurora | pass | none | commerce app customizes brand/checkout behavior while checkout/order/cart primitives stay in storefront/shop SDK internals | keep checkout/account/order tracking tests focused on SDK primitives, not app-local copies |
| Resto / The Chef | pass | Supabase type metadata remains | app config registers private Orders/Menu/Tables engines instead of owning copied provider logic | move or delete remaining Supabase type metadata once SDK/shared types cover the need |
| Marketplace/admin | pass | none | marketplace dashboard/admin uses provider injection and SDK shop provider path | keep shop admin data behind injected provider |

## Operating Decision

Do not start broad Fayz Agent SDK operation yet. Start with constrained agent
operation after these two hardening steps:

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
