import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLayoutStore } from '../stores/layout.store'

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const BREAKPOINTS: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  return 'sm'
}

export function useLayout() {
  const store = useLayoutStore()
  const [isMobile, setIsMobile] = useState(false)
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg')

  useEffect(() => {
    // Track printing state to prevent layout thrashing during Ctrl+P.
    // The print viewport is narrow, which would flip isMobile→true,
    // causing component unmount/remount and losing loaded data.
    let printing = false
    const onBeforePrint = () => { printing = true }
    const onAfterPrint = () => { printing = false }
    window.addEventListener('beforeprint', onBeforePrint)
    window.addEventListener('afterprint', onAfterPrint)

    const mobileQuery = window.matchMedia('(max-width: 767px)')

    const handleMobileChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (!printing) setIsMobile(e.matches)
    }

    handleMobileChange(mobileQuery)
    mobileQuery.addEventListener('change', handleMobileChange)

    const handleResize = () => {
      if (!printing) setCurrentBreakpoint(getBreakpoint(window.innerWidth))
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('beforeprint', onBeforePrint)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [])

  const closeMobileDrawer = useCallback(() => {
    if (store.mobileDrawerOpen) {
      store.toggleMobileDrawer()
    }
  }, [store])

  return useMemo(
    () => ({
      ...store,
      isMobile,
      currentBreakpoint,
      closeMobileDrawer,
    }),
    [store, isMobile, currentBreakpoint, closeMobileDrawer]
  )
}
