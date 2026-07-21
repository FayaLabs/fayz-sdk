import React from 'react'
import { SettingsGroup, ToggleRow, useTenantPluginSettings } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'

// Per-tenant defaults = the values that used to be hardcoded here. Persisted +
// re-hydrated per tenant; behavioural consumption is a follow-up.
const CRM_DEFAULTS = {
  autoAssign: false,
  requireSource: true,
  leadScoring: false,
  duplicateDetection: true,
  autoCreateDeal: true,
  requireCloseDate: false,
  rottingDeals: true,
  weightedPipeline: true,
  autoNumberQuotes: true,
  defaultValidity: true,
  requireApproval: false,
  overdueAlerts: true,
  stageChangeAlerts: false,
  newLeadNotif: true,
}

export function CrmGeneralSettings() {
  const t = useTranslation()
  const s = useTenantPluginSettings('crm', CRM_DEFAULTS)
  return (
    <div className="space-y-4">
      <SettingsGroup title={t('crm.settings.leadManagement')} description={t('crm.settings.leadManagementDesc')}>
        <ToggleRow label={t('crm.settings.autoAssign')} description={t('crm.settings.autoAssignDesc')} checked={s.get('autoAssign')} onChange={(v) => s.set('autoAssign', v)} />
        <ToggleRow label={t('crm.settings.requireSource')} description={t('crm.settings.requireSourceDesc')} checked={s.get('requireSource')} onChange={(v) => s.set('requireSource', v)} />
        <ToggleRow label={t('crm.settings.leadScoring')} description={t('crm.settings.leadScoringDesc')} checked={s.get('leadScoring')} onChange={(v) => s.set('leadScoring', v)} />
        <ToggleRow label={t('crm.settings.duplicateDetection')} description={t('crm.settings.duplicateDetectionDesc')} checked={s.get('duplicateDetection')} onChange={(v) => s.set('duplicateDetection', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('crm.settings.deals')} description={t('crm.settings.dealsDesc')}>
        <ToggleRow label={t('crm.settings.autoCreateDeal')} description={t('crm.settings.autoCreateDealDesc')} checked={s.get('autoCreateDeal')} onChange={(v) => s.set('autoCreateDeal', v)} />
        <ToggleRow label={t('crm.settings.requireCloseDate')} description={t('crm.settings.requireCloseDateDesc')} checked={s.get('requireCloseDate')} onChange={(v) => s.set('requireCloseDate', v)} />
        <ToggleRow label={t('crm.settings.rottingDeals')} description={t('crm.settings.rottingDealsDesc')} checked={s.get('rottingDeals')} onChange={(v) => s.set('rottingDeals', v)} />
        <ToggleRow label={t('crm.settings.weightedPipeline')} description={t('crm.settings.weightedPipelineDesc')} checked={s.get('weightedPipeline')} onChange={(v) => s.set('weightedPipeline', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('crm.settings.quotes')} description={t('crm.settings.quotesDesc')}>
        <ToggleRow label={t('crm.settings.autoNumberQuotes')} description={t('crm.settings.autoNumberQuotesDesc')} checked={s.get('autoNumberQuotes')} onChange={(v) => s.set('autoNumberQuotes', v)} />
        <ToggleRow label={t('crm.settings.defaultValidity')} description={t('crm.settings.defaultValidityDesc')} checked={s.get('defaultValidity')} onChange={(v) => s.set('defaultValidity', v)} />
        <ToggleRow label={t('crm.settings.requireApproval')} description={t('crm.settings.requireApprovalDesc')} checked={s.get('requireApproval')} onChange={(v) => s.set('requireApproval', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('crm.settings.notifications')} description={t('crm.settings.notificationsDesc')}>
        <ToggleRow label={t('crm.settings.overdueAlerts')} description={t('crm.settings.overdueAlertsDesc')} checked={s.get('overdueAlerts')} onChange={(v) => s.set('overdueAlerts', v)} />
        <ToggleRow label={t('crm.settings.stageChangeAlerts')} description={t('crm.settings.stageChangeAlertsDesc')} checked={s.get('stageChangeAlerts')} onChange={(v) => s.set('stageChangeAlerts', v)} />
        <ToggleRow label={t('crm.settings.newLeadNotif')} description={t('crm.settings.newLeadNotifDesc')} checked={s.get('newLeadNotif')} onChange={(v) => s.set('newLeadNotif', v)} />
      </SettingsGroup>
    </div>
  )
}
