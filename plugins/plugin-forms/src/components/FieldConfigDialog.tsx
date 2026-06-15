import React, { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { FormFieldDef } from '../types'
import { FIELD_TYPES } from './FieldPalette'

const SIZE_OPTIONS = [
  { span: 3,  label: '1/4' },
  { span: 4,  label: '1/3' },
  { span: 6,  label: '1/2' },
  { span: 8,  label: '2/3' },
  { span: 9,  label: '3/4' },
  { span: 12, label: 'Full' },
]

interface FieldConfigDrawerProps {
  field: FormFieldDef | null
  onSave: (updated: FormFieldDef) => void
  /** Live update without closing — used for visual changes like colSpan */
  onUpdate?: (updated: FormFieldDef) => void
  onClose: () => void
}

export function FieldConfigDrawer({ field, onSave, onUpdate, onClose }: FieldConfigDrawerProps) {
  const t = useTranslation()
  const [label, setLabel] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [required, setRequired] = useState(false)
  const [colSpan, setColSpan] = useState(12)
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>([])

  // Sync state when field changes
  useEffect(() => {
    if (!field) return
    setLabel(field.label)
    setPlaceholder(field.placeholder ?? '')
    setRequired(field.required ?? false)
    setColSpan(field.colSpan)
    setOptions(field.options ?? [])
  }, [field?.id])

  if (!field) return null

  const hasOptions = ['select', 'radio', 'tags'].includes(field.type)
  const fieldTypeDef = FIELD_TYPES.find((ft) => ft.type === field.type)
  const Icon = fieldTypeDef?.icon

  const handleSave = () => {
    onSave({
      ...field,
      label,
      placeholder: placeholder || undefined,
      required,
      colSpan: Math.max(1, Math.min(12, colSpan)),
      options: hasOptions ? options.filter((o) => o.label.trim()) : field.options,
    })
  }

  const addOption = () => {
    setOptions([...options, { label: '', value: '' }])
  }

  const updateOption = (index: number, newLabel: string) => {
    const updated = [...options]
    updated[index] = { label: newLabel, value: newLabel.toLowerCase().replace(/\s+/g, '_') }
    setOptions(updated)
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  return (
    <Sheet open={!!field} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="w-80 sm:w-96" overlay="none">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sm">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            {t(`customForms.fieldType.${field.type}`)}
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-4 py-4">
          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('customForms.builder.fieldLabel')}</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          {/* Placeholder */}
          {!['title', 'checkbox', 'image', 'gallery'].includes(field.type) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('customForms.builder.fieldPlaceholder')}</label>
              <Input
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Column span — visual skeleton selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium">{t('customForms.builder.colSpan')}</label>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.span}
                  onClick={() => {
                    setColSpan(opt.span)
                    if (onUpdate && field) {
                      onUpdate({ ...field, colSpan: opt.span })
                    }
                  }}
                  className={`group relative rounded-lg border-2 p-2 transition-all ${
                    colSpan === opt.span
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {/* Mini 12-col skeleton preview */}
                  <div className="flex gap-px h-3 mb-1.5">
                    <div
                      className={`rounded-sm ${colSpan === opt.span ? 'bg-primary/60' : 'bg-muted-foreground/30 group-hover:bg-primary/30'}`}
                      style={{ width: `${(opt.span / 12) * 100}%` }}
                    />
                    {opt.span < 12 && (
                      <div
                        className="rounded-sm bg-muted/60"
                        style={{ width: `${((12 - opt.span) / 12) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${colSpan === opt.span ? 'text-primary' : 'text-muted-foreground'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Required */}
          {field.type !== 'title' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-input accent-primary"
              />
              <span className="text-sm">{t('customForms.builder.fieldRequired')}</span>
            </label>
          )}

          {/* Options */}
          {hasOptions && (
            <div className="space-y-2">
              <label className="text-xs font-medium">{t('customForms.builder.fieldOptions')}</label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="h-8 text-sm flex-1"
                  />
                  <button onClick={() => removeOption(i)} className="p-1 hover:bg-destructive/10 rounded">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption} className="h-8 text-xs w-full">
                <Plus className="h-3 w-3 mr-1" />
                {t('customForms.builder.addOption')}
              </Button>
            </div>
          )}
        </SheetBody>

        <SheetFooter className="pt-4 border-t">
          <Button size="sm" onClick={handleSave} className="w-full">
            OK
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
