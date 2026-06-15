# 28 - Proof-First Route Lock

Last updated: 2026-06-14 11:08 BRT

## Executive Summary

Vini approved a route recalculation after reviewing the public npm/package sprawl risk.

This is **not a pivot away from AppManifest or curated capabilities**. It is a scope lock:

> Build a proof-first Fayz capability platform, not a public package ecosystem.

The ambition remains: Fayz should compose curated capabilities into robust SaaS, ecommerce, portal, and vertical ERP products. The execution rule is now tighter: public contracts only graduate after real app proof.

## Hard Constraints

1. **Only `@fayz-ai/sdk` is public npm by default.**
   - It owns API client, app params, shared types, and broker helpers.
   - It must stay browser-safe and lightweight: no React/UI bundle, no provider secrets, no Supabase/provider SDK dependency.
2. **Everything else is internal/private until proven.**
   - app-runtime/app-shell, core/auth/ui/saas/shop/storefront/portal/courses, and plugins are implementation boundaries, not public product API.
3. **Do not publish app-runtime yet.**
   - Use `app-runtime`/`app shell` as an internal/local/platform-bundled concept.
   - Do not document it as a package a normal generated app installs.
4. **Capabilities before packages.**
   - Product language is Booking, Commerce, Courses, CRM, Payments, Portal, Integrations.
   - Package layout is implementation detail.
5. **Beauty is the first dogfood app.**
   - Keep it working.
   - Extract toward `app.manifest.json + registry.tsx` in narrow slices.
   - Do not big-bang replace `createSaasApp`.
6. **The Chef / ecommerce/POS path is the second pressure test.**
   - Do not standardize shop/storefront/portal/courses broadly until a second vertical proves the seams.
7. **Generator follows proof.**
   - Generated scaffold should stay thin and install only `@fayz-ai/sdk` by default.
   - Do not make the generator the first validator of unproven runtime/capability abstractions.
8. **Fayz remains the trust layer.**
   - OAuth, provider tokens, revocation, audit, tenant authority, billing, and plugin grants stay server-side in Fayz.
9. **Provider onboarding UI remains decision-gated.**
   - Recommended direction is Fayz-owned Integrations surface plus inline plugin CTA, but do not expose product routes until approved.
10. **Commit coherent slices only.**
   - No `git add .`.
   - No mixed commits containing SDK packaging, Beauty migration, portal/courses abstractions, and generator changes together.

## Current Public Surface

Public/required:

- `@fayz-ai/sdk`

Private/internal implementation packages:

- `@fayz-ai/app-runtime`
- `@fayz-ai/core`
- `@fayz-ai/auth`
- `@fayz-ai/ui`
- `@fayz-ai/saas`
- `@fayz-ai/shop`
- `@fayz-ai/storefront`
- `@fayz-ai/portal`
- `@fayz-ai/courses`
- plugin packages

Guardrail:

```bash
pnpm check:public-surface
```

This gate must fail if any non-`@fayz-ai/sdk` package becomes publishable by accident.

## Next Milestones

### A - Public Surface Discipline

Goal: make the repo and docs reflect the corrected product contract.

Done when:

- only `@fayz-ai/sdk` is publishable;
- `pnpm check:public-surface` passes;
- generated scaffold and `fayz create` install only `@fayz-ai/sdk` by default;
- docs avoid presenting app-runtime/core/ui/saas/domain packages as public products.

### B - Beauty Local SDK Dogfood

Goal: prove the architecture improves a real app without publishing a package graph.

Done when:

- Beauty builds with local SDK/internal aliases;
- agenda/paid booking/save paths stay green;
- one small manifest-driven change is visible;
- extraction map exists:
  - manifest-owned;
  - `registry.tsx` custom code;
  - legacy `createSaasApp` remaining.

### C - Second Vertical Pressure Test

Goal: avoid salon-only architecture before standardizing capabilities.

Candidate: The Chef / restaurant / ecommerce / POS path.

Done when:

- shared vs vertical-specific capabilities are mapped;
- ecommerce/catalog/order/POS requirements pressure-test AppManifest;
- no new public package is required;
- only proven seams graduate into official capabilities.

## Linear Grooming Direction

- `FAY-1178`: keep as AppManifest/Panel user story foundation.
- `FAY-1181`: rewrite as **public `@fayz-ai/sdk` only** package story.
- `FAY-1182`: keep as trust-boundary/provider-broker story; UI remains decision-gated.
- `FAY-1183`: rewrite as SDK-only version-channel story, not runtime package versioning.
- `FAY-1184`: rewrite from runtime publish wave to **public surface discipline**.

## Codex Instruction

Use this as the route lock for the next cycle:

```txt
Do not expand public npm surface. Treat @fayz-ai/sdk as the only public required package. Keep app-runtime/core/auth/ui/saas/shop/storefront/portal/courses/plugins private/internal. Prove the architecture through Beauty first, then a second vertical, before hardening generator/runtime/plugin APIs. Commit only narrow coherent slices and keep generated apps thin.
```
