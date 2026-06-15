import React from 'react'
import { MapPin } from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { ActiveToggle } from './ActiveToggle'
import type { FieldDef, FieldGroup } from '@fayz-ai/core'

interface LocationFormLayoutProps {
  fields: FieldDef[]
  fieldGroups: FieldGroup[]
  values: Record<string, any>
  onChange: (key: string, val: any) => void
  renderField: (field: FieldDef, value: any, onChange: (val: any) => void) => React.ReactNode
}

const IDENTITY_FIELDS = new Set(['name'])
const CONTACT_FIELDS = new Set(['phone', 'email'])
const ADDRESS_FIELDS = new Set(['address', 'city', 'state', 'country', 'postalCode'])
const SKIP_FIELDS = new Set(['isActive', 'status', 'tags', 'notes', 'isHeadquarters'])
const ALL_LOCATION_FIELDS = new Set([...IDENTITY_FIELDS, ...CONTACT_FIELDS, ...ADDRESS_FIELDS, ...SKIP_FIELDS])

function FieldItem({ field, value, onChange, renderField, colSpan }: {
  field: FieldDef; value: any; onChange: (val: any) => void
  renderField: LocationFormLayoutProps['renderField']; colSpan?: boolean
}) {
  return (
    <div className={`space-y-1.5 ${colSpan ? 'md:col-span-2' : ''}`}>
      <label className="text-sm font-medium">
        {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {renderField(field, value, onChange)}
    </div>
  )
}

export function LocationFormLayout({ fields, fieldGroups, values, onChange, renderField }: LocationFormLayoutProps) {
  const nameField = fields.find((f) => f.key === 'name')
  const contactFields = fields.filter((f) => CONTACT_FIELDS.has(f.key))
  const addressFields = fields.filter((f) => ADDRESS_FIELDS.has(f.key))
  const notesField = fields.find((f) => f.key === 'notes')
  const hasActive = fields.some((f) => f.key === 'isActive')
  const hqField = fields.find((f) => f.key === 'isHeadquarters')

  // Project-specific fields
  const projectFields = fields.filter((f) => !ALL_LOCATION_FIELDS.has(f.key))

  const groupFieldMap = new Map<string, FieldDef[]>()
  const ungroupedProject: FieldDef[] = []
  for (const field of projectFields) {
    if (field.group) {
      const existing = groupFieldMap.get(field.group) ?? []
      existing.push(field)
      groupFieldMap.set(field.group, existing)
    } else {
      ungroupedProject.push(field)
    }
  }

  return (
    <div className="space-y-6">
      {/* Identity — icon + name + active */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-4">
                {nameField && (
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium">{nameField.label}{nameField.required && <span className="text-destructive ml-0.5">*</span>}</label>
                    {renderField(nameField, values[nameField.key], (val) => onChange(nameField.key, val))}
                  </div>
                )}
                <div className="mt-6 flex items-center gap-3 shrink-0">
                  {hasActive && (
                    <ActiveToggle active={values.isActive ?? true} onChange={(v) => onChange('isActive', v)} />
                  )}
                </div>
              </div>
              {hqField && (
                <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={!!values.isHeadquarters}
                    onChange={(e) => onChange('isHeadquarters', e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Headquarters
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      {addressFields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Address</h3>
          <Card className="mt-1">
            <CardContent className="pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                {addressFields.map((field) => (
                  <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} colSpan={field.key === 'address'} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contact */}
      {contactFields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Contact</h3>
          <Card className="mt-1">
            <CardContent className="pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                {contactFields.map((field) => (
                  <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project-specific grouped fields */}
      {fieldGroups.map((group) => {
        const gFields = groupFieldMap.get(group.id)
        if (!gFields || gFields.length === 0) return null
        const cols = group.columns ?? 2
        return (
          <div key={group.id}>
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            <Card className="mt-1">
              <CardContent className="pt-5">
                <div className={`grid gap-4 ${cols >= 2 ? 'md:grid-cols-2' : ''}`}>
                  {gFields.map((field) => (
                    <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} colSpan={field.span === 2} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })}

      {/* Ungrouped project fields */}
      {ungroupedProject.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="grid gap-4 md:grid-cols-2">
              {ungroupedProject.map((field) => (
                <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} colSpan={field.span === 2} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {notesField && (
        <Card>
          <CardContent className="pt-5">
            <FieldItem field={notesField} value={values[notesField.key]} onChange={(val) => onChange(notesField.key, val)} renderField={renderField} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
