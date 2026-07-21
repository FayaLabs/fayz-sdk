import React from 'react'
import { SettingsGroup, ToggleRow, useTenantPluginSettings } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'

// Per-tenant defaults = the values that used to be hardcoded here. Persisted +
// re-hydrated per tenant; behavioural consumption is a follow-up.
const FINANCIAL_DEFAULTS = {
  autoInstallments: true,
  requireDoc: false,
  allowPartial: true,
  requireOpening: true,
  autoClose: false,
  overdueAlerts: true,
  dailySummary: false,
}

export function FinancialGeneralSettings() {
  const t = useTranslation()
  const s = useTenantPluginSettings('financial', FINANCIAL_DEFAULTS)
  return (
    <div className="space-y-4">
      <SettingsGroup title={t('financial.settings.invoices')} description={t('financial.settings.invoicesDesc')}>
        <ToggleRow label={t('financial.settings.autoInstallments')} description={t('financial.settings.autoInstallmentsDesc')} checked={s.get('autoInstallments')} onChange={(v) => s.set('autoInstallments', v)} />
        <ToggleRow label={t('financial.settings.requireDoc')} description={t('financial.settings.requireDocDesc')} checked={s.get('requireDoc')} onChange={(v) => s.set('requireDoc', v)} />
        <ToggleRow label={t('financial.settings.allowPartial')} description={t('financial.settings.allowPartialDesc')} checked={s.get('allowPartial')} onChange={(v) => s.set('allowPartial', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('financial.settings.cashRegister')} description={t('financial.settings.cashRegisterDesc')}>
        <ToggleRow label={t('financial.settings.requireOpening')} description={t('financial.settings.requireOpeningDesc')} checked={s.get('requireOpening')} onChange={(v) => s.set('requireOpening', v)} />
        <ToggleRow label={t('financial.settings.autoClose')} description={t('financial.settings.autoCloseDesc')} checked={s.get('autoClose')} onChange={(v) => s.set('autoClose', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('financial.settings.notifications')} description={t('financial.settings.notificationsDesc')}>
        <ToggleRow label={t('financial.settings.overdueAlerts')} description={t('financial.settings.overdueAlertsDesc')} checked={s.get('overdueAlerts')} onChange={(v) => s.set('overdueAlerts', v)} />
        <ToggleRow label={t('financial.settings.dailySummary')} description={t('financial.settings.dailySummaryDesc')} checked={s.get('dailySummary')} onChange={(v) => s.set('dailySummary', v)} />
      </SettingsGroup>
    </div>
  )
}
