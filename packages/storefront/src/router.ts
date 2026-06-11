import React, { useEffect, useState } from 'react'
import { hashRouterAdapter } from '@fayz/core'

// Minimal hash router for the storefront. Deliberately not react-router:
// an SDK package shipping a router dependency creates singleton hazards
// under source-alias dev setups, and six routes don't justify one.

const adapter = hashRouterAdapter()

export function navigateTo(to: string): void {
  adapter.navigate(to)
}

export function useHashPath(): string {
  const [path, setPath] = useState(() => adapter.getCurrentPath() || '/')
  useEffect(() => {
    const unsub = adapter.onPathChange((p) => {
      setPath(p || '/')
      window.scrollTo(0, 0)
    })
    return unsub
  }, [])
  return path
}

/** Match '/product/:slug' against '/product/leather-backpack' → { slug: 'leather-backpack' } */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const cleanPath = (path.split('?')[0] ?? '').replace(/\/+$/, '') || '/'
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

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
}

/** Real anchor (#/path) — middle-click/cmd-click friendly, Playwright friendly. */
export function Link({ to, children, ...rest }: LinkProps) {
  return React.createElement('a', { href: `#${to}`, ...rest }, children)
}
