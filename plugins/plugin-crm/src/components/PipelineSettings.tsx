import React, { useEffect } from 'react'
import { useCrmStore } from '../CrmContext'
import { SettingsGroup } from '@fayz/saas'
import { useTranslation } from '@fayz/core'

export function PipelineSettings() {
  const t = useTranslation()
  const stages = useCrmStore((s) => s.stages)
  const pipelines = useCrmStore((s) => s.pipelines)
  const fetchPipelines = useCrmStore((s) => s.fetchPipelines)

  useEffect(() => { fetchPipelines() }, [])

  return (
    <div className="space-y-4">
      <SettingsGroup title={t('crm.pipelineSettings.title')} description={t('crm.pipelineSettings.description')}>
        {stages.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : (
          <div className="space-y-0">
            {stages.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-3 py-3">
                <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{stage.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t('crm.pipelineSettings.probability')}: {stage.probability}%
                    {stage.isWon && ` — ${t('crm.pipelineSettings.winStage')}`}
                    {stage.isLost && ` — ${t('crm.pipelineSettings.lossStage')}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{stage.probability}%</span>
              </div>
            ))}
          </div>
        )}
      </SettingsGroup>

      <p className="text-[10px] text-muted-foreground px-1">
        {t('crm.pipelineSettings.customizationNote')}
      </p>
    </div>
  )
}
