import * as React from 'react'
import { useTranslation } from '@fayz-ai/core'
import { PluginSettingsPanel, SettingsGroup, SelectRow, ToggleRow } from '@fayz-ai/saas'

// The course plugin's Settings tab. Reuses the saas settings shell
// (PluginSettingsPanel + SettingsGroup/SelectRow/ToggleRow) instead of
// hand-rolling a settings layout — same chrome as every other plugin. Stripe
// Connect lives in the "Integrations" tab (a connector), not here.

function CoursesGeneralSettings() {
  const t = useTranslation()
  const [currency, setCurrency] = React.useState('BRL')
  const [methods, setMethods] = React.useState({ card: true, pix: true, boleto: true })

  return (
    <div className="space-y-6">
      <SettingsGroup
        title={t('courses.settings.payments') || 'Payments'}
        description={t('courses.settings.paymentsHelp') || 'Connect Stripe in the Integrations tab; the platform fee applies automatically.'}
      >
        <SelectRow
          label={t('courses.settings.currency') || 'Default currency'}
          value={currency}
          onChange={setCurrency}
          options={[
            { value: 'BRL', label: 'BRL (R$)' },
            { value: 'USD', label: 'USD ($)' },
            { value: 'EUR', label: 'EUR (€)' },
          ]}
        />
      </SettingsGroup>

      <SettingsGroup title={t('courses.settings.methods') || 'Payment methods'}>
        <ToggleRow label={t('courses.editor.payCard') || 'Credit card'} checked={methods.card} onChange={(v) => setMethods((m) => ({ ...m, card: v }))} />
        <ToggleRow label={t('courses.editor.payPix') || 'Pix'} checked={methods.pix} onChange={(v) => setMethods((m) => ({ ...m, pix: v }))} />
        <ToggleRow label={t('courses.editor.payBoleto') || 'Boleto'} checked={methods.boleto} onChange={(v) => setMethods((m) => ({ ...m, boleto: v }))} />
      </SettingsGroup>
    </div>
  )
}
CoursesGeneralSettings.displayName = 'CoursesGeneralSettings'

export function CoursesSettingsTab() {
  const t = useTranslation()
  return (
    <PluginSettingsPanel
      title={t('courses.settings.title') || 'Course settings'}
      subtitle={t('courses.settings.subtitle') || 'Payments, currency and checkout methods'}
      generalSettings={<CoursesGeneralSettings />}
      hostPluginId="courses"
      routeBase="/settings/courses"
    />
  )
}
CoursesSettingsTab.displayName = 'CoursesSettingsTab'
