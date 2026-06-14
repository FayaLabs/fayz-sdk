# 25 - Provider Onboarding Decision Brief

Last updated: 2026-06-14 00:51 BRT

## Executive Summary

The OAuth broker is technically far enough for the next product decision.

Recommendation: use a **Fayz-owned integrations surface** as the system of record, with lightweight inline CTAs inside Panel/plugins when a provider is missing.

This keeps the open-source SDK clean and gives Fayz one controlled place for:

- provider connection;
- tenant/project/plugin grant approval;
- disconnect and revocation;
- audit trail;
- future billing and marketplace rules.

## Decision Needed

Vini should approve one of these product directions before we expose public/admin routes:

1. **Recommended: Fayz-owned Integrations surface plus inline plugin CTA**
   - Connect/disconnect happens in Fayz Project Settings or Cloud Features.
   - Panel/plugin pages can show "Connect Google Calendar" or "Grant access" when missing.
   - CTA opens Fayz-owned flow.
   - Generated apps never store provider credentials or own OAuth client secrets.

2. **Inline plugin setup only**
   - Each plugin owns its setup UI.
   - Faster for a demo but weaker platform consistency.
   - Higher risk of every plugin inventing its own language, permission prompts, and disconnect behavior.

3. **Generated app self-service setup**
   - End users connect providers inside the generated app.
   - Not recommended as the default yet because the runtime session/principal model is not complete.
   - Valid later for advanced deployments after the same broker contract is enforced.

## Recommended Product Flow

### Install or enable plugin

1. User installs/enables a plugin, for example Agenda.
2. Fayz reads plugin metadata: provider, scopes, tenant scope, environment, required/optional status.
3. Fayz shows required integrations before the plugin is considered fully configured.

### Connect provider

1. User clicks "Connect Google Calendar" in Fayz-owned UI.
2. Fayz starts OAuth Authorization Code flow server-side.
3. Fayz stores encrypted access/refresh token material in server-side infrastructure.
4. Fayz records provider account display information without exposing tokens.

### Grant provider to plugin

1. User selects which project, tenant, environment, and plugin receives the provider grant.
2. Fayz validates requested scopes are a subset of the provider connection scopes.
3. Fayz creates or refreshes the project/plugin grant.
4. Runtime plugins exchange short-lived runtime-data tokens for short-lived broker tokens.

### Disconnect or revoke

1. User opens Integrations.
2. User can revoke one plugin grant or disconnect the whole provider connection.
3. Fayz writes redacted audit events.
4. Runtime broker calls stop resolving revoked grants.

## Permission Model Recommendation

Create or map these capabilities before exposing routes:

- `manage_integrations`: connect/disconnect provider accounts and view integration status.
- `manage_plugin_grants`: grant/revoke provider access to plugins.
- `view_integrations`: see provider/plugin connection status without token detail.

Recommended defaults:

- Organization owner/admin: all three permissions.
- Project editor: `view_integrations`; optionally `manage_plugin_grants` only if Vini wants editors to configure plugins.
- Generated app end user: no provider setup permission by default; only uses brokered runtime capabilities granted server-side.

## Surface Recommendation

Use three surfaces with different responsibility:

- **Fayz Project Settings / Cloud Features**: source of truth for OAuth provider connections and disconnect.
- **Fayz editor Panel**: status and CTA only; no token detail.
- **Generated app runtime**: uses brokered SDK helpers only; no OAuth setup by default.

This matches the strategic direction: Fayz is the trust layer, SDK is open-source runtime/client code, plugins declare needs but do not own secrets.

## Minimum API/UI Slice After Approval

Narrow implementation slice:

1. Admin/authenticated routes to list provider connections and project/plugin grants.
2. Admin/authenticated route to revoke a grant.
3. Admin/authenticated route to revoke a provider connection.
4. Web UI card in Project Settings or Cloud Features showing Google Calendar connection status.
5. Panel/plugin missing-grant CTA that links to the Fayz-owned setup surface.
6. Tests for permission denial, redacted responses, revoked grant behavior, and route-doc parity.

Do not implement provider OAuth callback UX until the route ownership, redirect URL, and permission names are approved.

## Current Backend Ground Truth

Already implemented in Fayz PR `#927`:

- runtime Plugin OAuth exchange route;
- Google Calendar read/write proxy routes;
- encrypted provider token storage/refresh helpers;
- service-level grant and connection revocation;
- redacted audit-event foundation;
- generated scaffold helper and behavior tests;
- SDK helper and contract docs locally in `fayz-sdk`.

Still not exposed:

- authenticated provider onboarding routes;
- authenticated revocation routes;
- settings UI;
- inline plugin CTA;
- production public generated-app principal/session flow.

## My CTO Recommendation

Approve option 1.

Reason: it is the only path that scales from Beauty agenda demo to marketplace plugins without turning every generated app/plugin into its own security product.

