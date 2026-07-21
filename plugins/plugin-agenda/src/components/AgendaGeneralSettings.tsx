import React from 'react'
import { SettingsGroup, ToggleRow, SelectRow, useTenantPluginSettings } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'
import { useAgendaSettings } from '../hooks/useAgendaSettings'

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = (5 + i).toString().padStart(2, '0')
  return { value: `${h}:00`, label: `${h}:00` }
})

// Per-tenant toggle defaults = the values that used to be hardcoded here.
// NOTE: these are persisted + re-hydrated per tenant; actually consuming them to
// change agenda behaviour is a follow-up (see useTenantPluginSettings docs).
const AGENDA_TOGGLE_DEFAULTS = {
  conflictDetection: true,
  dragDrop: true,
  autoCreateOrder: true,
  enableLocation: false,
  enableWorkingHours: true,
  blockOutside: false,
  enableConfirmations: true,
  autoConfirm: false,
  reminder: true,
  showCancelled: false,
  showNoShow: true,
  compact: false,
  newBookingNotif: true,
  cancelAlerts: true,
  noShowTracking: false,
}

export function AgendaGeneralSettings() {
  const t = useTranslation()
  const { startTime, endTime, setStartTime, setEndTime } = useAgendaSettings()
  const s = useTenantPluginSettings('agenda', AGENDA_TOGGLE_DEFAULTS)
  return (
    <div className="space-y-4">
      <SettingsGroup title={t('agenda.settings.scheduling')} description={t('agenda.settings.schedulingDesc')}>
        <ToggleRow label={t('agenda.settings.conflictDetection')} description={t('agenda.settings.conflictDetectionDesc')} checked={s.get('conflictDetection')} onChange={(v) => s.set('conflictDetection', v)} />
        <ToggleRow label={t('agenda.settings.dragDrop')} description={t('agenda.settings.dragDropDesc')} checked={s.get('dragDrop')} onChange={(v) => s.set('dragDrop', v)} />
        <ToggleRow label={t('agenda.settings.autoCreateOrder')} description={t('agenda.settings.autoCreateOrderDesc')} checked={s.get('autoCreateOrder')} onChange={(v) => s.set('autoCreateOrder', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.locations')} description={t('agenda.settings.locationsDesc')}>
        <ToggleRow label={t('agenda.settings.enableLocation')} description={t('agenda.settings.enableLocationDesc')} checked={s.get('enableLocation')} onChange={(v) => s.set('enableLocation', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.workingHours')} description={t('agenda.settings.workingHoursDesc')}>
        <ToggleRow label={t('agenda.settings.enableWorkingHours')} description={t('agenda.settings.enableWorkingHoursDesc')} checked={s.get('enableWorkingHours')} onChange={(v) => s.set('enableWorkingHours', v)} />
        <ToggleRow label={t('agenda.settings.blockOutside')} description={t('agenda.settings.blockOutsideDesc')} checked={s.get('blockOutside')} onChange={(v) => s.set('blockOutside', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.confirmations')} description={t('agenda.settings.confirmationsDesc')}>
        <ToggleRow label={t('agenda.settings.enableConfirmations')} description={t('agenda.settings.enableConfirmationsDesc')} checked={s.get('enableConfirmations')} onChange={(v) => s.set('enableConfirmations', v)} />
        <ToggleRow label={t('agenda.settings.autoConfirm')} description={t('agenda.settings.autoConfirmDesc')} checked={s.get('autoConfirm')} onChange={(v) => s.set('autoConfirm', v)} />
        <ToggleRow label={t('agenda.settings.reminder')} description={t('agenda.settings.reminderDesc')} checked={s.get('reminder')} onChange={(v) => s.set('reminder', v)} />
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
        <ToggleRow label={t('agenda.settings.showCancelled')} description={t('agenda.settings.showCancelledDesc')} checked={s.get('showCancelled')} onChange={(v) => s.set('showCancelled', v)} />
        <ToggleRow label={t('agenda.settings.showNoShow')} description={t('agenda.settings.showNoShowDesc')} checked={s.get('showNoShow')} onChange={(v) => s.set('showNoShow', v)} />
        <ToggleRow label={t('agenda.settings.compact')} description={t('agenda.settings.compactDesc')} checked={s.get('compact')} onChange={(v) => s.set('compact', v)} />
      </SettingsGroup>

      <SettingsGroup title={t('agenda.settings.notifications')} description={t('agenda.settings.notificationsDesc')}>
        <ToggleRow label={t('agenda.settings.newBookingNotif')} description={t('agenda.settings.newBookingNotifDesc')} checked={s.get('newBookingNotif')} onChange={(v) => s.set('newBookingNotif', v)} />
        <ToggleRow label={t('agenda.settings.cancelAlerts')} description={t('agenda.settings.cancelAlertsDesc')} checked={s.get('cancelAlerts')} onChange={(v) => s.set('cancelAlerts', v)} />
        <ToggleRow label={t('agenda.settings.noShowTracking')} description={t('agenda.settings.noShowTrackingDesc')} checked={s.get('noShowTracking')} onChange={(v) => s.set('noShowTracking', v)} />
      </SettingsGroup>
    </div>
  )
}
