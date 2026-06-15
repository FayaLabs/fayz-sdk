import React, { useState, useMemo } from 'react'
import { ChevronLeft, Settings } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { ICON_MAP } from '@fayz-ai/ui'
import type { PluginRegistryDef } from '../../types/plugins'
import type { EntityDef } from '../../types/crud'
import { createCrudStore } from '../../../stores/createCrudStore'
import { resolveDataProvider } from '@fayz-ai/core'
import { CrudPage } from '../../../crud/CrudPage'

// ---------------------------------------------------------------------------
// Settings tab definition — General, custom tabs, and registry tabs all unified
// ---------------------------------------------------------------------------

export interface SettingsPanelTab {
  id: string
  label: string
  icon?: string
  content: React.ReactNode
}

// ---------------------------------------------------------------------------
// Internal: CRUD view for a registry
// ---------------------------------------------------------------------------

function RegistryCrudView({ registry, basePath }: { registry: PluginRegistryDef; basePath: string }) {
  const useStore = useMemo(() => {
    const mockData = (registry.mockData ?? registry.seedData ?? []) as any[]
    const provider = resolveDataProvider(registry.entity as EntityDef<any>, mockData)
    return createCrudStore(provider)
  }, [registry.id])

  return (
    <CrudPage
      entityDef={registry.entity as EntityDef<any>}
      useStore={useStore as any}
      basePath={basePath}
      display={registry.display === 'cards' ? 'cards' : 'table'}
      readOnly={registry.readOnly}
    />
  )
}

// ---------------------------------------------------------------------------
// Plugin settings panel
// ---------------------------------------------------------------------------

export function PluginSettingsPanel({ title, subtitle, generalSettings, registries, customTabs, routeBase, onClose }: {
  title: string
  subtitle?: string
  /** General preferences component */
  generalSettings?: React.ReactNode
  /** CRUD registries — each becomes its own tab */
  registries?: PluginRegistryDef[]
  /** Additional custom tabs (e.g., Pipeline config for CRM) */
  customTabs?: SettingsPanelTab[]
  /** Hash route base for CRUD sub-routing */
  routeBase: string
  /** Called when back button is clicked. If not provided, back button is hidden. */
  onClose?: () => void
}) {
  const { t } = useTranslation()

  // Translate registry entity name: try t('registry.{id}'), fallback to raw name
  const regLabel = (id: string, fallback: string) => {
    const key = `registry.${id}`
    const translated = t(key)
    return translated === key ? fallback : translated
  }

  // Build unified tab list: General → custom tabs → registry tabs
  const tabs = useMemo(() => {
    const list: { id: string; label: string; icon?: string; type: 'general' | 'custom' | 'registry'; registryDef?: PluginRegistryDef }[] = []

    if (generalSettings) {
      list.push({ id: '_general', label: t('settings.general'), icon: 'Settings', type: 'general' })
    }

    if (customTabs) {
      for (const tab of customTabs) {
        list.push({ id: `_custom_${tab.id}`, label: tab.label, icon: tab.icon, type: 'custom' })
      }
    }

    if (registries) {
      for (const reg of registries) {
        list.push({ id: reg.id, label: regLabel(reg.id, reg.entity.name), icon: reg.icon, type: 'registry', registryDef: reg })
      }
    }

    return list
  }, [generalSettings, customTabs, registries, t])

  // Always use hash routing — the app router now prefix-matches /settings/*
  const useHashRouting = true

  function getActiveFromHash(): string {
    if (!useHashRouting) return tabs[0]?.id ?? ''
    const hash = window.location.hash.slice(1) || '/'
    if (hash.startsWith(routeBase + '/')) {
      const rest = hash.slice(routeBase.length + 1).split('/')[0]
      const match = tabs.find((t) => t.id === rest)
      if (match) return match.id
    }
    return tabs[0]?.id ?? ''
  }

  const [activeTab, setActiveTab] = useState(getActiveFromHash)

  React.useEffect(() => {
    if (!useHashRouting) return
    const handler = () => setActiveTab(getActiveFromHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [routeBase, tabs, useHashRouting])

  function switchTab(tabId: string) {
    setActiveTab(tabId)
    if (useHashRouting) {
      window.location.hash = `${routeBase}/${tabId}`
    }
  }

  const activeTabDef = tabs.find((t) => t.id === activeTab) ?? tabs[0]
  const customTabContent = customTabs?.find((t) => `_custom_${t.id}` === activeTab)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onClose && (
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {/* Unified tabs — underline style */}
      <div className="flex gap-0.5 overflow-x-auto border-b scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon ? (ICON_MAP[tab.icon] ?? null) : null
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors shrink-0 border-b-2 -mb-px',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted',
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Description for registry tabs */}
      {activeTabDef?.type === 'registry' && activeTabDef.registryDef?.description && (
        <p className="text-xs text-muted-foreground">{regLabel(activeTabDef.id + '.description', activeTabDef.registryDef.description)}</p>
      )}

      {/* Content */}
      {activeTabDef?.type === 'general' && generalSettings && (
        <div>{generalSettings}</div>
      )}

      {activeTabDef?.type === 'custom' && customTabContent && (
        <div>{customTabContent.content}</div>
      )}

      {activeTabDef?.type === 'registry' && activeTabDef.registryDef && (
        <RegistryCrudView
          key={activeTabDef.id}
          registry={activeTabDef.registryDef}
          basePath={`${routeBase}/${activeTabDef.id}`}
        />
      )}
    </div>
  )
}
