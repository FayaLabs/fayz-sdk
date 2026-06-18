import { useNavReferrer, navHistoryBack, routeModule } from '@fayz-ai/core'

/**
 * Context-aware back target shared by all header/breadcrumb components.
 *
 * When the user arrived from a *different* module (tracked in the global
 * navigation history), a page's own onBack/parentLabel point at its local
 * parent — wrong for the referrer. In that case we return the referrer's label
 * and a back action that pops the browser history to the actual previous page.
 * Within the same module the page's own (more specific) values pass through
 * unchanged, so existing behavior is preserved.
 */
export function useCrossModuleBack(onBack?: () => void, parentLabel?: string): {
  onBack?: () => void
  parentLabel?: string
  isCrossModule: boolean
} {
  const currentPath = typeof window !== 'undefined'
    ? ((window.location.hash ? window.location.hash.slice(1) : window.location.pathname) || '/')
    : '/'
  const referrer = useNavReferrer(currentPath)
  const cross = referrer && referrer.label && routeModule(referrer.path) !== routeModule(currentPath)
    ? referrer
    : null
  return {
    onBack: cross ? () => navHistoryBack(onBack) : onBack,
    parentLabel: cross ? cross.label : parentLabel,
    isCrossModule: !!cross,
  }
}
