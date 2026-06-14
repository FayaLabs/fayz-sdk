import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { useTranslation } from '@fayz-ai/core'
import type { FormFieldDef } from '../types'
import { FIELD_TYPES } from './FieldPalette'

interface BuilderFieldProps {
  field: FormFieldDef
  onSelect: (field: FormFieldDef) => void
  onRemove: (fieldId: string) => void
  isSelected: boolean
}

export function BuilderField({ field, onSelect, onRemove, isSelected }: BuilderFieldProps) {
  const t = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${field.colSpan}`,
    opacity: isDragging ? 0.5 : 1,
  }

  const fieldTypeDef = FIELD_TYPES.find((ft) => ft.type === field.type)
  const Icon = fieldTypeDef?.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-start gap-2 rounded-lg border-2 bg-card p-3 transition-colors cursor-pointer ${
        isSelected
          ? 'border-primary ring-1 ring-primary/20'
          : 'border-border hover:border-primary/30'
      }`}
      onClick={() => onSelect(field)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t(`customForms.fieldType.${field.type}`)}
          </span>
        </div>
        <p className="text-sm font-medium mt-0.5 truncate">{field.label}</p>
        {field.required && (
          <span className="text-[10px] text-destructive">*</span>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(field.id) }}
        className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
      >
        <X className="h-3 w-3 text-destructive" />
      </button>
    </div>
  )
}
