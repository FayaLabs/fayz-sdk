import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { PluginRegistryManager } from '@fayz/saas'
import type { PluginRegistryDef } from '@fayz/core'
import { useTranslation } from '@fayz/core'

export function FinancialSettings({ registries, routeBase, onClose }: {
  registries: PluginRegistryDef[]
  routeBase: string
  onClose: () => void
}) {
  const t = useTranslation()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold">{t('financial.settingsPage.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('financial.settingsPage.subtitle')}</p>
        </div>
      </div>

      <PluginRegistryManager registries={registries} routeBase={routeBase} />
    </div>
  )
}
