import React from 'react'
import { useFinancialConfig } from '../FinancialContext'
import { SubpageHeader } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'

export function CommissionsView() {
  const t = useTranslation()
  const { labels } = useFinancialConfig()

  return (
    <div className="space-y-4">
      <SubpageHeader title={labels.commissions} subtitle={t('financial.commissions.subtitle')} />
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted p-12">
        <p className="text-sm text-muted-foreground">{t('financial.commissions.comingSoon')}</p>
      </div>
    </div>
  )
}
