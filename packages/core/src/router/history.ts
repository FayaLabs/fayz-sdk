import { create } from 'zustand'

/**
 * Global, cross-module navigation history.
 *
 * Per-module nav hooks (useModuleNavigation) only remember views *within* one
 * module, so they can't tell you where you came from after crossing a module
 * boundary (e.g. Financial statements → a client/person page). This store sits
 * above all modules: the app shell records every route change here with a
 * human label, and the shared SubpageHeader reads it to render a context-aware
 * "back to {where you came from}" link that returns to the actual previous page.
 */

export interface NavHistoryEntry {
  /** Route path without the leading '#', e.g. '/financial/statements'. */
  path: string
  /** Human, module-level label for the page, e.g. 'Financeiro'. */
  label: string
}

interface NavHistoryState {
  stack: NavHistoryEntry[]
  /** Record a visit. Consecutive visits to the same path collapse (label refreshes). */
  record: (entry: NavHistoryEntry) => void
}

const MAX_ENTRIES = 20

export const useNavHistoryStore = create<NavHistoryState>((set) => ({
  stack: [],
  record: (entry) =>
    set((s) => {
      const top = s.stack[s.stack.length - 1]
      if (top && top.path === entry.path) {
        if (top.label === entry.label) return s
        const next = s.stack.slice()
        next[next.length - 1] = entry
        return { stack: next }
      }
      const next = [...s.stack, entry]
      return { stack: next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next }
    }),
}))

/** Record a route visit. Call from the app shell whenever the route changes. */
export function recordNavigation(path: string, label: string): void {
  useNavHistoryStore.getState().record({ path, label })
}

// Dev-only debug handle: inspect history in the console via `__navHistory.getState().stack`.
if (typeof window !== 'undefined') {
  ;(window as unknown as { __navHistory?: typeof useNavHistoryStore }).__navHistory = useNavHistoryStore
}

/**
 * The page the user most recently came from, relative to `currentPath`.
 *
 * Returns the latest recorded entry whose path differs from `currentPath`. This
 * is intentionally robust to ordering: it gives the right referrer whether or
 * not the current page has been recorded yet, avoiding a stale first paint.
 */
export function useNavReferrer(currentPath: string): NavHistoryEntry | null {
  return useNavHistoryStore((s) => {
    for (let i = s.stack.length - 1; i >= 0; i--) {
      if (s.stack[i].path !== currentPath) return s.stack[i]
    }
    return null
  })
}

/**
 * Return to the actual previous page via the browser history. Falls back to the
 * provided callback when there's no in-app history to pop (e.g. a deep link).
 */
export function navHistoryBack(fallback?: () => void): void {
  if (useNavHistoryStore.getState().stack.length >= 2) {
    window.history.back()
  } else {
    fallback?.()
  }
}

/** Top-level module segment of a route path ('/financial/statements' → 'financial'). */
export function routeModule(path: string): string {
  return path.replace(/^\/+/, '').split('/')[0] ?? ''
}
