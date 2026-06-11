import React, { useState, useMemo } from 'react'
import type { PluginRegistryDef } from '@fayz/core'
import type { EntityDef } from '@fayz/core'
import { createCrudStore } from '../stores/createCrudStore'
import { createMockProvider } from '@fayz/core'
import { CrudPage } from '../crud/CrudPage'
import { cn } from '@fayz/ui'
import { ICON_MAP } from '@fayz/ui'

/**
 * Internal CRUD view for a single registry.
 * Manages its own store and uses a hash-based basePath for proper CRUD routing.
 */
function RegistryCrudView({ registry, basePath }: { registry: PluginRegistryDef; basePath: string }) {
  const useStore = useMemo(() => {
    const data = (registry.mockData ?? registry.seedData ?? []) as any[]
    const provider = createMockProvider(registry.entity as EntityDef<any>, data)
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

/**
 * Reusable tabbed CRUD manager for plugin registries.
 * @param routeBase — hash route prefix for CRUD sub-routing (e.g. '/financial/settings')
 */
export function PluginRegistryManager({ registries, routeBase, className }: {
  registries: PluginRegistryDef[]
  /** Base route for CRUD navigation (e.g. '/financial/settings'). Each registry gets routeBase/registryId */
  routeBase?: string
  className?: string
}) {
  // Derive active tab from hash if routeBase provided, otherwise use state
  const getTabFromHash = () => {
    if (!routeBase) return registries[0]?.id ?? ''
    const hash = window.location.hash.slice(1) || '/'
    if (hash.startsWith(routeBase + '/')) {
      const rest = hash.slice(routeBase.length + 1)
      const tabId = rest.split('/')[0]
      if (registries.find((r) => r.id === tabId)) return tabId
    }
    return registries[0]?.id ?? ''
  }

  const [activeTab, setActiveTab] = useState(getTabFromHash)

  // Sync tab from hash changes
  React.useEffect(() => {
    if (!routeBase) return
    const handler = () => setActiveTab(getTabFromHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [routeBase])

  function switchTab(tabId: string) {
    setActiveTab(tabId)
    if (routeBase) {
      window.location.hash = `${routeBase}/${tabId}`
    }
  }

  if (registries.length === 0) return null

  const activeRegistry = registries.find((r) => r.id === activeTab) ?? registries[0]
  const crudBasePath = routeBase ? `${routeBase}/${activeRegistry.id}` : `/__registry/${activeRegistry.id}`

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {registries.map((reg) => {
          const Icon = reg.icon ? (ICON_MAP[reg.icon] ?? null) : null
          const active = reg.id === activeTab
          return (
            <button
              key={reg.id}
              onClick={() => switchTab(reg.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {reg.entity.name}
            </button>
          )
        })}
      </div>

      {/* Description */}
      {activeRegistry?.description && (
        <p className="text-xs text-muted-foreground">{activeRegistry.description}</p>
      )}

      {/* CRUD content — keyed so it remounts when switching tabs */}
      {activeRegistry && <RegistryCrudView key={activeRegistry.id} registry={activeRegistry} basePath={crudBasePath} />}
    </div>
  )
}
