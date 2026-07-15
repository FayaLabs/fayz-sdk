# @fayz-ai/plugin-auth

## 0.1.0

### Initial release

- Extracted the reusable auth surface out of the SaaS shell into `@fayz-ai/plugin-auth`: a thin layer over `@fayz-ai/auth` that resolves Supabase/mock/custom adapters and renders the login / signup / recovery / reset / callback screens.
- `createAuthPlugin(options)` factory: provider selection, `requireAuth`, split/centered layout, and OAuth provider config.
- Extended the auth adapter contract to back app-owned RBAC and native team invites.
