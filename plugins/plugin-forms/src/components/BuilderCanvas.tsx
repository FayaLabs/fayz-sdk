import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTranslation } from '@fayz/core'
import type { FormFieldDef, FormFieldType } from '../types'
import { BuilderField } from './BuilderField'
import { FIELD_TYPES, DEFAULT_COL_SPAN } from './FieldPalette'

interface BuilderCanvasProps {
  fields: FormFieldDef[]
  selectedFieldId: string | null
  onSelectField: (field: FormFieldDef) => void
  onRemoveField: (fieldId: string) => void
  draggingFieldType: FormFieldType | null
}

function DropPreview({ fieldType }: { fieldType: FormFieldType }) {
  const t = useTranslation()
  const def = FIELD_TYPES.find((ft) => ft.type === fieldType)
  if (!def) return null
  const Icon = def.icon

  return (
    <div
      className="flex items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3"
      style={{ gridColumn: `span ${DEFAULT_COL_SPAN[fieldType] ?? 12}` }}
    >
      <Icon className="h-4 w-4 text-primary/50" />
      <span className="text-sm text-primary/50 font-medium">
        {t(`customForms.fieldType.${fieldType}`)}
      </span>
    </div>
  )
}

export function BuilderCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onRemoveField,
  draggingFieldType,
}: BuilderCanvasProps) {
  const t = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: 'builder-canvas' })

  const sortedFields = [...fields].sort((a, b) => a.row - b.row || a.col - b.col)
  const showPreview = isOver && draggingFieldType !== null

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[400px] rounded-xl border-2 border-dashed p-4 transition-colors ${
        isOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/20'
      }`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, transparent, transparent calc(8.333% - 1px), hsl(var(--border) / 0.3) calc(8.333% - 1px), hsl(var(--border) / 0.3) 8.333%)',
        backgroundSize: '100% 100%',
      }}
    >
      {fields.length === 0 && !showPreview && (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {t('customForms.builder.emptyCanvas')}
        </div>
      )}

      <SortableContext items={sortedFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
        >
          {sortedFields.map((field) => (
            <BuilderField
              key={field.id}
              field={field}
              isSelected={field.id === selectedFieldId}
              onSelect={onSelectField}
              onRemove={onRemoveField}
            />
          ))}

          {showPreview && <DropPreview fieldType={draggingFieldType!} />}
        </div>
      </SortableContext>
    </div>
  )
}
