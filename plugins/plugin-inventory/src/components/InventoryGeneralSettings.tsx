import React from 'react'
import { SettingsGroup, ToggleRow, useTenantPluginSettings } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'

// Per-tenant defaults = the values that used to be hardcoded here. Persisted +
// re-hydrated per tenant; behavioural consumption is a follow-up.
const INVENTORY_DEFAULTS = {
  lowStockAlerts: true,
  requireReason: true,
  autoDeduct: false,
  requireSku: false,
  allowNegative: false,
  lowStockEmail: false,
  expiryWarnings: true,
}

export function InventoryGeneralSettings() {
  const t = useTranslation()
  const s = useTenantPluginSettings('inventory', INVENTORY_DEFAULTS)
  return (
    <div className="space-y-4">
      <SettingsGroup title={t('inventory.settings.stockManagement')} description={t('inventory.settings.stockManagementDesc')}>
        <ToggleRow label={t('inventory.settings.lowStockAlerts')} description={t('inventory.settings.lowStockAlertsDesc')} checked={s.get('lowStockAlerts')} onChange={(v) => s.set('lowStockAlerts', v)} />
        <ToggleRow label={t('inventory.settings.requireReason')} description={t('inventory.settings.requireReasonDesc')} checked={s.get('requireReason')} onChange={(v) => s.set('requireReason', v)} />
        <ToggleRow label={t('inventory.settings.autoDeduct')} description={t('inventory.settings.autoDeductDesc')} checked={s.get('autoDeduct')} onChange={(v) => s.set('autoDeduct', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('inventory.settings.products')} description={t('inventory.settings.productsDesc')}>
        <ToggleRow label={t('inventory.settings.requireSku')} description={t('inventory.settings.requireSkuDesc')} checked={s.get('requireSku')} onChange={(v) => s.set('requireSku', v)} />
        <ToggleRow label={t('inventory.settings.allowNegative')} description={t('inventory.settings.allowNegativeDesc')} checked={s.get('allowNegative')} onChange={(v) => s.set('allowNegative', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('inventory.settings.notifications')} description={t('inventory.settings.notificationsDesc')}>
        <ToggleRow label={t('inventory.settings.lowStockEmail')} description={t('inventory.settings.lowStockEmailDesc')} checked={s.get('lowStockEmail')} onChange={(v) => s.set('lowStockEmail', v)} />
        <ToggleRow label={t('inventory.settings.expiryWarnings')} description={t('inventory.settings.expiryWarningsDesc')} checked={s.get('expiryWarnings')} onChange={(v) => s.set('expiryWarnings', v)} />
      </SettingsGroup>
    </div>
  )
}
