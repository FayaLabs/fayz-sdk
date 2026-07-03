# @fayz-ai/plugin-auth

Reusable auth runtime and UI for Fayz apps.

`plugin-auth` is a thin layer over `@fayz-ai/auth`: it resolves Supabase/mock/custom adapters, renders login/signup/recovery/reset/callback surfaces, and gives SaaS or storefront apps one consistent auth integration path.

## Usage

```tsx
import { createAuthPlugin } from '@fayz-ai/plugin-auth'

export const auth = createAuthPlugin({
  provider: import.meta.env.VITE_SUPABASE_URL ? 'supabase' : 'mock',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  requireAuth: true,
  layout: 'split',
  oauth: { enabled: true, providers: ['google'] },
})
```
