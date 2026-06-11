import React from 'react'
import { SettingsGroup, ToggleRow } from '@fayz/saas'
import { useTranslation } from '@fayz/core'

export function InventoryGeneralSettings() {
  const t = useTranslation()
  return (
    <div className="space-y-4">
      <SettingsGroup title={t('inventory.settings.stockManagement')} description={t('inventory.settings.stockManagementDesc')}>
        <ToggleRow label={t('inventory.settings.lowStockAlerts')} description={t('inventory.settings.lowStockAlertsDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('inventory.settings.requireReason')} description={t('inventory.settings.requireReasonDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('inventory.settings.autoDeduct')} description={t('inventory.settings.autoDeductDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('inventory.settings.products')} description={t('inventory.settings.productsDesc')}>
        <ToggleRow label={t('inventory.settings.requireSku')} description={t('inventory.settings.requireSkuDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('inventory.settings.allowNegative')} description={t('inventory.settings.allowNegativeDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('inventory.settings.notifications')} description={t('inventory.settings.notificationsDesc')}>
        <ToggleRow label={t('inventory.settings.lowStockEmail')} description={t('inventory.settings.lowStockEmailDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('inventory.settings.expiryWarnings')} description={t('inventory.settings.expiryWarningsDesc')} checked={true} onChange={() => {}} />
      </SettingsGroup>
    </div>
  )
}
