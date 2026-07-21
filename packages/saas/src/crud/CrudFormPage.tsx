import React, { useState, useEffect } from 'react'
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { Checkbox } from '@fayz-ai/ui'
import { CurrencyInput } from '@fayz-ai/ui'
import { MarkdownEditor } from '@fayz-ai/ui'
import { toast } from '@fayz-ai/ui'
import { useSaveBar, useBackHandler } from '@fayz-ai/ui'
import { PersonFormLayout } from './archetypes/PersonFormLayout'
import { ProductFormLayout } from './archetypes/ProductFormLayout'
import { ServiceFormLayout } from './archetypes/ServiceFormLayout'
import { LocationFormLayout } from './archetypes/LocationFormLayout'
import { SubjectFormLayout } from './archetypes/SubjectFormLayout'
import { useTranslation } from '@fayz-ai/core'
import type { FieldDef, FieldGroup, EntityDef } from '@fayz-ai/core'
import type { FormLayout } from '@fayz-ai/core'
import { RelationSelect } from './relation-field'
import { useLimitGuard, invalidateLimit } from '../access'

interface CrudFormPageProps {
  entityDef: EntityDef
  mode: 'create' | 'edit'
  initialData?: Record<string, any>
  onSubmit: (data: Record<string, any>) => void | Promise<void>
  onCancel: () => void
  namePlural: string
  /** Embedded mode — no breadcrumb, compact layout. For use inside modals/panels. */
  embedded?: boolean
  /** Hide the internal breadcrumb while keeping the full-page SaveBar/Escape flow.
   *  Use when a parent already renders its own header (e.g. SubpageHeader). */
  hideBreadcrumb?: boolean
}

/** Derive a currency symbol from an ISO code (e.g. USD → "$") when not given. */
function currencySymbolFor(code: string | undefined, locale: string): string {
  if (!code) return 'R$'
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? code
  } catch {
    return code
  }
}

function getDefaultValues(fields: FieldDef[]): Record<string, any> {
  const values: Record<string, any> = {}
  for (const field of fields) {
    if (field.showInForm === false) continue
    // Computed fields are read-only and never part of the payload.
    if (field.type === 'computed') continue
    if (field.defaultValue != null) {
      values[field.key] = field.defaultValue
    } else {
      switch (field.type) {
        case 'boolean':
          values[field.key] = false
          break
        case 'number':
        case 'currency':
          values[field.key] = ''
          break
        default:
          values[field.key] = ''
      }
    }
  }
  return values
}

