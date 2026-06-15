import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { PluginRegistryManager } from '@fayz-ai/saas'
import type { PluginRegistryDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'

export function InventorySettings({ registries, routeBase, onClose }: {
  registries: PluginRegistryDef[]
  routeBase: string
  onClose: () => void
}) {
  const t = useTranslation()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold">{t('inventory.settingsPage.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('inventory.settingsPage.subtitle')}</p>
        </div>
      </div>
      <PluginRegistryManager registries={registries} routeBase={routeBase} />
    </div>
  )
}
