import { hashRouterAdapter } from '@fayz-ai/core'

// Shared hash-router adapter — the same singleton the admin shell drives, so
// navigateTo here updates the shell's active route.
const adapter = hashRouterAdapter()

export function navigateTo(to: string): void {
  adapter.navigate(to)
}