function renderField(field: FieldDef, value: any, onChange: (val: any) => void, allValues: Record<string, any> = {}) {
  const baseClass = 'flex h-9 w-full rounded-input border border-input bg-background px-3 py-1.5 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  switch (field.type) {
    case 'currency': {
      const locale = field.currencyLocale ?? 'pt-BR'
      return (
        <CurrencyInput
          value={Number(value) || 0}
          onChange={(n) => onChange(n)}
          currencyCode={field.currency}
          locale={locale}
          symbol={field.currencySymbol ?? currencySymbolFor(field.currency, locale)}
        />
      )
    }
    case 'segmented': {
      const options = (field.options ?? []).map((o) =>
        typeof o === 'string' ? { label: o, value: o, description: undefined } : o,
      )
      return (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {options.map((o) => {
            const active = value === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <p className={`text-sm font-medium ${active ? 'text-primary' : ''}`}>{o.label}</p>
                {'description' in o && o.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{o.description}</p>
                )}
              </button>
            )
          })}
        </div>
      )
    }
    case 'computed': {
      const result = field.compute ? field.compute(allValues) : null
      const tone = result?.tone === 'positive' ? 'text-success'
        : result?.tone === 'negative' ? 'text-destructive'
        : 'text-foreground'
      return (
        <div className="mt-1 rounded-lg border bg-muted/20 px-3 py-2 text-sm tabular-nums text-right">
          {result ? <span className={tone}>{result.display}</span> : <span className="text-muted-foreground">—</span>}
        </div>
      )
    }
    case 'textarea':
      return (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={2}
          className={`${baseClass} min-h-[60px] py-1.5`}
        />
      )
    case 'markdown':
      return (
        <MarkdownEditor
          value={value ?? ''}
          onChange={onChange}
          placeholder={field.placeholder}
          minRows={12}
          defaultMode="edit"
        />
      )
    case 'relation':
      return (
        <RelationSelect
          relation={field.relation}
          value={value}
          onChange={onChange}
          className={baseClass}
          required={field.required}
          placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}...`}
        />
      )
    case 'select': {
      const options = (field.options ?? []).map((o) =>
        typeof o === 'string' ? { label: o, value: o } : o,
      )
      return (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseClass}
        >
          <option value="">{field.placeholder ?? `Select ${field.label.toLowerCase()}...`}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )
    }
    case 'boolean':
      return (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Checkbox
            checked={!!value}
            onChange={(checked) => onChange(checked)}
          />
          <span className="text-sm">{field.label}</span>
        </label>
      )
    case 'number':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={field.placeholder}
          required={field.required}
          min={field.min}
          max={field.max}
        />
      )
    case 'date':
      return <Input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} />
    case 'datetime':
      return <Input type="datetime-local" value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} />
    case 'time':
      return <Input type="time" value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} />
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || '#6b7280'}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 rounded-md border border-input cursor-pointer p-0.5"
          />
          <Input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 font-mono text-xs"
          />
        </div>
      )
    default:
      return (
        <Input
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      )
  }
}

function FormFieldItem({ field, value, onChange, allValues }: { field: FieldDef; value: any; onChange: (val: any) => void; allValues?: Record<string, any> }) {
  return (
    <div className={`grid gap-1 ${field.span === 2 ? 'md:col-span-2' : ''}`}>
      {field.type !== 'boolean' && (
        <label className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {renderField(field, value, onChange, allValues)}
      {field.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{field.hint}</p>}
    </div>
  )
}

function FormGroup({
  group,
  fields,
  values,
  onChange,
}: {
  group: FieldGroup
  fields: FieldDef[]
  values: Record<string, any>
  onChange: (key: string, val: any) => void
}) {
  const cols = group.columns ?? 2

  const grid = (
    <div className={`grid gap-3 ${cols >= 2 ? 'md:grid-cols-2' : ''} ${cols >= 3 ? 'lg:grid-cols-3' : ''}`}>
      {fields.map((field) => (
        <FormFieldItem
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(val) => onChange(field.key, val)}
          allValues={values}
        />
      ))}
    </div>
  )

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
      {group.description && (
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">{group.description}</p>
      )}
      <Card>
        <CardContent className="pt-4">
          {group.imageSlot ? (
            <div className="flex gap-4">
              {/* Decorative image slot — non-functional placeholder for now. */}
              <div className="shrink-0">
                <div className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary/50">
                  <ImagePlus className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1">{grid}</div>
            </div>
          ) : (
            grid
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function CrudFormPage({ entityDef, mode, initialData, onSubmit, onCancel, namePlural, embedded, hideBreadcrumb }: CrudFormPageProps) {
  const t = useTranslation()
  const formFields = entityDef.fields.filter((f) => f.showInForm !== false)
  const displayField = entityDef.displayField ?? entityDef.fields[0]?.key ?? 'id'
  const computeInit = () =>
    mode === 'edit' && initialData ? { ...getDefaultValues(formFields), ...initialData } : getDefaultValues(formFields)
  const [values, setValues] = useState<Record<string, any>>(computeInit)
  const [saving, setSaving] = useState(false)
  const initialRef = React.useRef<string>(JSON.stringify(values))

  useEffect(() => {
    const init = computeInit()
    setValues(init)
    initialRef.current = JSON.stringify(init)
  }, [mode, initialData])

  const computedKeys = new Set(formFields.filter((f) => f.type === 'computed').map((f) => f.key))

  // Plan quantity guard for CREATE. Hook is called unconditionally (rules of
  // hooks) with a safe empty key when the entity declares none; the guard then
  // resolves to 'ok'. Degrades to allow-all outside <AccessProvider>.
  const limitKey = entityDef.limitKey
  const guardLimit = useLimitGuard(limitKey ?? '')

  const submit = async () => {
    // Client-side plan cap: block the save (the guard opens the UpgradeModal)
    // before touching the store. Only CREATE consumes a new slot.
    if (mode === 'create' && limitKey && (await guardLimit(1)) === 'blocked') return
    setSaving(true)
    try {
      // Sanitize: convert empty strings to null so the DB doesn't choke on e.g. empty date fields.
      // Computed fields are read-only and never persisted.
      const sanitized: Record<string, any> = {}
      for (const [key, val] of Object.entries(values)) {
        if (computedKeys.has(key)) continue
        sanitized[key] = val === '' ? null : val
      }
      await onSubmit(sanitized)
      // Refresh the live count so gates/banners reflect the new row immediately.
      if (mode === 'create' && limitKey) invalidateLimit(limitKey)
    } catch (err: any) {
      const message = err?.message || 'Something went wrong'
      toast.error(t('crud.form.failedToSave', { entity: entityDef.name.toLowerCase() }), { description: message })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void submit()
  }

  const dirty = JSON.stringify(values) !== initialRef.current

  // Discard reverts the form to its pristine state and stays on the page (the
  // SaveBar then hides). Leaving the page is a separate action — the breadcrumb
  // link, or pressing Escape again once there's nothing left to discard.
  const discard = () => { setValues(computeInit()) }

  // Full-page CRUD forms surface Save/Discard via the app-wide floating SaveBar.
  // Embedded forms (rendered inside other widgets) keep their inline buttons.
  useSaveBar({
    dirty: !embedded && dirty,
    saving,
    onSave: () => { void submit() },
    onDiscard: discard,
    saveLabel: mode === 'create' ? t('crud.form.addTitle', { entity: entityDef.name }) : t('crud.form.saveChanges'),
  })

  // Register "leave to parent" with the app-wide Escape key. While the form is
  // dirty the SaveBar owns Escape (→ discard); once pristine, Escape navigates
  // back — giving the two-step "discard, then leave" flow for free.
  useBackHandler(embedded ? undefined : onCancel)

  const handleChange = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  const title = mode === 'create' ? t('crud.form.addTitle', { entity: entityDef.name }) : t('crud.form.editTitle', { entity: entityDef.name })
  const breadcrumbLabel = mode === 'create'
    ? t('crud.form.newBreadcrumb', { entity: entityDef.name })
    : (values[displayField] || initialData?.[displayField] || t('common.edit'))

  // Organize fields by groups
  const groups = entityDef.fieldGroups ?? []
  const groupFieldMap = new Map<string, FieldDef[]>()
  const ungroupedFields: FieldDef[] = []

  for (const field of formFields) {
    if (field.group) {
      const existing = groupFieldMap.get(field.group) ?? []
      existing.push(field)
      groupFieldMap.set(field.group, existing)
    } else {
      ungroupedFields.push(field)
    }
  }

  const hasGroups = groups.length > 0 || groupFieldMap.size > 0

  const archetypeLayoutProps = {
    fields: formFields,
    allFields: entityDef.fields,
    fieldGroups: groups,
    values,
    onChange: handleChange,
    renderField,
    entityIcon: entityDef.icon,
    compact: embedded,
  }

  function renderFormBody(layout?: FormLayout) {
    switch (layout) {
      case 'person':
        return <PersonFormLayout {...archetypeLayoutProps} />
      case 'product':
        return <ProductFormLayout {...archetypeLayoutProps} />
      case 'service':
        return <ServiceFormLayout {...archetypeLayoutProps} />
      case 'location':
        return <LocationFormLayout {...archetypeLayoutProps} />
      case 'subject':
        return <SubjectFormLayout {...archetypeLayoutProps} />
      default:
        // Generic layout — ungrouped + grouped fields
        return (
          <>
            {ungroupedFields.length > 0 && (
              <Card>
                <CardContent className="pt-5">
                  <div className={`grid gap-4 ${!hasGroups ? '' : 'md:grid-cols-2'}`}>
                    {ungroupedFields.map((field) => (
                      <FormFieldItem
                        key={field.key}
                        field={field}
                        value={values[field.key]}
                        onChange={(val) => handleChange(field.key, val)}
                        allValues={values}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {groups.map((group) => {
              const fields = groupFieldMap.get(group.id)
              if (!fields || fields.length === 0) return null
              return (
                <FormGroup
                  key={group.id}
                  group={group}
                  fields={fields}
                  values={values}
                  onChange={handleChange}
                />
              )
            })}
          </>
        )
    }
  }

  return (
    <div className={`w-full flex flex-col items-center ${embedded ? 'text-sm' : ''}`}>
      <div className={`w-full ${embedded ? 'space-y-3' : 'max-w-3xl space-y-5'}`}>
        {/* Breadcrumb + subtitle — hidden in embedded mode or when a parent owns the header */}
        {!embedded && !hideBreadcrumb && (
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              {namePlural}
            </button>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{breadcrumbLabel}</span>
          </nav>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={embedded ? 'space-y-3' : 'space-y-5'}>
          {renderFormBody(entityDef.layout)}

          {/* Submit — embedded forms keep inline buttons; full-page forms use the floating SaveBar */}
          {embedded && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>{t('common.cancel')}</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 className="animate-spin mr-1.5 h-3 w-3" />}
                {saving ? t('common.saving') : mode === 'create' ? t('crud.form.addTitle', { entity: entityDef.name }) : t('crud.form.saveChanges')}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
