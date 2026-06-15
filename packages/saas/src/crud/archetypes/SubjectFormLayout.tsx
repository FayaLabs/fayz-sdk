import React from 'react'
import * as LucideIcons from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { ActiveToggle } from './ActiveToggle'
import { PersonPicker } from './PersonPicker'
import type { FieldDef, FieldGroup } from '@fayz-ai/core'

interface SubjectFormLayoutProps {
  fields: FieldDef[]
  allFields?: FieldDef[]
  fieldGroups: FieldGroup[]
  values: Record<string, any>
  onChange: (key: string, val: any) => void
  renderField: (field: FieldDef, value: any, onChange: (val: any) => void) => React.ReactNode
  entityIcon?: string
}

const OWNER_FIELDS = new Set(['tutorName', 'tutorPhone', 'tutorId'])
const REFERRAL_FIELDS = new Set(['referringVetId', 'referringClinicId'])
const SKIP_FIELDS = new Set(['isActive', 'notes', 'tags', 'metadata'])

function FieldItem({ field, value, onChange, renderField, colSpan }: {
  field: FieldDef; value: any; onChange: (val: any) => void
  renderField: SubjectFormLayoutProps['renderField']; colSpan?: boolean
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

export function SubjectFormLayout({ fields, allFields, fieldGroups, values, onChange, renderField, entityIcon }: SubjectFormLayoutProps) {
  const all = allFields ?? fields
  const nameField = fields.find((f) => f.key === 'name')
  const hasActive = fields.some((f) => f.key === 'isActive')
  const notesField = fields.find((f) => f.key === 'notes')
  const hasOwnerPicker = all.some((f) => f.key === 'tutorId' || f.key === 'tutorName')
  const referralFields = fields.filter((f) => REFERRAL_FIELDS.has(f.key))

  // Main subject fields = everything except name, owner, referral, skip
  const allSkip = new Set([...OWNER_FIELDS, ...REFERRAL_FIELDS, ...SKIP_FIELDS, 'name'])
  const subjectFields = fields.filter((f) => !allSkip.has(f.key))

  // Group subject fields
  const groupFieldMap = new Map<string, FieldDef[]>()
  const ungrouped: FieldDef[] = []
  for (const field of subjectFields) {
    if (field.group) {
      const existing = groupFieldMap.get(field.group) ?? []
      existing.push(field)
      groupFieldMap.set(field.group, existing)
    } else {
      ungrouped.push(field)
    }
  }

  const IconComponent = (LucideIcons as any)[entityIcon ?? 'Heart'] ?? LucideIcons.Heart

  return (
    <div className="space-y-6">
      {/* Identity — icon + name + active */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {React.createElement(IconComponent, { className: 'h-8 w-8' })}
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-4">
                {nameField && (
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium">{nameField.label}{nameField.required && <span className="text-destructive ml-0.5">*</span>}</label>
                    {renderField(nameField, values[nameField.key], (val) => onChange(nameField.key, val))}
                  </div>
                )}
                {hasActive && (
                  <div className="mt-6 shrink-0">
                    <ActiveToggle active={values.isActive ?? true} onChange={(v) => onChange('isActive', v)} />
                  </div>
                )}
              </div>
              {/* Ungrouped fields inline */}
              {ungrouped.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {ungrouped.map((field) => (
                    <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped subject fields */}
      {fieldGroups.map((group) => {
        const gFields = groupFieldMap.get(group.id)
        if (!gFields || gFields.length === 0) return null
        const cols = group.columns ?? 2
        return (
          <div key={group.id}>
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            <Card className="mt-1">
              <CardContent className="pt-5">
                <div className={`grid gap-4 ${cols >= 2 ? 'md:grid-cols-2' : ''} ${cols >= 3 ? 'lg:grid-cols-3' : ''}`}>
                  {gFields.map((field) => (
                    <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} colSpan={field.span === 2} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })}

      {/* Owner / Tutor — person picker */}
      {hasOwnerPicker && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Owner / Tutor</h3>
          <Card className="mt-1">
            <CardContent className="pt-5">
              <PersonPicker
                value={values.tutorId}
                onChange={(personId) => onChange('tutorId', personId)}
                personKind="customer"
                label="Tutor"
                placeholder="Search or type a name to add..."
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referral */}
      {referralFields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Referral</h3>
          <Card className="mt-1">
            <CardContent className="pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                {referralFields.map((field) => (
                  <FieldItem key={field.key} field={field} value={values[field.key]} onChange={(val) => onChange(field.key, val)} renderField={renderField} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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
