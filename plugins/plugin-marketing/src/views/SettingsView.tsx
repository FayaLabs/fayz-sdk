import React from 'react'
import { useTranslation } from '@fayz-ai/core'
import { SettingsGroup, ToggleRow, SelectRow } from '@fayz-ai/saas'
import { useMarketingConfig } from '../MarketingContext'

const SOURCE_OPTIONS = [
  { value: 'crm', label: 'CRM' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'orders', label: 'Orders' },
  { value: 'custom', label: 'Custom' },
]

export function SettingsView() {
  const t = useTranslation()
  const { conversion, channels } = useMarketingConfig()

  // Local UI state — mock toggles (no backend yet), mirrors other plugins' settings.
  const [source, setSource] = React.useState(conversion.source)
  const [trackValue, setTrackValue] = React.useState(true)
  const [autoSync, setAutoSync] = React.useState(true)
  const [assisted, setAssisted] = React.useState(false)
  const [tracked, setTracked] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries(channels.map((c) => [c.id, true])),
  )

  return (
    <div className="space-y-4">
      <SettingsGroup title={t('marketing.settings.conversionModel')} description={t('marketing.settings.conversionModelDesc')}>
        <SelectRow
          label={t('marketing.settings.attributedFrom')}
          description={conversion.label}
          value={source}
          options={SOURCE_OPTIONS}
          onChange={(v) => setSource(v as typeof source)}
        />
        <ToggleRow
          label={t('marketing.settings.trackValue')}
          description={t('marketing.settings.trackValueDesc')}
          checked={trackValue}
          onChange={setTrackValue}
        />
      </SettingsGroup>

      <SettingsGroup title={t('marketing.settings.channels')} description={t('marketing.settings.channelsDesc')}>
        {channels.map((c) => (
          <ToggleRow
            key={c.id}
            label={c.label}
            description={t('marketing.settings.channelTrackDesc')}
            checked={tracked[c.id] ?? true}
            onChange={(v) => setTracked((prev) => ({ ...prev, [c.id]: v }))}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title={t('marketing.settings.attribution')} description={t('marketing.settings.attributionDesc')}>
        <ToggleRow
          label={t('marketing.settings.autoSync')}
          description={t('marketing.settings.autoSyncDesc')}
          checked={autoSync}
          onChange={setAutoSync}
        />
        <ToggleRow
          label={t('marketing.settings.assisted')}
          description={t('marketing.settings.assistedDesc')}
          checked={assisted}
          onChange={setAssisted}
        />
      </SettingsGroup>
    </div>
  )
}
