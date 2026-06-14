# 18 — FAY-1182 Runtime Session Decision

Last updated: 2026-06-13 21:53 BRT

## Decision

Vini decision captured at 2026-06-13 21:53 BRT:

- Fayz SDK is open source.
- Plugin authentication should use OAuth.
- Secrets, refresh tokens, provider credentials, and tenant authority must live in Fayz/server-side infrastructure, not in the open-source SDK or generated browser code.

`backend.provider = "fayz-api"` is safe for editor/preview flows after the current runtime-token work. It is not production-ready for public generated apps until Fayz has a trusted OAuth-backed Runtime Session Broker / server-side exchange.

## Current Ground Truth

Already implemented:

- Runtime data JWT with strict audience/token-use, short expiry, signed `projectId`, `tenantId`, optional `tenantIdColumn`, and deny-by-default row permissions.
- Runtime data routes under `/api/v1/runtime/projects/:projectId/database/...`.
- Server-side tenant enforcement in database row service for list/create/update/delete.
- Editor/preview issuer at `POST /api/projects/:projectId/database/runtime-token`, protected by Fayz JWT + project `EDITOR` role.
- SDK `createFayzApiProvider({ runtimeToken })` switches to runtime routes and does not trust browser-supplied tenant filters.

Still missing:

- A production issuer that maps a public generated-app user/session to a trusted Fayz runtime token.
- A canonical tenant membership/principal model for generated app users.
- Refresh/revocation rules for runtime data JWTs used by public apps.
- OAuth connection storage for plugin/provider accounts, including encrypted refresh tokens and tenant-scoped grants.
- A manifest/plugin declaration model for OAuth needs: provider id, scopes, redirect policy, and required connection status.

## Recommended Default

Use a **Fayz-hosted OAuth + Runtime Session Broker** as the default production path.

Flow:

1. Generated app authenticates the end user through the generated app's configured auth surface.
2. Plugin setup connects third-party accounts through Fayz-hosted OAuth, using Authorization Code + PKCE where appropriate.
3. Fayz stores OAuth refresh/access material server-side, encrypted and tenant-scoped.
4. Browser calls a Fayz-hosted exchange endpoint with its generated-app session, not with a raw tenant id or OAuth secret.
5. Fayz API resolves the runtime principal server-side:
   - project/app id;
   - tenant id;
   - user/customer id;
   - plugin/provider connection grants;
   - allowed entities/plugins/actions.
6. Fayz API mints short-lived runtime data/plugin access tokens.
7. SDK open-source clients use provider adapters with short-lived tokens/capabilities against `/api/v1/runtime/...` and plugin proxy routes.

What the open-source SDK owns:

- public interfaces;
- manifest/plugin declarations;
- OAuth initiation helpers that redirect to Fayz;
- data/provider adapters that consume short-lived tokens;
- no secrets and no privileged tenant decisions.

What Fayz owns server-side:

- OAuth apps/client secrets;
- token exchange, refresh, revocation, and audit logs;
- tenant membership resolution;
- plugin/provider grants;
- runtime token issuance.

Previous data-only flow remains valid as a subset:

1. Generated app authenticates the end user through the generated app's configured auth surface.
2. Browser calls a Fayz-hosted exchange endpoint with its generated-app session, not with a raw tenant id.
3. Fayz API resolves the runtime principal server-side:
   - project/app id;
   - tenant id;
   - user/customer id;
   - allowed entities/plugins/actions.
4. Fayz API mints a short-lived runtime data JWT.
5. SDK `createFayzApiProvider({ runtimeToken: async () => ... })` uses that JWT against `/api/v1/runtime/...`.

Why this should be the default:

- Fits the open-source SDK strategy: package code can be public because secrets and trust decisions stay in Fayz.
- Keeps long-lived Fayz secrets out of generated browser code.
- Keeps third-party OAuth refresh tokens out of generated browser code.
- Centralizes tenant and permission semantics, which matters for plugins/modules at scale.
- Gives plugin developers a standard installation/auth path instead of each plugin inventing credential storage.
- Lets Fayz evolve AppManifest, roles, billing, audit logs, and plugin permissions without every generated app inventing auth infrastructure.
- Gives agents one canonical pattern to learn.

## Alternatives

### External Deployment BFF

Generated apps deployed outside Fayz can run their own server-side `/runtime-token` exchange.

Use this as an advanced/custom deployment mode, not the default. It is valid only if the external server holds the secret and Fayz documents the exchange contract clearly.

### Direct Supabase/RLS Runtime

Keep generated public apps on Supabase/RLS for now and use `fayz-api` only for editor/preview.

This is safer short term, but it fragments the plugin data contract and delays the ERP/plugin platform vision.

### Browser-Minted Runtime Tokens

Reject.

Never mint runtime data JWTs or expose partner `ApiToken` / Fayz server secrets from browser code. Browser-supplied tenant ids are hints at most, never authority.

### Plugin-Owned Secret Storage In Generated Apps

Reject as the default.

Generated apps and open-source SDK plugins must not store OAuth refresh tokens, app secrets, partner API keys, or tenant-authority material in browser code or repo files. Advanced self-hosted deployments may provide a server-side secret store, but they must still follow the same broker contract.

## Minimum Acceptance Gates

Before marking `FAY-1182` done for production generated apps:

- Runtime session exchange endpoint exists and is separate from editor/preview issuer.
- OAuth plugin connection flow exists for at least one provider/integration class.
- OAuth refresh tokens/provider credentials are encrypted server-side and scoped to project + tenant + plugin/provider.
- Manifest/plugin metadata can declare required OAuth provider/scopes without storing secrets.
- Exchange derives `tenantId` from server-side session/membership, never raw browser input.
- Runtime principal model supports at least project id, tenant id, subject id, and per-entity permissions.
- Runtime principal model includes plugin/provider connection grants.
- Runtime tokens stay short-lived and scoped to one project/tenant.
- Refresh uses a server-validated session; OAuth/runtime revocation strategy is documented.
- SDK/generated scaffold has one blessed pattern for `runtimeToken` retrieval.
- Tests cover: missing session, wrong project, wrong tenant, denied operation, expired token, OAuth connection missing, revoked connection, refresh, and allowed read/write.

## Suggested Next Slice

Implement a narrow proof for the recommended path without changing public product commitments:

1. Add a non-public `RuntimePrincipal` + plugin OAuth connection resolver interface in Fayz API.
2. Keep editor/preview issuer as-is.
3. Add a draft OAuth connection model/route behind an explicit feature flag.
4. Add a draft public exchange route behind an explicit feature flag.
5. Create tests for "browser tenant id cannot widen scope" and "missing OAuth connection cannot call plugin provider".
6. Update scaffold/agent docs to say public `fayz-api` runtime is blocked until this OAuth-backed broker is enabled.
