import React from 'react'
import { SettingsGroup, ToggleRow, SelectRow } from '@fayz/saas'
import { useTranslation } from '@fayz/core'
import { useAgendaSettings } from '../hooks/useAgendaSettings'

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = (5 + i).toString().padStart(2, '0')
  return { value: `${h}:00`, label: `${h}:00` }
})

export function AgendaGeneralSettings() {
  const t = useTranslation()
  const { startTime, endTime, setStartTime, setEndTime } = useAgendaSettings()
  return (
    <div className="space-y-4">
      <SettingsGroup title={t('agenda.settings.scheduling')} description={t('agenda.settings.schedulingDesc')}>
        <ToggleRow label={t('agenda.settings.conflictDetection')} description={t('agenda.settings.conflictDetectionDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.dragDrop')} description={t('agenda.settings.dragDropDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.autoCreateOrder')} description={t('agenda.settings.autoCreateOrderDesc')} checked={true} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.locations')} description={t('agenda.settings.locationsDesc')}>
        <ToggleRow label={t('agenda.settings.enableLocation')} description={t('agenda.settings.enableLocationDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.workingHours')} description={t('agenda.settings.workingHoursDesc')}>
        <ToggleRow label={t('agenda.settings.enableWorkingHours')} description={t('agenda.settings.enableWorkingHoursDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.blockOutside')} description={t('agenda.settings.blockOutsideDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.confirmations')} description={t('agenda.settings.confirmationsDesc')}>
        <ToggleRow label={t('agenda.settings.enableConfirmations')} description={t('agenda.settings.enableConfirmationsDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.autoConfirm')} description={t('agenda.settings.autoConfirmDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.reminder')} description={t('agenda.settings.reminderDesc')} checked={true} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.calendarDisplay')} description={t('agenda.settings.calendarDisplayDesc')}>
        <SelectRow
          label={t('agenda.settings.dayStartTime')}
          description={t('agenda.settings.dayStartTimeDesc')}
          value={startTime}
          options={HOUR_OPTIONS}
          onChange={setStartTime}
        />
        <SelectRow
          label={t('agenda.settings.dayEndTime')}
          description={t('agenda.settings.dayEndTimeDesc')}
          value={endTime}
          options={HOUR_OPTIONS}
          onChange={setEndTime}
        />
        <ToggleRow label={t('agenda.settings.showCancelled')} description={t('agenda.settings.showCancelledDesc')} checked={false} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.showNoShow')} description={t('agenda.settings.showNoShowDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.compact')} description={t('agenda.settings.compactDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.notifications')} description={t('agenda.settings.notificationsDesc')}>
        <ToggleRow label={t('agenda.settings.newBookingNotif')} description={t('agenda.settings.newBookingNotifDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.cancelAlerts')} description={t('agenda.settings.cancelAlertsDesc')} checked={true} onChange={() => {}} />
        <ToggleRow label={t('agenda.settings.noShowTracking')} description={t('agenda.settings.noShowTrackingDesc')} checked={false} onChange={() => {}} />
      </SettingsGroup>
    </div>
  )
}
