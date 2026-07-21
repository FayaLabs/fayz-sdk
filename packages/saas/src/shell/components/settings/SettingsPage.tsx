import * as React from 'react'
import { Building2, User, Shield, Palette, ArrowLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { ConnectedCompanySettings } from './ConnectedCompanySettings'
import { ConnectedUserProfile } from './ConnectedUserProfile'
import { ConnectedSecuritySettings } from './ConnectedSecuritySettings'
import { ConnectedBrandingSettings } from './ConnectedBrandingSettings'

export interface SettingsTab {
  id: string
  label: string
  icon?: React.ReactNode
  /** Lucide icon name — used when these tabs are rendered in the app sidebar
   *  (which resolves icons by name) instead of in the in-page nav. */
  iconName?: string
  component: React.ReactNode
  /** Plugin-contributed tab — draws the core/plugins divider. */
  isPlugin?: boolean
}

/** The core (non-plugin, non-org) settings tabs. Exported so the shell can
 *  build the same list for the contextual /settings sidebar. */
export function useCoreSettingsTabs({
  showCompany = true,
  showBranding = true,
}: { showCompany?: boolean; showBranding?: boolean } = {}): SettingsTab[] {
  const { t } = useTranslation()
  return React.useMemo(() => [
    ...(showCompany ? [{ id: 'general', label: t('settings.general'), icon: <Building2 className="h-4 w-4" />, iconName: 'Building2', component: <ConnectedCompanySettings /> }] : []),
    { id: 'profile', label: t('settings.profile'), icon: <User className="h-4 w-4" />, iconName: 'User', component: <ConnectedUserProfile /> },
    { id: 'security', label: t('settings.security'), icon: <Shield className="h-4 w-4" />, iconName: 'Shield', component: <ConnectedSecuritySettings /> },
    ...(showBranding ? [{ id: 'branding', label: t('settings.branding'), icon: <Palette className="h-4 w-4" />, iconName: 'Palette', component: <ConnectedBrandingSettings /> }] : []),
  ], [t, showCompany, showBranding])
}

interface SettingsPageProps {
  tabs?: SettingsTab[]
  extraTabs?: SettingsTab[]
  defaultTab?: string
  className?: string
  beforeContent?: React.ReactNode
  afterContent?: React.ReactNode
  /** Show the company "Geral" (organization general) tab. Default: true.
   *  B2C apps pass false to hide org-identity settings. Ignored when `tabs` is
   *  supplied explicitly. */
  showCompany?: boolean
  /** Show the branding ("Identidade Visual") tab. Default: true. Ignored when
   *  `tabs` is supplied explicitly. */
  showBranding?: boolean
  /** The shell already renders this nav (contextual /settings sidebar), so the
   *  desktop in-page nav column is dropped and the content spans the page.
   *  Mobile keeps its master/detail list — the sidebar is a drawer there. */
  hideNav?: boolean
  /** Controlled active tab. When provided (the shell owns the settings nav and
   *  drives it from the URL), this — not the internal hashchange state — decides
   *  which tab's content renders, so navigating between tabs from the shell
   *  sidebar reliably swaps the content. Uncontrolled (undefined) keeps the
   *  self-managed behaviour used by standalone <SettingsPage> mounts. */
  activeTabId?: string
}

export function SettingsPage({
  tabs,
  extraTabs,
  defaultTab,
  className,
  beforeContent,
  afterContent,
  showCompany = true,
  showBranding = true,
  hideNav = false,
  activeTabId,
}: SettingsPageProps) {
  const { t } = useTranslation()

  const defaultTabs = useCoreSettingsTabs({ showCompany, showBranding })

  const baseTabs = tabs ?? defaultTabs
  const resolvedTabs = extraTabs ? [...baseTabs, ...extraTabs] : baseTabs

  // Controlled mode: the shell owns the settings nav (contextual sidebar) and
  // passes the active tab parsed from the URL. In that mode the URL — not the
  // internal hashchange state below — is the single source of truth.
  const controlled = activeTabId !== undefined

  // Detect active tab from URL: /settings/financial/... → 'financial'
  function getTabFromHash(): string | null {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) || '/' : '/'
    if (hash.startsWith('/settings/')) {
      const tabId = hash.slice('/settings/'.length).split('/')[0]
      if (resolvedTabs.find((t) => t.id === tabId)) return tabId
    }
    return null
  }

  const [activeTab, setActiveTab] = React.useState<string | null>(() => {
    return getTabFromHash() ?? defaultTab ?? null
  })

  // Sync tab from hash changes
  React.useEffect(() => {
    const handler = () => {
      const tab = getTabFromHash()
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [resolvedTabs])

  // Desktop always shows a selected tab; when none is chosen yet (landing on
  // /settings), default to the first tab — 'general'. Mobile keeps its
  // list-first master/detail behaviour (driven by the raw activeTab below).
  // Controlled mode uses the shell-supplied tab instead of internal state.
  const effectiveTab = controlled ? activeTabId ?? null : activeTab
  const desktopTab = effectiveTab ?? resolvedTabs[0]?.id ?? null
  const activeContent = desktopTab ? resolvedTabs.find((t) => t.id === desktopTab)?.component : null
  const desktopLabel = desktopTab ? resolvedTabs.find((t) => t.id === desktopTab)?.label : null

  // On mobile: show list OR content. On desktop: show both. In controlled mode
  // the shell drawer holds the nav list, so SettingsPage always shows content.
  const showingContent = controlled ? true : activeTab !== null

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId)
    window.location.hash = `/settings/${tabId}`
  }

  const handleBack = () => {
    setActiveTab(null)
    window.location.hash = '/settings'
  }

  const renderNav = (activeId: string | null) => (
    <ul className="space-y-0.5">
      {resolvedTabs.map((tab, i) => (
        <React.Fragment key={tab.id}>
          {tab.isPlugin && (i === 0 || !resolvedTabs[i - 1]?.isPlugin) && (
            <li className="py-2">
              <div className="border-t" />
              <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('common.plugins')}</p>
            </li>
          )}
          <li>
            <button
              onClick={() => handleSelectTab(tab.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeId === tab.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="flex-1 text-left">{tab.label}</span>
              {/* Mobile: show chevron */}
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 md:hidden" />
            </button>
          </li>
        </React.Fragment>
      ))}
    </ul>
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Mobile: back button + tab title when viewing content. Skipped in
          controlled mode — the shell drawer owns the settings list + back. */}
      {!controlled && showingContent && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('settings.title')}
        </button>
      )}

      {/* Header — hidden on mobile when viewing content. With the nav in the
          shell sidebar the page title is the selected section, not "Settings"
          (the shell top bar already says that). */}
      <div className={cn(showingContent && 'hidden md:block')}>
        <h1 className="text-2xl font-bold tracking-tight">
          {hideNav ? desktopLabel ?? t('settings.title') : t('settings.title')}
        </h1>
        {!hideNav && (
          <p className="text-sm text-muted-foreground">
            {t('settings.subtitle')}
          </p>
        )}
      </div>

      {beforeContent}

      {/* Desktop: side-by-side layout, or content-only when the shell owns the nav */}
      <div className="hidden md:flex md:gap-6">
        {!hideNav && <nav className="w-52 shrink-0">{renderNav(desktopTab)}</nav>}
        <div className="min-w-0 flex-1">{activeContent ?? resolvedTabs[0]?.component}</div>
      </div>

      {/* Mobile: list or content, not both */}
      <div className="md:hidden">
        {showingContent ? (
          <div>{activeContent}</div>
        ) : (
          <nav>{renderNav(activeTab)}</nav>
        )}
      </div>

      {afterContent}
    </div>
  )
}
