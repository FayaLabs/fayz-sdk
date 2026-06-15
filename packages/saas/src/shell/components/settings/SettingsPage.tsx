import * as React from 'react'
import { Building2, User, Shield, Palette, ArrowLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { ConnectedCompanySettings } from './ConnectedCompanySettings'
import { ConnectedUserProfile } from './ConnectedUserProfile'
import { ConnectedSecuritySettings } from './ConnectedSecuritySettings'
import { ConnectedBrandingSettings } from './ConnectedBrandingSettings'

interface SettingsTab {
  id: string
  label: string
  icon?: React.ReactNode
  component: React.ReactNode
}

interface SettingsPageProps {
  tabs?: SettingsTab[]
  extraTabs?: SettingsTab[]
  defaultTab?: string
  className?: string
  beforeContent?: React.ReactNode
  afterContent?: React.ReactNode
}

export function SettingsPage({
  tabs,
  extraTabs,
  defaultTab,
  className,
  beforeContent,
  afterContent,
}: SettingsPageProps) {
  const { t } = useTranslation()

  const defaultTabs: SettingsTab[] = React.useMemo(() => [
    { id: 'general', label: t('settings.general'), icon: <Building2 className="h-4 w-4" />, component: <ConnectedCompanySettings /> },
    { id: 'profile', label: t('settings.profile'), icon: <User className="h-4 w-4" />, component: <ConnectedUserProfile /> },
    { id: 'security', label: t('settings.security'), icon: <Shield className="h-4 w-4" />, component: <ConnectedSecuritySettings /> },
    { id: 'branding', label: t('settings.branding'), icon: <Palette className="h-4 w-4" />, component: <ConnectedBrandingSettings /> },
  ], [t])

  const baseTabs = tabs ?? defaultTabs
  const resolvedTabs = extraTabs ? [...baseTabs, ...extraTabs] : baseTabs

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

  const activeContent = activeTab ? resolvedTabs.find((t) => t.id === activeTab)?.component : null
  const activeLabel = activeTab ? resolvedTabs.find((t) => t.id === activeTab)?.label : null

  // On mobile: show list OR content. On desktop: show both.
  const showingContent = activeTab !== null

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId)
    window.location.hash = `/settings/${tabId}`
  }

  const handleBack = () => {
    setActiveTab(null)
    window.location.hash = '/settings'
  }

  const renderNav = () => (
    <ul className="space-y-0.5">
      {resolvedTabs.map((tab, i) => (
        <React.Fragment key={tab.id}>
          {(tab as any).isPlugin && (i === 0 || !(resolvedTabs[i - 1] as any)?.isPlugin) && (
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
                activeTab === tab.id
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
      {/* Mobile: back button + tab title when viewing content */}
      {showingContent && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('settings.title')}
        </button>
      )}

      {/* Header — hidden on mobile when viewing content */}
      <div className={cn(showingContent && 'hidden md:block')}>
        <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      {beforeContent}

      {/* Desktop: side-by-side layout */}
      <div className="hidden md:flex md:gap-6">
        <nav className="w-52 shrink-0">{renderNav()}</nav>
        <div className="min-w-0 flex-1">{activeContent ?? resolvedTabs[0]?.component}</div>
      </div>

      {/* Mobile: list or content, not both */}
      <div className="md:hidden">
        {showingContent ? (
          <div>{activeContent}</div>
        ) : (
          <nav>{renderNav()}</nav>
        )}
      </div>

      {afterContent}
    </div>
  )
}
