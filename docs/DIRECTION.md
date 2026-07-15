# Direction — where fayz-sdk is going and why

**Status: canonical · Updated 2026-07-02.** Read this before proposing new work.
Decision log with rationale: [DECISIONS.md](./DECISIONS.md). Agent operating manual: [/AGENTS.md](../AGENTS.md).

## The thesis (one paragraph)

Lovable-class builders generate **disposable code** the customer must then maintain. Fayz sells a
**product on rails**: apps assembled from upgradable, domain-deep plugins (a real financial engine,
agenda, CRM — with providers, migrations, AI tools), generated and tweaked by the fayz AI builder,
paid as subscription. The moat is not generation — it's the **upgrade**: 100 live apps safely
receiving plugin-financial v2. Nobody has all three of {AI generation, domain-deep upgradable
modules, multi-vertical substrate}; Wix+Base44 is the closest trajectory. Best analogy: *Shopify
for every local-business vertical* (Zoho proves many-products-one-substrate; GHL proves the
SaaS-creator distribution shape).

## Where we are (July-2026 audit verdict: feasibility 7/10)

Full audit in Linear epic **FAY-1250**. Highlights: core packages 7/10, builder prompt→code 7/10,
plugin contract consistency 4/10, persona engine 3/10, saas customization slots 3/10, tests 2/10,
builder⇄SDK bridge 2/10. Only **6 of 20 plugins** meet the capability bar (financial, agenda, crm,
inventory, forms, tasks); the rest are labeled `[experimental]`. The gap is **integration
discipline, not invention**.

## The roadmap (5 phases — Linear FAY-1251…1255 under epic FAY-1250)

Phase 0 (Subtract) done 2026-07-01. Phases 1–4 (capability-as-law → persona+slots → agent legibility + builder bridge → deploy+marketplace), their exit criteria, launch gates, and the live plugin census now live in **[ROADMAP.md](ROADMAP.md)** — the single source for milestone state. This doc keeps the strategy; that one keeps the plan.

## The validation portfolio (executive decision, countersigned 2026-07-02)

**Zero customers is the biggest trash-risk.** Behave like a product company: three surfaces
validated in staggered waves, each with a hard window and kill criteria (details in FAY-1258/1259/1257):

1. **Wave 1 — Clinic (NOW):** a real aesthetic clinic (founder's mother) uses the **FULL beauty-saas**
   (no lite version — founder decision) live at `beauty-saas.live.fayz.ai`. Tenant + owner account
   exist; RLS enabled on all Ring-2 tables. Success: 2 consecutive weeks of real appointments.
   After 2+ weeks: the **upgrade rehearsal** — ship one real SDK update to the live clinic (first
   evidence for the moat).
2. **Wave 2 — True e-commerce:** MercadoPago **Pix** checkout built once at SDK level
   (`@fayz-ai/shop` provider + webhook edge fn), real merchant store. Success: first
   webhook-confirmed paid order.
3. **Wave 3 — Course platform (our Kiwify):** plugin-courses skeleton→Tier-1 (the capability
   contract's production proof), member portal + creator admin, payments reuse Wave 2. Success:
   1 real creator, ≥5 students.

**Silvio strategy: evidence first, converge later.** The partner's vibe-coded BeautySoft launches
unblocked; the live clinic is the architecture evidence; migration offer comes after real usage.

## The platform freeze (until first revenue)

- **No** marketplace / plugin-center UI, external-plugin submission workflows, or speculative
  override slots. No new dogfood apps. No growth of `[experimental]` plugins.
- Foundation work only when a wave **pulls** it (widget fix, RLS, courses provider = pulled;
  persona engine = not yet).
- The SDK holds or shrinks in LOC until a customer pays. Depth in the six plugins beats breadth in twenty.

## The one architectural rule

> **Plugins emit nothing app-specific by default. The app composes what it wants.**
> Everything a plugin contributes to a shared surface (home widgets, header buttons, FABs) is
> **opt-in or surface-scoped** — never broadcast. And: gate by default; add an override slot only
> when a **second real consumer** needs it.

Violating this is how norman's B2C widgets polluted beauty's dashboard (FAY-1247). The fix pattern:
dedicated `DashboardSurface` (`finance-home`) + opt-in flags (`quickAdd`). Cross-consumer
verification (beauty AND norman, desktop AND mobile) is mandatory for any shared-plugin UI change.
