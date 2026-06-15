import React from 'react'
import { Package } from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { ActiveToggle } from './ActiveToggle'
import type { FieldDef, FieldGroup } from '@fayz-ai/core'

interface ProductFormLayoutProps {
  fields: FieldDef[]
  fieldGroups: FieldGroup[]
  values: Record<string, any>
  onChange: (key: string, val: any) => void
  renderField: (field: FieldDef, value: any, onChange: (val: any) => void) => React.ReactNode
}

const PRICING_FIELDS = new Set(['price', 'cost', 'currency', 'unit'])
const STOCK_FIELDS = new Set(['stock', 'minStock'])
const SKIP_FIELDS = new Set(['status', 'isActive', 'tags', 'imageUrl', 'name', 'description', 'sku', 'category'])

function FieldItem({ field, value, onChange, renderField, colSpan }: {
  field: FieldDef; value: any; onChange: (val: any) => void
  renderField: ProductFormLayoutProps['renderField']; colSpan?: boolean
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

export function ProductFormLayout({ fields, fieldGroups, values, onChange, renderField }: ProductFormLayoutProps) {
  const nameField = fields.find((f) => f.key === 'name')
  const descField = fields.find((f) => f.key === 'description')
  const skuField = fields.find((f) => f.key === 'sku')
  const categoryField = fields.find((f) => f.key === 'category')
  const imageField = fields.find((f) => f.key === 'imageUrl')
  const pricingFields = fields.filter((f) => PRICING_FIELDS.has(f.key))
  const stockFields = fields.filter((f) => STOCK_FIELDS.has(f.key))
  const statusField = fields.find((f) => f.key === 'status')
  const hasActive = fields.some((f) => f.key === 'isActive')

  // Project-specific fields
  const projectFields = fields.filter((f) => !SKIP_FIELDS.has(f.key) && !PRICING_FIELDS.has(f.key) && !STOCK_FIELDS.has(f.key))

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
      {/* Identity card — image + name + category + active */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-5">
            {/* Product image or placeholder */}
            <div className="shrink-0 space-y-2">
              {values.imageUrl ? (
                <img src={values.imageUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Package className="h-8 w-8" />
                </div>
              )}
              {imageField && (
                <div className="w-24">
                  <input
                    type="text"
                    value={values.imageUrl ?? ''}
                    onChange={(e) => onChange('imageUrl', e.target.value)}
                    placeholder="Image URL"
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-[10px] text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              )}
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
                      active={hasActive ? (values.isActive ?? true) : statusField ? values[statusField.key] === 'active' || values[statusField.key] === 'available' : true}
                      onChange={(v) => {
                        if (hasActive) onChange('isActive', v)
                        if (statusField) {
                          const opts = statusField.options?.map((o: any) => typeof o === 'string' ? o : o.value) ?? []
                          const activeVal = opts.find((o: string) => o === 'active' || o === 'available') ?? 'active'
                          const inactiveVal = opts.find((o: string) => o === 'inactive' || o === 'sold_out' || o === 'hidden') ?? 'inactive'
                          onChange(statusField.key, v ? activeVal : inactiveVal)
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Category + SKU */}
              <div className="grid gap-4 sm:grid-cols-2">
                {categoryField && <FieldItem field={categoryField} value={values[categoryField.key]} onChange={(val) => onChange(categoryField.key, val)} renderField={renderField} />}
                {skuField && <FieldItem field={skuField} value={values[skuField.key]} onChange={(val) => onChange(skuField.key, val)} renderField={renderField} />}
              </div>

              {/* Description */}
              {descField && <FieldItem field={descField} value={values[descField.key]} onChange={(val) => onChange(descField.key, val)} renderField={renderField} colSpan />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      {pricingFields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
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

      {/* Stock */}
      {stockFields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Inventory</h3>
          <Card className="mt-1">
            <CardContent className="pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                {stockFields.map((field) => (
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
