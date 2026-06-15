import * as React from 'react'
import { Save, Check } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fayz-ai/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import { useLocaleStore } from '../../stores/locale.store'
import { SUPPORTED_LOCALES } from '../../lib/locale-config'
import type { Tenant } from '../../types'

interface CompanySettingsProps {
  tenant?: Tenant | null
  onSave?: (settings: {
    name: string
    timezone: string
    currency: string
  }) => void
}

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasilia (BRT)' },
  { value: 'America/New_York', label: 'Eastern (US)' },
  { value: 'America/Chicago', label: 'Central (US)' },
  { value: 'America/Denver', label: 'Mountain (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific (US)' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Europe/Lisbon', label: 'Lisbon' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'UTC', label: 'UTC' },
]

const CURRENCIES = [
  { value: 'BRL', label: 'BRL - Real' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'MXN', label: 'MXN - Mexican Peso' },
  { value: 'ARS', label: 'ARS - Argentine Peso' },
]

export function CompanySettings({ tenant, onSave }: CompanySettingsProps) {
  const { t } = useTranslation()
  const { locale: uiLocale, setLocale: setUiLocale } = useLocaleStore()
  const [name, setName] = React.useState(tenant?.name ?? '')
  const [timezone, setTimezone] = React.useState(tenant?.settings?.timezone ?? 'UTC')
  const [currency, setCurrency] = React.useState(tenant?.settings?.currency ?? 'USD')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (tenant) {
      setName(tenant.name)
      setTimezone(tenant.settings?.timezone ?? 'UTC')
      setCurrency(tenant.settings?.currency ?? 'USD')
    }
  }, [tenant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSave) return

    setSaving(true)
    try {
      await onSave({ name, timezone, currency })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.company.title')}</CardTitle>
          <CardDescription>
            {t('settings.company.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="company-name" className="text-sm font-medium">
              {t('settings.company.name')}
            </label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('settings.company.timezone')}</label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.company.timezonePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('settings.company.currency')}</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.company.currencyPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.saving') : t('settings.save')}
          </Button>
        </CardFooter>
      </Card>
    </form>

      {/* UI Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.uiLanguage')}</CardTitle>
          <CardDescription>{t('settings.uiLanguageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc.code}
                onClick={() => {
                  setUiLocale(loc.code)
                  window.location.reload()
                }}
                className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-all ${
                  uiLocale === loc.code
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">{loc.flag}</span>
                  <span className="font-medium">{loc.label}</span>
                </span>
                {uiLocale === loc.code && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
