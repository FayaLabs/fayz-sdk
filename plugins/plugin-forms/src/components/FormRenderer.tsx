import React, { useCallback } from 'react'
import { Input } from '@fayz/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fayz/ui'
import { Badge } from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import type { FormFieldDef, FormSchema } from '../types'

interface FormRendererProps {
  schema: FormSchema
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  readOnly?: boolean
}

function FieldRenderer({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: FormFieldDef
  value: unknown
  onChange: (value: unknown) => void
  readOnly?: boolean
}) {
  const t = useTranslation()

  switch (field.type) {
    case 'title':
      return (
        <h3 className="text-base font-semibold pt-2 pb-1 border-b">
          {field.label}
        </h3>
      )

    case 'text':
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium block">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <Input
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-9 text-sm"
            readOnly={readOnly}
          />
        </div>
      )

    case 'memo':
    case 'richtext':
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium block">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <textarea
            value={(value as string) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
            readOnly={readOnly}
          />
        </div>
      )

    case 'date':
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium block">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <Input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 text-sm"
            readOnly={readOnly}
          />
        </div>
      )

    case 'select':
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium block">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          {readOnly ? (
            <p className="text-sm py-1">{(value as string) ?? '-'}</p>
          ) : (
            <Select value={(value as string) ?? ''} onValueChange={onChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={field.placeholder ?? '...'} />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )

    case 'radio':
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium block">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <div className="space-y-1">
            {(field.options ?? []).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  disabled={readOnly}
                  className="text-primary"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'tags': {
      const selectedTags = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium block">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(field.options ?? []).map((opt) => {
              const active = selectedTags.includes(opt.value)
              return (
                <Badge
                  key={opt.value}
                  variant={active ? 'default' : 'outline'}
                  className={`cursor-pointer text-xs ${readOnly ? 'pointer-events-none' : ''}`}
                  onClick={() => {
                    if (readOnly) return
                    onChange(
                      active
                        ? selectedTags.filter((t) => t !== opt.value)
                        : [...selectedTags, opt.value],
                    )
                  }}
                >
                  {opt.label}
                </Badge>
              )
            })}
          </div>
        </div>
      )
    }

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
            className="rounded border-input"
          />
          <span className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </span>
        </label>
      )

    case 'image':
    case 'gallery':
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium block">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed py-8 text-sm text-muted-foreground">
            {field.type === 'gallery' ? 'Gallery upload' : 'Image upload'} — v2
          </div>
        </div>
      )

    case 'budget':
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium block">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed py-8 text-sm text-muted-foreground">
            Budget / line items — v2
          </div>
        </div>
      )

    default:
      return null
  }
}

export function FormRenderer({ schema, data, onChange, readOnly }: FormRendererProps) {
  const sortedFields = [...schema.fields].sort((a, b) => a.row - b.row || a.col - b.col)

  const handleFieldChange = useCallback(
    (fieldId: string, value: unknown) => {
      onChange({ ...data, [fieldId]: value })
    },
    [data, onChange],
  )

  return (
    <div
      className="grid gap-x-4 gap-y-3"
      style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
    >
      {sortedFields.map((field) => (
        <div key={field.id} style={{ gridColumn: `span ${field.colSpan}` }}>
          <FieldRenderer
            field={field}
            value={data[field.id]}
            onChange={(v) => handleFieldChange(field.id, v)}
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  )
}
