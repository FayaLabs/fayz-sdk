import * as React from 'react'

export interface RouterAdapter {
  navigate: (path: string) => void
  usePathname: () => string
}

export function windowRouterAdapter(): RouterAdapter {
  return {
    navigate: (path) => {
      window.location.href = path
    },
    usePathname: () => {
      const [pathname, setPathname] = React.useState(
        typeof window !== 'undefined' ? window.location.pathname : '/'
      )

      React.useEffect(() => {
        const handler = () => setPathname(window.location.pathname)
        window.addEventListener('popstate', handler)
        return () => window.removeEventListener('popstate', handler)
      }, [])

      return pathname
    },
  }
}

export function hashRouterAdapter(): RouterAdapter {
  return {
    navigate: (path) => {
      window.location.hash = path
    },
    usePathname: () => {
      const [pathname, setPathname] = React.useState(
        typeof window !== 'undefined' ? window.location.hash.slice(1) || '/' : '/'
      )

      React.useEffect(() => {
        const handler = () => setPathname(window.location.hash.slice(1) || '/')
        window.addEventListener('hashchange', handler)
        return () => window.removeEventListener('hashchange', handler)
      }, [])

      return pathname
    },
  }
}

export function reactRouterAdapter(
  navigateFn: (path: string) => void,
  useLocationHook: () => { pathname: string }
): RouterAdapter {
  return {
    navigate: navigateFn,
    usePathname: () => useLocationHook().pathname,
  }
}

// --- Module-level singleton (avoids React context issues with linked packages) ---

let _globalRouter: RouterAdapter | null = null

export function setGlobalRouter(adapter: RouterAdapter): void {
  _globalRouter = adapter
}

export function getGlobalRouter(): RouterAdapter {
  return _globalRouter ?? windowRouterAdapter()
}

// --- React Context (still available, but useRouter prefers singleton) ---

const RouterContext = React.createContext<RouterAdapter | null>(null)

export const RouterProvider = RouterContext.Provider

export function useRouter(): RouterAdapter {
  // Prefer context if available
  const ctx = React.useContext(RouterContext)
  if (ctx) return ctx
  // Fall back to module singleton
  if (_globalRouter) return _globalRouter
  // Last resort
  return windowRouterAdapter()
}
