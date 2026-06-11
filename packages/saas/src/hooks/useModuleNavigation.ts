import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Navigation direction for transition animations.
 * 'forward' = deeper into content (list → detail → edit, or main → settings)
 * 'back' = returning to parent (edit → detail → list, or settings → main)
 */
export type NavDirection = 'forward' | 'back'

/**
 * View depth mapping — used to determine animation direction.
 * Higher depth = deeper in the navigation hierarchy.
 */
export type DepthMap = Record<string, number>

const DEFAULT_DEPTHS: DepthMap = {
  summary: 0,
  list: 0,
  new: 1,
  edit: 2,
  detail: 1,
  settings: 1,
}

/**
 * Reusable module navigation hook for plugins.
 * Manages view state, hash synchronization, and animation direction.
 *
 * @param hashBase — the base hash path for this module (e.g. '/financial')
 * @param depthMap — optional custom depth mapping for views
 */
export function useModuleNavigation(hashBase: string, depthMap?: DepthMap, homeView = 'summary') {
  const depths = { ...DEFAULT_DEPTHS, ...depthMap }

  function getInitialView(): string {
    const rawHash = window.location.hash.slice(1) || '/'
    // Strip query string from hash before parsing segments
    const hash = rawHash.split('?')[0]
    if (hash === hashBase || hash === hashBase + '/') return homeView
    if (hash.startsWith(hashBase + '/settings')) return 'settings'
    if (hash.startsWith(hashBase + '/')) {
      const rest = hash.slice(hashBase.length + 1)
      const segments = rest.split('/')
      // '/inventory/dashboard' → treat as home view
      if (segments.length === 1 && segments[0] === homeView) return homeView
      // Detect action + ID patterns: '/products/edit/uuid' or '/stock/detail/uuid'
      const ACTION_KEYWORDS = ['edit', 'detail', 'view']
      if (segments.length >= 3) {
        const maybeAction = segments[segments.length - 2]
        if (ACTION_KEYWORDS.includes(maybeAction)) {
          return segments.slice(0, -2).join('-') + '-' + maybeAction + ':' + segments[segments.length - 1]
        }
      }
      return segments.join('-')
    }
    return homeView
  }

  const [view, setView] = useState(getInitialView)
  const [direction, setDirection] = useState<NavDirection>('forward')
  const prevDepthRef = useRef(getDepth(getInitialView()))

  // Sync view from external hash changes (e.g., topbar nav clicking the module link)
  useEffect(() => {
    function handler() {
      const hash = (window.location.hash.slice(1) || '/').split('?')[0]
      // Only react if the hash is within our module's base
      if (hash === hashBase || hash === hashBase + '/' || hash.startsWith(hashBase + '/')) {
        const newView = getInitialView()
        if (newView !== view) {
          const nextDepth = getDepth(newView)
          setDirection(nextDepth > prevDepthRef.current ? 'forward' : 'back')
          prevDepthRef.current = nextDepth
          setView(newView)
        }
      }
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [view, hashBase])

  function getDepth(v: string): number {
    // Check exact match first
    if (depths[v] !== undefined) return depths[v]
    // Check base view name (e.g. 'payables-list' → check 'list', 'payables-new' → check 'new')
    const parts = v.split('-')
    const suffix = parts[parts.length - 1]
    if (depths[suffix] !== undefined) return depths[suffix]
    // Edit with ID (e.g. 'payables-edit:123')
    if (v.includes('edit')) return depths.edit ?? 2
    return 0
  }

  const navigate = useCallback((nextView: string, hash?: string) => {
    const nextDepth = getDepth(nextView)
    setDirection(nextDepth > prevDepthRef.current ? 'forward' : 'back')
    prevDepthRef.current = nextDepth
    setView(nextView)

    // Sync hash — explicit hash takes priority, otherwise derive from view name
    if (hash) {
      window.location.hash = hash
    } else if (nextView === homeView || nextView === 'summary' || nextView === '') {
      window.location.hash = hashBase
    } else {
      // Convert view name to URL-friendly path: 'payables-list' → '/financial/payables/list'
      // 'payables-edit:uuid-with-dashes' → '/financial/payables/edit/uuid-with-dashes'
      const colonIdx = nextView.indexOf(':')
      if (colonIdx !== -1) {
        // Has an ID after colon — only convert dashes in the prefix, keep ID intact
        const prefix = nextView.slice(0, colonIdx).replace(/-/g, '/')
        const id = nextView.slice(colonIdx + 1)
        window.location.hash = `${hashBase}/${prefix}/${id}`
      } else {
        const path = nextView.replace(/-/g, '/')
        window.location.hash = `${hashBase}/${path}`
      }
    }
  }, [hashBase])

  const animationClass = direction === 'forward' ? 'saas-nav-forward' : 'saas-nav-back'

  return { view, direction, animationClass, navigate }
}
