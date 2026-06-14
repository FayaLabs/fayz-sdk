# 24 - Runtime OAuth Helper Contract

Last updated: 2026-06-14 00:42 BRT

## Executive Summary

The open-source SDK now has a canonical helper for generated apps and plugins to talk to Fayz runtime services without receiving provider credentials.

Use `createFayzRuntimeClient()` from `@fayz/core` or `@fayz/runtime`.

The helper is intentionally small:

- exchange a short-lived runtime-data token for a short-lived Plugin OAuth broker token;
- call brokered provider routes such as Google Calendar events;
- keep OAuth client secrets, provider access tokens, refresh tokens, tenant authority, revocation, and audit in Fayz server-side infrastructure.

## Import Contract

Preferred once package source is confirmed:

```ts
import { createFayzRuntimeClient } from '@fayz/runtime'
```

Direct core import is also supported:

```ts
import { createFayzRuntimeClient } from '@fayz/core/runtime'
```

Root core import is supported for compatibility:

```ts
import { createFayzRuntimeClient } from '@fayz/core'
```

## Safe Usage Pattern

```ts
import { createFayzRuntimeClient } from '@fayz/runtime'

const fayz = createFayzRuntimeClient({
  baseUrl: import.meta.env.VITE_FAYZ_API_URL,
  projectId: import.meta.env.VITE_FAYZ_PROJECT_ID,
  runtimeToken: async () => {
    const response = await fetch('/api/fayz/runtime-token')
    if (!response.ok) throw new Error('Unable to mint Fayz runtime token')
    const body = await response.json()
    return body.token
  },
})

const broker = await fayz.exchangePluginOAuth({
  pluginId: 'agenda',
  environment: 'production',
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
})

const calendar = fayz.googleCalendar(broker.token)

await calendar.createEvent('primary', {
  summary: 'Client booking',
  start: { dateTime: '2026-06-14T13:00:00-03:00', timeZone: 'America/Sao_Paulo' },
  end: { dateTime: '2026-06-14T13:30:00-03:00', timeZone: 'America/Sao_Paulo' },
})
```

## Agent Guardrails

Agents may:

- use SDK helpers for runtime data and Plugin OAuth broker calls;
- request missing provider/scopes through manifest/plugin metadata;
- add UI states for "connect provider", "missing grant", and "disconnected";
- call Fayz runtime routes with short-lived broker/runtime tokens.

Agents must not:

- create OAuth clients inside generated apps;
- store OAuth client secrets, refresh tokens, Google access tokens, partner API keys, or Fayz server secrets in SDK/generated repos;
- pass raw tenant ids as authority for runtime access;
- call Google Calendar or other providers directly from browser code when the provider requires server-owned credentials;
- mark public `fayz-api` generated apps as production-ready until the runtime session broker and provider onboarding flow are connected.

## Current Implementation State

Implemented locally in SDK:

- `@fayz/core/runtime` subpath;
- `createFayzRuntimeClient()`;
- `exchangePluginOAuth()`;
- `googleCalendar().listEvents()`;
- `googleCalendar().createEvent()`;
- `googleCalendar().updateEvent()`;
- `googleCalendar().deleteEvent()`;
- typed `FayzRuntimeError`.

Implemented in Fayz PR `#927`:

- runtime-data token foundation;
- Plugin OAuth broker foundation;
- Plugin OAuth exchange route;
- Google Calendar broker read/write proxy;
- revocation/audit foundation;
- generated scaffold helper and behavior tests.

## Remaining Product Decisions

Blocked on Vini/product decision:

- SDK remote/package-source destination for open-source publication;
- provider onboarding/disconnect UX and permission model in Fayz;
- when to replace scaffold-local helper imports with package imports in generated projects.

