import * as React from 'react'
import { MapPin, Phone, Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { Checkbox } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import type { Location } from '../../types/tenant'

interface LocationsOverviewProps {
  locations: Location[]
  loading?: boolean
  canManage?: boolean
  onAdd?: (data: { name: string; address?: string; city?: string; state?: string; country?: string; phone?: string; isHeadquarters?: boolean }) => Promise<void>
}

function AddLocationForm({ onAdd, onCancel }: { onAdd: LocationsOverviewProps['onAdd']; onCancel: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [city, setCity] = React.useState('')
  const [state, setState] = React.useState('')
  const [country, setCountry] = React.useState('BR')
  const [phone, setPhone] = React.useState('')
  const [isHQ, setIsHQ] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !onAdd) return
    setSaving(true)
    try {
      await onAdd({
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        phone: phone.trim() || undefined,
        isHeadquarters: isHQ,
      })
      onCancel()
    } catch {
      // handled via toast in connected wrapper
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium">{t('settings.locations.newLocation')}</p>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.locations.namePlaceholder')} required />
      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('settings.locations.addressPlaceholder')} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('settings.locations.cityPlaceholder')} />
        <Input value={state} onChange={(e) => setState(e.target.value)} placeholder={t('settings.locations.statePlaceholder')} />
        <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t('settings.locations.countryPlaceholder')} />
      </div>
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('settings.locations.phonePlaceholder')} />
      <label className="flex items-center gap-2.5 cursor-pointer text-sm">
        <Checkbox checked={isHQ} onChange={setIsHQ} />
        {t('settings.locations.headquarters')}
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>{t('common.cancel')}</Button>
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {saving ? t('settings.locations.adding') : t('settings.locations.addLocation')}
        </Button>
      </div>
    </form>
  )
}

export function LocationsOverview({ locations, loading, canManage, onAdd }: LocationsOverviewProps) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = React.useState(false)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.locations.title')}</CardTitle>
          <CardDescription>{t('settings.locations.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Locations</CardTitle>
            <CardDescription>
              {locations.length === 0
                ? t('settings.locations.noLocations')
                : t('settings.locations.countDescription', { count: String(locations.length), plural: locations.length === 1 ? '' : 's' })}
            </CardDescription>
          </div>
          {canManage && !showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('settings.locations.addLocation')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <AddLocationForm onAdd={onAdd} onCancel={() => setShowForm(false)} />
        )}

        {locations.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {t('settings.locations.empty')}
            </p>
            {canManage && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('settings.locations.addFirst')}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{loc.name}</span>
                    {loc.isHeadquarters && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        HQ
                      </span>
                    )}
                    {!loc.isActive && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {t('common.inactive')}
                      </span>
                    )}
                  </div>
                  {(loc.city || loc.state) && (
                    <p className="text-xs text-muted-foreground">
                      {[loc.city, loc.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                {loc.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {loc.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
