import React from 'react'
import { SettingsGroup, ToggleRow } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'

export function CrmGeneralSettings() {
  const t = useTranslation()
  return (
    <div className="space-y-4">
      <SettingsGroup title={t('crm.settings.leadManagement')} description={t('crm.settings.leadManagementDesc')}>
        <ToggleRow label={t('crm.settings.autoAssign')} description={t('crm.settings.autoAssignDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.requireSource')} description={t('crm.settings.requireSourceDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.leadScoring')} description={t('crm.settings.leadScoringDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.duplicateDetection')} description={t('crm.settings.duplicateDetectionDesc')} checked={true} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('crm.settings.deals')} description={t('crm.settings.dealsDesc')}>
        <ToggleRow label={t('crm.settings.autoCreateDeal')} description={t('crm.settings.autoCreateDealDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.requireCloseDate')} description={t('crm.settings.requireCloseDateDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.rottingDeals')} description={t('crm.settings.rottingDealsDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.weightedPipeline')} description={t('crm.settings.weightedPipelineDesc')} checked={true} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('crm.settings.quotes')} description={t('crm.settings.quotesDesc')}>
        <ToggleRow label={t('crm.settings.autoNumberQuotes')} description={t('crm.settings.autoNumberQuotesDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.defaultValidity')} description={t('crm.settings.defaultValidityDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.requireApproval')} description={t('crm.settings.requireApprovalDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('crm.settings.notifications')} description={t('crm.settings.notificationsDesc')}>
        <ToggleRow label={t('crm.settings.overdueAlerts')} description={t('crm.settings.overdueAlertsDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.stageChangeAlerts')} description={t('crm.settings.stageChangeAlertsDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('crm.settings.newLeadNotif')} description={t('crm.settings.newLeadNotifDesc')} checked={true} onChange={() => {}} />
      </SettingsGroup>
    </div>
  )
}
