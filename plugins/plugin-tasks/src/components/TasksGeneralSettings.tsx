import React from 'react'
import { useTranslation } from '@fayz-ai/core'

export function TasksGeneralSettings() {
  const t = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">{t('tasks.settings.general')}</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {t('tasks.drawer.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('tasks.settings.defaultPriority')}</label>
          <select className="w-full max-w-xs rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm">
            <option value="low">{t('tasks.priority.low')}</option>
            <option value="medium" selected>{t('tasks.priority.medium')}</option>
            <option value="high">{t('tasks.priority.high')}</option>
            <option value="urgent">{t('tasks.priority.urgent')}</option>
          </select>
        </div>
      </div>
    </div>
  )
}
