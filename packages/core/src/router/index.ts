export interface RouterAdapter {
  navigate(to: string): void
  getCurrentPath(): string
  onPathChange(cb: (path: string) => void): () => void
}

export function hashRouterAdapter(): RouterAdapter {
  return {
    navigate(to) { window.location.hash = to },
    getCurrentPath() { return window.location.hash.slice(1) || '/' },
    onPathChange(cb) {
      const handler = () => cb(window.location.hash.slice(1) || '/')
      window.addEventListener('hashchange', handler)
      return () => window.removeEventListener('hashchange', handler)
    },
  }
}

export function windowRouterAdapter(): RouterAdapter {
  return {
    navigate(to) { window.history.pushState(null, '', to) },
    getCurrentPath() { return window.location.pathname },
    onPathChange(cb) {
      const handler = () => cb(window.location.pathname)
      window.addEventListener('popstate', handler)
      return () => window.removeEventListener('popstate', handler)
    },
  }
}
