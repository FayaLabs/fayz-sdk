import React, { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { ArrowLeft, Save, Loader2, Eye } from 'lucide-react'
import { Button } from '@fayz/ui'
import { Input } from '@fayz/ui'
import { Card, CardContent } from '@fayz/ui'
import { Badge } from '@fayz/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import type { CustomFormsStore } from '../store'
import type { CustomFormsDataProvider } from '../data/types'
import type { CustomFormsConfig } from '../config'
import type { FormFieldDef, FormSchema, TemplateCategory } from '../types'
import { FieldPalette, FIELD_TYPES, DEFAULT_COL_SPAN } from './FieldPalette'
import { BuilderCanvas } from './BuilderCanvas'
import { FieldConfigDrawer } from './FieldConfigDialog'
import { createPortal } from 'react-dom'
import { FormRenderer } from './FormRenderer'

const TEMPLATE_CATEGORIES: TemplateCategory[] = ['anamnesis', 'evolution', 'report', 'contract', 'general']

interface FormBuilderProps {
  templateId?: string
  store: CustomFormsStore
  provider: CustomFormsDataProvider
  config: CustomFormsConfig
  onBack: () => void
}

export function FormBuilder({ templateId, store, provider, config, onBack }: FormBuilderProps) {
  const t = useTranslation()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('general')
  const [fields, setFields] = useState<FormFieldDef[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({})
  const [draggingFieldType, setDraggingFieldType] = useState<import('../types').FormFieldType | null>(null)
  const [templateName, setTemplateName] = useState<string | null>(null)

  // Load existing template
  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    provider.getTemplateById(templateId).then((tpl) => {
      if (cancelled || !tpl) return
      setName(tpl.name)
      setTemplateName(tpl.name)
      setDescription(tpl.description ?? '')
      setCategory(tpl.category)
      setFields(tpl.schema.fields)
    })
    return () => { cancelled = true }
  }, [templateId, provider])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.source === 'palette') {
      setDraggingFieldType(data.fieldType)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggingFieldType(null)
    const { active, over } = event

    // Dropped from palette onto canvas
    if (active.data.current?.source === 'palette' && over) {
      const fieldType = active.data.current.fieldType
      const typeDef = FIELD_TYPES.find((ft) => ft.type === fieldType)
      if (!typeDef) return

      const newField: FormFieldDef = {
        id: crypto.randomUUID(),
        type: fieldType,
        label: t(`customForms.fieldType.${fieldType}`),
        col: 0,
        row: fields.length,
        colSpan: DEFAULT_COL_SPAN[fieldType] ?? 12,
      }

      if (['select', 'radio', 'tags'].includes(fieldType)) {
        newField.options = [
          { label: 'Option 1', value: 'option_1' },
          { label: 'Option 2', value: 'option_2' },
        ]
      }

      setFields((prev) => [...prev, newField])
      return
    }

    // Reorder within canvas
    if (active.id !== over?.id && over) {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id)
        const newIndex = prev.findIndex((f) => f.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return prev
        const reordered = arrayMove(prev, oldIndex, newIndex)
        return reordered.map((f, i) => ({ ...f, row: i }))
      })
    }
  }, [fields, t])

  const handleSelectField = useCallback((field: FormFieldDef) => {
    setSelectedFieldId(field.id)
  }, [])

  const handleRemoveField = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId).map((f, i) => ({ ...f, row: i })))
    if (selectedFieldId === fieldId) setSelectedFieldId(null)
  }, [selectedFieldId])

  const handleFieldUpdate = useCallback((updated: FormFieldDef) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }, [])

  const handleFieldConfigSave = useCallback((updated: FormFieldDef) => {
    handleFieldUpdate(updated)
    setSelectedFieldId(null)
  }, [handleFieldUpdate])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const schema: FormSchema = { fields, layout: { columns: 12 } }

      if (templateId) {
        await store.getState().updateTemplate(templateId, { name, description, category, schema })
      } else {
        await store.getState().createTemplate({ name, description, category, schema })
      }
      onBack()
    } finally {
      setSaving(false)
    }
  }, [templateId, name, description, category, fields, store, onBack])

  const selectedField = selectedFieldId
    ? fields.find((f) => f.id === selectedFieldId) ?? null
    : null

  const isNew = !templateId
  const breadcrumbLabel = isNew
    ? t('customForms.newTemplate')
    : templateName ?? t('customForms.editTemplate')

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('customForms.templates')}
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{breadcrumbLabel}</span>
      </div>

      {/* Form meta — card layout matching CRUD form */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t('customForms.templateName')} <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('customForms.templateName')}
                className="h-9 text-sm"
                autoFocus={isNew}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('customForms.templateCategory')}</label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`customForms.category.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('customForms.templateDescription')}</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('customForms.templateDescription')}
              className="h-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Builder section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{t('customForms.builder.fields')}</h3>
          <Badge variant="secondary" className="text-[10px]">
            {t('customForms.builder.fieldCount', { count: String(fields.length) })}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving || !name.trim()} size="sm" className="h-9">
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            {saving ? t('customForms.builder.saving') : t('customForms.builder.save')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={fields.length === 0}
            onClick={() => { setPreviewData({}); setShowPreview(true) }}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>
        </div>
      </div>

      {/* Builder body — drag palette + canvas */}
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          <FieldPalette />
          <BuilderCanvas
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={handleSelectField}
            onRemoveField={handleRemoveField}
            draggingFieldType={draggingFieldType}
          />
        </div>

        <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
          {draggingFieldType ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card shadow-xl text-sm font-medium opacity-90 pointer-events-none">
              {(() => {
                const def = FIELD_TYPES.find((ft) => ft.type === draggingFieldType)
                if (!def) return null
                const Icon = def.icon
                return (
                  <>
                    <Icon className="h-4 w-4 text-primary" />
                    {t(`customForms.fieldType.${draggingFieldType}`)}
                  </>
                )
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Field config drawer (right side) */}
      <FieldConfigDrawer
        field={selectedField}
        onSave={handleFieldConfigSave}
        onUpdate={handleFieldUpdate}
        onClose={() => setSelectedFieldId(null)}
      />

      {/* Preview — A4 paper overlay (portaled to body) */}
      {showPreview && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 overflow-y-auto py-10 px-4" onClick={() => setShowPreview(false)}>
          <div
            className="relative w-full max-w-3xl bg-white rounded-modal shadow-lg"
            style={{ minHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button — kept on white paper background; literal grays are intentional print look */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            >
              <span className="text-lg">✕</span>
            </button>

            {/* Paper content — printed A4 simulation; literal black-on-white is the point */}
            <div className="px-10 py-8 sm:px-14 sm:py-10 text-neutral-900">
              <h1 className="text-2xl font-bold mb-1">{name || t('customForms.newTemplate')}</h1>
              {description && <p className="text-sm text-neutral-500 mb-8">{description}</p>}
              {!description && <div className="mb-8" />}

              <FormRenderer
                schema={{ fields, layout: { columns: 12 } }}
                data={previewData}
                onChange={setPreviewData}
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
