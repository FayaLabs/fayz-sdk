# 26 - App Contract and Integrations Decision

Last updated: 2026-06-14 08:47 BRT

## Executive Summary

Decision recommendation: make **AppManifest the official repo x Fayz SDK contract**.

`beauty-saas/src/App.tsx` is the most important migration proof, not the final contract shape.

Do not keep `createSaasApp` as strategic architecture.

- `createSaasApp`: **legacy compatibility adapter only** for Beauty/resto/current apps during extraction.
- `createFayzApp`: transitional developer helper only if it compiles to/through manifest-first rendering.
- `createAgendaPlugin`, `createFinancialPlugin`, and other `create*Plugin` factories: plugin package internals/developer API, not generated-app contract.
- Generated app default: `app.manifest.json` plus `renderApp(manifest)` and a small `registry.tsx` only when the app needs custom code.
- Package default: every generated project may use lean public npm `@fayz-ai/sdk`; manifest-rendered apps use platform-bundled app-runtime until Beauty proves a public package boundary.
- New templates, docs, and AI generation should not emit `createSaasApp`.

## Why This Matters

Beauty's `App.tsx` proves the product contract, but it also proves the scaling risk:

- it mixes product definition, plugin wiring, metrics, lookups, React components, Supabase calls, and cross-plugin bridges;
- it is hard for fayz.ai to diff, migrate, or safely edit across many generated apps;
- function-heavy config blocks manifest extraction and fleet upgrades.

The durable contract should be data-first:

```txt
app.manifest.json -> renderApp(manifest) -> registered scaffolds/plugins/blocks/providers
```

Custom code stays in registries:

```txt
registry.tsx -> custom metrics, custom blocks, custom pages, custom providers
```

## `createSaasApp` Decision

`createSaasApp` is legacy.

Keep it physically only to avoid breaking the current proof apps while we extract them.

Decision:

- No new generated app should be authored with `createSaasApp`.
- No new golden template should document `createSaasApp`.
- `fayz doctor` should warn on `createSaasApp` usage and point to extraction.
- `fayz extract` should turn current `createSaasApp(config)` apps into `app.manifest.json` plus `registry.tsx`.
- After Beauty/resto extraction is validated, mark `createSaasApp` deprecated in code and remove it from public default docs.

Why not delete it today:

- Beauty is still the highest-value contract specimen.
- Removing the adapter before extraction would create churn without proving the new contract.
- The right move is to make it a one-way migration path, not a product API.

## Package Decision

Only `@fayz-ai/sdk` is the public npm contract right now.

- `@fayz-ai/sdk`: lean default package for every generated project.
- app-runtime: internal/platform-bundled rendering concept for `renderApp(manifest)`, not public npm yet.
- core/auth/ui/saas/domain/plugins remain modular monorepo code boundaries, not public product API.

This copies the useful Base44-style pattern: even simple projects get normalized API access and app params, without forcing the full UI/runtime bundle into every project.

## Plugin Factory Decision

Official plugins can keep factories internally to build `PluginManifest` objects, but generated apps should reference plugins by id and JSON config:

```json
{
  "surfaces": {
    "admin": {
      "scaffold": "admin",
      "plugins": [
        { "id": "agenda", "config": { "modules": { "financial": true } } },
        { "id": "financial", "config": { "currency": "BRL" } }
      ]
    }
  }
}
```

## Bridge Decision

Direct cross-plugin bridges such as `createFinancialBridge(financialProvider)` are also legacy compatibility patterns, not long-term platform contracts.

Recommended replacement:

- plugins declare dependencies, capabilities, events, and optional providers in their manifest;
- Agenda emits domain events such as `booking.confirmed`, `booking.cancelled`, `payment.received`;
- Financial subscribes and materializes invoices/orders/payments;
- runtime enforces permissions and provider access through Fayz, not through browser-held bridges.

This makes Slack/SAP/Notion-style integrations composable without coupling every plugin pair by hand.

## Integration Lessons to Copy

### Slack

Use Slack as the model for install lifecycle, granular scopes, bot/user token separation, uninstall/reinstall, and event subscriptions.

Fayz should copy the product shape, not expose tokens to plugins:

- app install starts in Fayz-owned Integrations;
- scopes are declared by the plugin manifest;
- grants are tenant/project/plugin specific;
- revocation and audit are first-class.

Reference: https://api.slack.com/authentication/oauth-v2 and https://api.slack.com/authentication/token-types

### Notion

Use Notion as the model for two modes:

- private/internal connection for one workspace or self-owned automation;
- public OAuth connection for reusable/marketplace integrations.

Fayz equivalent:

- private connector: tenant-owned static/bearer token stored in Fayz vault for private/self-hosted targets;
- public connector: OAuth-backed provider connection stored server-side and granted to plugins.

Reference: https://developers.notion.com/guides/get-started/authorization

### SAP

Treat SAP as an enterprise connector, not a normal lightweight plugin.

SAP-style integrations need:

- tenant/environment-specific connection records;
- OAuth client credentials and authorization-code support where applicable;
- destinations/base URLs, certificates, allowlists, and on-prem/proxy readiness later;
- strong admin permissions and audit before any runtime plugin can use a grant.

Reference: https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/oauth-client-credentials-authentication

### AppFlowy

Treat AppFlowy as a Notion-like and self-hosted-first integration.

Do not assume marketplace OAuth maturity. Support:

- base URL per tenant/environment;
- bearer/static token or future OAuth/OIDC where available;
- data access through Fayz broker so generated apps do not store workspace credentials.

## OAuth Decision

OAuth remains the right default for external provider authentication when a provider supports multi-tenant app installation.

But OAuth is only one part of the trust model:

- OAuth grants access to the external provider.
- Fayz plugin grants decide which tenant/project/plugin can use that provider.
- Plugin manifest/scopes define what a plugin may request.
- Runtime broker issues short-lived capabilities to generated apps/plugins.

The SDK is open source, so secrets and provider tokens must stay out of SDK and generated repos.

## Immediate Implementation Direction

After Vini approves this contract direction, the narrow next slice is:

1. Keep Beauty working while extracting away from current `createSaasApp`.
2. Add an extraction target where Beauty moves toward:

```txt
src/App.tsx        -> tiny renderApp wrapper
src/app.manifest.json
src/registry.tsx  -> Beauty-only metrics/blocks/lookups
```

3. Remove `createSaasApp` from the generated-app path and mark it as legacy in docs/tooling.
4. Keep `create*Plugin` factories as plugin-package internals.
5. Replace direct bridge patterns with event/capability contracts as the next shared plugin API milestone.
6. Continue OAuth-backed Runtime Session Broker as the provider access boundary.

## Remaining Decisions

- Provider onboarding UX and permission names in `25-provider-onboarding-decision-brief.md`.
- Beauty extraction sequence after package gates pass.

Do not refactor Beauty's `App.tsx` blindly; use it as the golden migration specimen and extract it toward the new contract after the package lock passes.
