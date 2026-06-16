import * as React from 'react'
import { cn } from '../utils/cn'

// ---------------------------------------------------------------------------
// PageTransition — the single, SDK-owned animation applied to every nested
// navigation (route changes in the shell + module-internal view changes).
// Plugins never implement transitions themselves; they render content and the
// shell/ModulePage wrap it in <PageTransition>. The style is provided app-wide
// via NavTransitionProvider so different products/repos can ship a different
// feel (slide | fade | none | future custom) without touching plugins.
// ---------------------------------------------------------------------------

export type NavTransition = 'slide' | 'fade' | 'none'

const NavTransitionContext = React.createContext<NavTransition>('slide')

export function NavTransitionProvider({ value, children }: { value: NavTransition; children: React.ReactNode }) {
  return <NavTransitionContext.Provider value={value}>{children}</NavTransitionContext.Provider>
}

export function useNavTransition(): NavTransition {
  return React.useContext(NavTransitionContext)
}

function resolveTransitionClass(transition: NavTransition, direction?: 'forward' | 'back'): string {
  if (transition === 'none') return ''
  if (transition === 'fade') return 'saas-page-enter'
  // slide (default) — direction-aware, falls back to a plain enter.
  if (direction === 'back') return 'saas-nav-back'
  if (direction === 'forward') return 'saas-nav-forward'
  return 'saas-page-enter'
}

/**
 * Wraps content and re-fires the active transition whenever `transitionKey`
 * changes (the key swap forces the node to remount, restarting the CSS
 * animation). Direction is optional and only used by the 'slide' transition.
 */
export function PageTransition({
  transitionKey,
  direction,
  className,
  children,
}: {
  transitionKey: string | number
  direction?: 'forward' | 'back'
  className?: string
  children: React.ReactNode
}) {
  const transition = useNavTransition()
  const animClass = resolveTransitionClass(transition, direction)
  return (
    <div key={transitionKey} className={cn(animClass, className)}>
      {children}
    </div>
  )
}
