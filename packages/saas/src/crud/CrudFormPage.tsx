import React, { useState, useEffect } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@fayz/ui'
import { Button } from '@fayz/ui'
import { Input } from '@fayz/ui'
import { Checkbox } from '@fayz/ui'
import { toast } from '@fayz/ui'
import { PersonFormLayout } from './archetypes/PersonFormLayout'
import { ProductFormLayout } from './archetypes/ProductFormLayout'
import { ServiceFormLayout } from './archetypes/ServiceFormLayout'
import { LocationFormLayout } from './archetypes/LocationFormLayout'
import { SubjectFormLayout } from './archetypes/SubjectFormLayout'
import { useTranslation } from '@fayz/core'
import type { FieldDef, FieldGroup, EntityDef } from '@fayz/core'
import type { FormLayout } from '@fayz/core'

interface CrudFormPageProps {
  entityDef: EntityDef
  mode: 'create' | 'edit'
  initialData?: Record<string, any>
  onSubmit: (data: Record<string, any>) => void | Promise<void>
  onCancel: () => void
  namePlural: string
  /** Embedded mode — no breadcrumb, compact layout. For use inside modals/panels. */
  embedded?: boolean
}

function getDefaultValues(fields: FieldDef[]): Record<string, any> {
  const values: Record<string, any> = {}
  for (const field of fields) {
    if (field.showInForm === false) continue
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

function renderField(field: FieldDef, value: any, onChange: (val: any) => void) {
  const baseClass = 'flex h-9 w-full rounded-input border border-input bg-background px-3 py-1.5 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  switch (field.type) {
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
    case 'currency':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={field.placeholder}
          required={field.required}
          min={field.min}
          max={field.max}
          step={field.type === 'currency' ? '0.01' : undefined}
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

function FormFieldItem({ field, value, onChange }: { field: FieldDef; value: any; onChange: (val: any) => void }) {
  return (
    <div className={`grid gap-1 ${field.span === 2 ? 'md:col-span-2' : ''}`}>
      {field.type !== 'boolean' && (
        <label className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {renderField(field, value, onChange)}
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

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
      {group.description && (
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">{group.description}</p>
      )}
      <Card>
        <CardContent className="pt-4">
          <div className={`grid gap-3 ${cols >= 2 ? 'md:grid-cols-2' : ''} ${cols >= 3 ? 'lg:grid-cols-3' : ''}`}>
            {fields.map((field) => (
              <FormFieldItem
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(val) => onChange(field.key, val)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function CrudFormPage({ entityDef, mode, initialData, onSubmit, onCancel, namePlural, embedded }: CrudFormPageProps) {
  const t = useTranslation()
  const formFields = entityDef.fields.filter((f) => f.showInForm !== false)
  const displayField = entityDef.displayField ?? entityDef.fields[0]?.key ?? 'id'
  const [values, setValues] = useState<Record<string, any>>(() =>
    mode === 'edit' && initialData ? { ...getDefaultValues(formFields), ...initialData } : getDefaultValues(formFields),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValues(
      mode === 'edit' && initialData ? { ...getDefaultValues(formFields), ...initialData } : getDefaultValues(formFields),
    )
  }, [mode, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Sanitize: convert empty strings to null so the DB doesn't choke on e.g. empty date fields
      const sanitized: Record<string, any> = {}
      for (const [key, val] of Object.entries(values)) {
        sanitized[key] = val === '' ? null : val
      }
      await onSubmit(sanitized)
    } catch (err: any) {
      const message = err?.message || 'Something went wrong'
      toast.error(t('crud.form.failedToSave', { entity: entityDef.name.toLowerCase() }), { description: message })
    } finally {
      setSaving(false)
    }
  }

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
        {/* Breadcrumb + subtitle — hidden in embedded mode */}
        {!embedded && (
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

          {/* Submit */}
          <div className={`flex items-center justify-end gap-2 ${embedded ? 'pt-1' : 'pt-2 gap-3'}`}>
            <Button type="button" variant="outline" size={embedded ? 'sm' : 'default'} onClick={onCancel} disabled={saving}>{t('common.cancel')}</Button>
            <Button type="submit" size={embedded ? 'sm' : 'default'} disabled={saving}>
              {saving && <Loader2 className={`animate-spin ${embedded ? 'mr-1.5 h-3 w-3' : 'mr-2 h-4 w-4'}`} />}
              {saving ? t('common.saving') : mode === 'create' ? t('crud.form.addTitle', { entity: entityDef.name }) : t('crud.form.saveChanges')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
