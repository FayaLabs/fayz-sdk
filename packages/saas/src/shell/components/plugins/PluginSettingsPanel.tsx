import React, { useState, useMemo } from 'react'
import { ChevronLeft, Settings, Plug, TableProperties } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { ICON_MAP } from '@fayz-ai/ui'
import type { PluginRegistryDef } from '../../types/plugins'
import type { EntityDef } from '../../types/crud'
import { createCrudStore } from '../../../stores/createCrudStore'
import { resolveDataProvider, useConnectorsForPlugin } from '@fayz-ai/core'
import { CrudPage } from '../../../crud/CrudPage'
import { ConnectorsHub } from './ConnectorsHub'

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
// Properties tab — the plugin's CRUD registries as an inner (pill) tab strip.
// Sub-routes at `${routeBase}/_properties/<registryId>`; also accepts the legacy
// flat `${routeBase}/<registryId>` deep links.
// ---------------------------------------------------------------------------

function PropertiesTab({ registries, routeBase, regLabel }: {
  registries: PluginRegistryDef[]
  routeBase: string
  regLabel: (id: string, fallback: string) => string
}) {
  function getActive(): string {
    const hash = window.location.hash.slice(1)
    const nested = `${routeBase}/_properties/`
    if (hash.startsWith(nested)) {
      const id = hash.slice(nested.length).split('/')[0]
      if (registries.find((r) => r.id === id)) return id
    }
    const flat = `${routeBase}/`
    if (hash.startsWith(flat)) {
      const id = hash.slice(flat.length).split('/')[0]
      if (registries.find((r) => r.id === id)) return id // legacy deep link
    }
    return registries[0]?.id ?? ''
  }

  const [active, setActive] = useState(getActive)
  React.useEffect(() => {
    const handler = () => setActive(getActive())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [routeBase, registries])

  function select(id: string) {
    setActive(id)
    window.location.hash = `${routeBase}/_properties/${id}`
  }

  const activeReg = registries.find((r) => r.id === active) ?? registries[0]

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {registries.map((r) => {
          const Icon = r.icon ? (ICON_MAP[r.icon] ?? null) : null
          const on = r.id === activeReg?.id
          return (
            <button
              key={r.id}
              onClick={() => select(r.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {regLabel(r.id, r.entity.name)}
            </button>
          )
        })}
      </div>
      {activeReg?.description && (
        <p className="text-xs text-muted-foreground">{regLabel(activeReg.id + '.description', activeReg.description)}</p>
      )}
      {activeReg && (
        <RegistryCrudView key={activeReg.id} registry={activeReg} basePath={`${routeBase}/_properties/${activeReg.id}`} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Plugin settings panel
// ---------------------------------------------------------------------------

export function PluginSettingsPanel({ title, subtitle, generalSettings, registries, customTabs, routeBase, hostPluginId, onClose }: {
  title: string
  subtitle?: string
  /** General preferences component */
  generalSettings?: React.ReactNode
  /** CRUD registries — grouped under a "Properties" tab */
  registries?: PluginRegistryDef[]
  /** Additional custom tabs (e.g., Pipeline config for CRM) */
  customTabs?: SettingsPanelTab[]
  /** Hash route base for CRUD sub-routing */
  routeBase: string
  /** This plugin's id — used to surface connectors addons registered for it in an Integrations tab. */
  hostPluginId?: string
  /** Called when back button is clicked. If not provided, back button is hidden. */
  onClose?: () => void
}) {
  const { t } = useTranslation()

  // Connectors that addon plugins registered against this host plugin.
  const connectors = useConnectorsForPlugin(hostPluginId ?? '')

  // Translate registry entity name: try t('registry.{id}'), fallback to raw name
  const regLabel = (id: string, fallback: string) => {
    const key = `registry.${id}`
    const translated = t(key)
    return translated === key ? fallback : translated
  }

  // Standard tab list: General → custom tabs → Integrations → Properties.
  // Standard tabs carry their lucide component directly (IconComp) so they render
  // regardless of ICON_MAP; custom tabs still resolve their string icon via ICON_MAP.
  type Tab = {
    id: string; label: string; type: 'general' | 'custom' | 'integrations' | 'properties'
    icon?: string; IconComp?: React.ComponentType<{ className?: string }>
  }
  const tabs = useMemo<Tab[]>(() => {
    const list: Tab[] = []

    if (generalSettings) {
      list.push({ id: '_general', label: t('settings.general'), IconComp: Settings, type: 'general' })
    }
    if (customTabs) {
      for (const tab of customTabs) {
        list.push({ id: `_custom_${tab.id}`, label: tab.label, icon: tab.icon, type: 'custom' })
      }
    }
    if (connectors.length > 0) {
      list.push({ id: '_integrations', label: t('connectors.title'), IconComp: Plug, type: 'integrations' })
    }
    if (registries && registries.length > 0) {
      list.push({ id: '_properties', label: t('settings.properties'), IconComp: TableProperties, type: 'properties' })
    }

    return list
  }, [generalSettings, customTabs, connectors.length, registries, t])

  // Always use hash routing — the app router now prefix-matches /settings/*
  const useHashRouting = true

  function getActiveFromHash(): string {
    if (!useHashRouting) return tabs[0]?.id ?? ''
    const hash = window.location.hash.slice(1) || '/'
    if (hash.startsWith(routeBase + '/')) {
      const rest = hash.slice(routeBase.length + 1).split('/')[0]
      const match = tabs.find((t) => t.id === rest)
      if (match) return match.id
      // Legacy/nested: a registry id (flat or under _properties) → Properties tab.
      if (registries?.some((r) => r.id === rest) && tabs.some((t) => t.id === '_properties')) return '_properties'
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
          const Icon = tab.IconComp ?? (tab.icon ? (ICON_MAP[tab.icon] ?? null) : null)
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

      {/* Content */}
      {activeTabDef?.type === 'general' && generalSettings && (
        <div>{generalSettings}</div>
      )}

      {activeTabDef?.type === 'custom' && customTabContent && (
        <div>{customTabContent.content}</div>
      )}

      {activeTabDef?.type === 'integrations' && (
        <ConnectorsHub connectors={connectors} />
      )}

      {activeTabDef?.type === 'properties' && registries && registries.length > 0 && (
        <PropertiesTab registries={registries} routeBase={routeBase} regLabel={regLabel} />
      )}
    </div>
  )
}
