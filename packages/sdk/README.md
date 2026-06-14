# @fayz-ai/sdk

TypeScript SDK for generated Fayz projects.

Use this package in every Fayz-generated project to standardize API access, app params, shared types, and Runtime OAuth broker calls.

## Install

```bash
npm install @fayz-ai/sdk
```

## Basic Usage

```ts
import { fayz } from '@fayz-ai/sdk'
import { appParams } from '@fayz-ai/sdk/app-params'

const currentUser = await fayz.auth.me()

console.log(appParams.appId, currentUser)
```

## Custom Client

```ts
import { createFayzClient } from '@fayz-ai/sdk'

const fayz = createFayzClient({
  baseUrl: 'https://api.fayz.ai',
  appId: 'app_123',
  token: 'runtime-token',
})

const user = await fayz.auth.me()
```

## Runtime OAuth Broker

Provider OAuth secrets and refresh tokens stay server-side in Fayz. Generated projects should exchange a short-lived runtime token through Fayz and call brokered helpers.

```ts
import { createFayzRuntimeClient } from '@fayz-ai/sdk/runtime'

const runtime = createFayzRuntimeClient({
  baseUrl: 'https://api.fayz.ai',
  projectId: 'project_123',
  runtimeToken: 'runtime-token',
})

const grant = await runtime.exchangePluginOAuth({
  pluginId: 'agenda',
  scopes: ['google.calendar.readonly'],
})

const calendars = await runtime.googleCalendar(grant.token).listCalendars()
```

## Package Roles

- `@fayz-ai/sdk`: default SDK package for every generated project.
- `@fayz-ai/app-runtime`: manifest app rendering and UI/plugin runtime package. Use it only when rendering a Fayz manifest app.

## Security Boundary

Do not put OAuth client secrets, provider refresh tokens, partner API keys, tenant authority decisions, or raw Fayz service secrets in SDK packages, generated repos, manifests, or browser code.

## License

MIT
