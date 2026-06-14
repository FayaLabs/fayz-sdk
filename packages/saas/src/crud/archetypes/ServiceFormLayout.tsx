import React from 'react'
import { Briefcase } from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { ActiveToggle } from './ActiveToggle'
import type { FieldDef, FieldGroup } from '@fayz-ai/core'

interface ServiceFormLayoutProps {
  fields: FieldDef[]
  fieldGroups: FieldGroup[]
  values: Record<string, any>
  onChange: (key: string, val: any) => void
  renderField: (field: FieldDef, value: any, onChange: (val: any) => void) => React.ReactNode
}

const IDENTITY_FIELDS = new Set(['name', 'description', 'imageUrl', 'category'])
const PRICING_FIELDS = new Set(['price', 'cost', 'currency', 'durationMinutes'])
const SKIP_FIELDS = new Set(['status', 'isActive', 'tags'])

function FieldItem({ field, value, onChange, renderField, colSpan }: {
  field: FieldDef; value: any; onChange: (val: any) => void
  renderField: ServiceFormLayoutProps['renderField']; colSpan?: boolean
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

export function ServiceFormLayout({ fields, fieldGroups, values, onChange, renderField }: ServiceFormLayoutProps) {
  const nameField = fields.find((f) => f.key === 'name')
  const descField = fields.find((f) => f.key === 'description')
  const otherIdentity = fields.filter((f) => IDENTITY_FIELDS.has(f.key) && f.key !== 'name' && f.key !== 'description')
  const pricingFields = fields.filter((f) => PRICING_FIELDS.has(f.key))
  const statusField = fields.find((f) => f.key === 'status')
  const hasActive = fields.some((f) => f.key === 'isActive')

  const allKnown = new Set([...IDENTITY_FIELDS, ...PRICING_FIELDS, ...SKIP_FIELDS])
  const projectFields = fields.filter((f) => !allKnown.has(f.key))

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
      {/* Identity */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-4">
              {/* Name + active toggle */}
              <div className="flex items-start gap-4">
                {nameField && (
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium">{nameField.label}{nameField.required && <span className="text-destructive ml-0.5">*</span>}</label>
                    {renderField(nameField, values[nameField.key], (val) => onChange(nameField.key, val))}
                  </div>
                )}
                {(hasActive || statusField) && (
                  <div className="mt-6 shrink-0">
                    <ActiveToggle
                      active={hasActive ? (values.isActive ?? true) : statusField ? values[statusField.key] === 'active' : true}
                      onChange={(v) => {
                        if (hasActive) onChange('isActive', v)
                        if (statusField) onChange(statusField.key, v ? 'active' : 'inactive')
                      }}
                    />
                  </div>
                )}
              </div>
              {/* Description */}
              {descField && <FieldItem field={descField} value={values[descField.key]} onChange={(val) => onChange(descField.key, val)} renderField={renderField} colSpan />}
              {/* Other identity */}
              {otherIdentity.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {otherIdentity.map((field) => (
                    <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Duration */}
      {pricingFields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pricing & Duration</h3>
          <Card className="mt-1">
            <CardContent className="pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                {pricingFields.map((field) => (
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
        <div>
          <h3 className="text-sm font-semibold text-foreground">Details</h3>
          <Card className="mt-1">
            <CardContent className="pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                {ungroupedProject.map((field) => (
                  <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} colSpan={field.span === 2} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
