import React from 'react'
import { SettingsGroup, ToggleRow } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'

export function FinancialGeneralSettings() {
  const t = useTranslation()
  return (
    <div className="space-y-4">
      <SettingsGroup title={t('financial.settings.invoices')} description={t('financial.settings.invoicesDesc')}>
        <ToggleRow label={t('financial.settings.autoInstallments')} description={t('financial.settings.autoInstallmentsDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('financial.settings.requireDoc')} description={t('financial.settings.requireDocDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('financial.settings.allowPartial')} description={t('financial.settings.allowPartialDesc')} checked={true} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('financial.settings.cashRegister')} description={t('financial.settings.cashRegisterDesc')}>
        <ToggleRow label={t('financial.settings.requireOpening')} description={t('financial.settings.requireOpeningDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('financial.settings.autoClose')} description={t('financial.settings.autoCloseDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('financial.settings.notifications')} description={t('financial.settings.notificationsDesc')}>
        <ToggleRow label={t('financial.settings.overdueAlerts')} description={t('financial.settings.overdueAlertsDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('financial.settings.dailySummary')} description={t('financial.settings.dailySummaryDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>
    </div>
  )
}
