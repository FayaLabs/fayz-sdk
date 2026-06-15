import * as React from 'react'
import { CalendarOff, Plus, Loader2, Trash2, Repeat } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { Checkbox } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'

export interface Holiday {
  id: string
  name: string
  date: string
  recurring: boolean
  description?: string
  isActive: boolean
}

interface HolidaysSettingsProps {
  holidays: Holiday[]
  loading?: boolean
  canManage?: boolean
  onAdd?: (data: Omit<Holiday, 'id' | 'isActive'> & { isActive?: boolean }) => Promise<void>
  onRemove?: (id: string) => Promise<void>
}

function AddHolidayForm({ onAdd, onCancel }: { onAdd: HolidaysSettingsProps['onAdd']; onCancel: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = React.useState('')
  const [date, setDate] = React.useState('')
  const [recurring, setRecurring] = React.useState(false)
  const [description, setDescription] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !date || !onAdd) return
    setSaving(true)
    try {
      await onAdd({
        name: name.trim(),
        date,
        recurring,
        description: description.trim() || undefined,
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
      <p className="text-sm font-medium">{t('settings.holidays.newHoliday')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.holidays.namePlaceholder')} required />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('settings.holidays.descriptionPlaceholder')} />
      <label className="flex items-center gap-2.5 cursor-pointer text-sm">
        <Checkbox checked={recurring} onChange={setRecurring} />
        {t('settings.holidays.recurringAnnually')}
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t('common.add')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  )
}

export function HolidaysSettings({ holidays, loading, canManage, onAdd, onRemove }: HolidaysSettingsProps) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = React.useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('settings.holidays.title')}</CardTitle>
            <CardDescription>{t('settings.holidays.subtitle')}</CardDescription>
          </div>
          {canManage && !showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings.holidays.addHoliday')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && <AddHolidayForm onAdd={onAdd} onCancel={() => setShowForm(false)} />}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : holidays.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('settings.holidays.empty')}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center gap-3 px-4 py-3">
                <CalendarOff className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{holiday.name}</span>
                    {holiday.recurring && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Repeat className="h-2.5 w-2.5" />
                        {t('settings.holidays.annual')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(holiday.date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    {holiday.description && ` — ${holiday.description}`}
                  </p>
                </div>
                {canManage && onRemove && (
                  <button
                    onClick={() => onRemove(holiday.id)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Remove holiday"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
