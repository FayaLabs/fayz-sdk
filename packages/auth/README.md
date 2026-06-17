# @fayz-ai/auth

> Pluggable auth for Fayz apps — one hook, swappable adapters.

[![npm](https://img.shields.io/npm/v/@fayz-ai/auth.svg)](https://www.npmjs.com/package/@fayz-ai/auth)
[![license](https://img.shields.io/npm/l/@fayz-ai/auth.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Auth shouldn't be the thing that couples your app to a backend. `@fayz-ai/auth` wraps authentication behind the core `AuthAdapter` contract so a Fayz app reads the same whether it's running on Supabase in production or a mock adapter in tests and previews. One provider, one `useAuth` hook, a Zustand-backed session store — the rest is an implementation detail you can swap.

This is the auth layer for composed Fayz SaaS apps: drop in `AuthProvider`, pick an adapter, and every plugin gets a consistent user and session without knowing where it came from.

## What's inside
- `createSupabaseAuthAdapter` — production Supabase auth, typed via `SupabaseAuthConfig`
- `createMockAuthAdapter` — deterministic auth for tests, demos, and previews (`MockUser`)
- `AuthProvider` + `useAuth` — React context and hook for the current user and session
- `useAuthStore` — the underlying Zustand store (`AuthState`, `AuthStore`) for advanced access

## Install
```bash
npm install @fayz-ai/auth
```
Peer dep: `react` (^18 or ^19). Built on `@fayz-ai/core`.

## Usage
```tsx
import { AuthProvider, useAuth, createSupabaseAuthAdapter } from '@fayz-ai/auth'

const adapter = createSupabaseAuthAdapter({ url, anonKey })

function App() {
  return (
    <AuthProvider adapter={adapter}>
      <Dashboard />
    </AuthProvider>
  )
}

function Dashboard() {
  const { user } = useAuth()
  return <p>Hello, {user?.email}</p>
}
```

## Part of the Fayz SDK
The auth seam between `@fayz-ai/core` and the multi-tenant `@fayz-ai/saas` layer.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#auth) for current gaps, missing features, and good first issues.
