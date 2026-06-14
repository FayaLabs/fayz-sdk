import * as React from 'react'
import { hashRouterAdapter } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Admin hash router — the same lightweight approach the storefront uses. The
// admin shell collects routes from the plugin runtime + manifest pages and
// switches on the current hash path. Deliberately not react-router: an SDK
// shell shipping a router creates singleton hazards under source-alias dev.
// ---------------------------------------------------------------------------

const adapter = hashRouterAdapter()

export function navigateTo(to: string): void {
  adapter.navigate(to)
}

export function useAdminPath(): string {
  const [path, setPath] = React.useState(() => adapter.getCurrentPath() || '/')
  React.useEffect(() => {
    return adapter.onPathChange((p) => {
      setPath(p || '/')
      if (typeof window !== 'undefined') window.scrollTo(0, 0)
    })
  }, [])
  return path
}

/** Match '/courses/:id' against '/courses/abc' → { id: 'abc' }; supports a
 *  trailing '/*' wildcard (matches the base and any deeper path). */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const cleanPath = (path.split('?')[0] ?? '').replace(/\/+$/, '') || '/'
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2)
    if (cleanPath === base || cleanPath.startsWith(`${base}/`)) return {}
    return null
  }
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = cleanPath.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const pat = patternParts[i]!
    const part = pathParts[i]!
    if (pat.startsWith(':')) params[pat.slice(1)] = decodeURIComponent(part)
    else if (pat !== part) return null
  }
  return params
}

/** Score a route pattern for specificity so the most specific match wins
 *  (static segments beat params; longer beats shorter; wildcard loses). */
export function routeScore(pattern: string): number {
  if (pattern.endsWith('/*')) return -1
  const parts = pattern.split('/').filter(Boolean)
  let score = parts.length * 10
  for (const p of parts) if (!p.startsWith(':')) score += 5
  return score
}
