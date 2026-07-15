import React from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { LayoutTemplate, PanelTop, Settings2, Smartphone, Palette } from 'lucide-react'
import { useTranslation } from '@fayz-ai/core'
import { ModulePage } from '@fayz-ai/ui'
import { AdminContextProvider, type ResolvedAdminConfig } from './AdminContext'
import type { AdminDataProvider } from './data/types'
import type { AdminUIState } from './store'

const LAYOUT_VARIANTS = ['sidebar', 'topbar', 'minimal'] as const

function SettingCard({ icon: Icon, title, children }: {
  icon: typeof LayoutTemplate
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-lg bg-foreground/[0.04] flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">{title}</div>
      </div>
      {children}
    </div>
  )
}

/**
 * Read-only foundation view. Renders the shell config this app already
 * resolved (layout, module nav, mobile header, branding) so an operator can
 * see it at a glance — it does not yet let them change it. See README.md for
 * the write-path this is scaffolding toward.
 */
export function AdminPage({ config, provider, store }: {
  config: ResolvedAdminConfig
  provider: AdminDataProvider
  store: StoreApi<AdminUIState>
}) {
  const t = useTranslation()

  return (
    <AdminContextProvider config={config} provider={provider} store={store}>
      <ModulePage title={config.labels.pageTitle} subtitle={config.labels.pageSubtitle} nav={[]}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingCard icon={config.layout === 'topbar' ? PanelTop : LayoutTemplate} title={t('admin.layout.title')}>
            <div className="flex flex-wrap gap-2 text-sm">
              {LAYOUT_VARIANTS.map((variant) => (
                <span
                  key={variant}
                  className={
                    'rounded-md border px-2.5 py-1.5 ' +
                    (config.layout === variant
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground')
                  }
                >
                  {t(`admin.layout.${variant}`)}
                </span>
              ))}
            </div>
          </SettingCard>

          <SettingCard icon={Settings2} title={t('admin.moduleNav.title')}>
            <p className="text-xs text-muted-foreground">{t(`admin.moduleNav.${config.moduleNav}`)}</p>
          </SettingCard>

          <SettingCard icon={Smartphone} title={t('admin.mobileHeader.title')}>
            <p className="text-xs text-muted-foreground">{t(`admin.mobileHeader.${config.mobileHeader}`)}</p>
          </SettingCard>

          <SettingCard icon={Palette} title={t('admin.branding.title')}>
            <p className="text-xs text-muted-foreground">
              {config.branding ? t('admin.branding.on') : t('admin.branding.off')}
            </p>
          </SettingCard>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">{t('admin.readOnlyNotice')}</p>
      </ModulePage>
    </AdminContextProvider>
  )
}
