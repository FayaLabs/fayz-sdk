import React from 'react'
import { useTranslation } from '@fayz-ai/core'
import { useTenantPluginSettings } from '@fayz-ai/saas'

// Per-tenant defaults = the value that used to be the hardcoded `selected` option.
// Persisted + re-hydrated per tenant; behavioural consumption is a follow-up.
const TASKS_DEFAULTS = {
  defaultPriority: 'medium',
}

export function TasksGeneralSettings() {
  const t = useTranslation()
  const s = useTenantPluginSettings('tasks', TASKS_DEFAULTS)

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
          <select
            className="w-full max-w-xs rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm"
            value={s.get('defaultPriority')}
            onChange={(e) => s.set('defaultPriority', e.target.value)}
          >
            <option value="low">{t('tasks.priority.low')}</option>
            <option value="medium">{t('tasks.priority.medium')}</option>
            <option value="high">{t('tasks.priority.high')}</option>
            <option value="urgent">{t('tasks.priority.urgent')}</option>
          </select>
        </div>
      </div>
    </div>
  )
}
