# STATE — live ledger (read first, every iteration)

> The brain. Trust this over chat history. Update it at the end of every iteration.

## FOCUS
- **App:** beauty-saas
- **Next task:** B2 (wire dashboard `compute` fns to real `fayz.data` queries)
- **Milestone in progress:** M-BEAUTY

## Order
beauty-saas → pulse-store → resto-saas → agency-os  (edit to reorder)

## Task queues  (mirror of PLAN.md — tick here as you go)

### beauty-saas  [M-BEAUTY]
- [ ] B2 dashboard real queries
- [ ] B3 onboarding real checks
- [ ] B4 migrations for B2/B3 views
- [ ] B5 commission compute
- [ ] B6 public booking flow
- [ ] B7 plugins on real data + tenant wiring
- [~] B-CHECK human: apply migrations + login smoke test

### pulse-store  [M-PULSE]
- [ ] P1 catalog→shop_products seed module
- [ ] P2 storefront content from data
- [~] P3 human: seed live + place test order (RLS verify)

### resto-saas  [M-RESTO]
- [ ] R1 real provider selection + env
- [ ] R2 MenuManager real data
- [ ] R3 app-owned restaurant module/plugin seam (community-plugin template)
- [ ] R4 orders/tables real data + RLS
- [~] R-CHECK human: provision DB, apply migrations, smoke test

### agency-os  [M-AGENCY]
- [ ] A1 initial migration set (saas_core + agency Ring-2)
- [ ] A2 replace placeholders, wire conversations/CRM/calendars
- [ ] A3 multi-org isolation
- [~] A-CHECK human: apply migrations, smoke test

## Blockers
- (none yet)

## FOR THE HUMAN  (checkpoint queue — do these when you stop in)
- Nothing staged yet. The first checkpoint will be **B-CHECK** once beauty-saas code tasks land.

## FEEDBACK  (you write here; the next iteration honors it first)
- (empty)

## Milestones reached
- (none yet — M-LOCK is the finish line)
