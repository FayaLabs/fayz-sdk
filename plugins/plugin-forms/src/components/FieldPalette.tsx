import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import {
  Heading, Type, AlignLeft, FileEdit, CalendarDays,
  ChevronDown, CircleDot, Tags, CheckSquare,
  Image, GalleryHorizontalEnd, Receipt,
} from 'lucide-react'
import { useTranslation } from '@fayz/core'
import type { FormFieldType } from '../types'

export interface FieldTypeItem {
  type: FormFieldType
  icon: React.ElementType
}

export const DEFAULT_COL_SPAN: Record<string, number> = {
  title:    12,
  memo:     12,
  richtext: 12,
  gallery:  12,
  budget:   12,
  image:    6,
  text:     6,
  date:     4,
  select:   6,
  radio:    6,
  tags:     8,
  checkbox: 4,
}

export const FIELD_TYPES: FieldTypeItem[] = [
  { type: 'title', icon: Heading },
  { type: 'text', icon: Type },
  { type: 'memo', icon: AlignLeft },
  { type: 'richtext', icon: FileEdit },
  { type: 'date', icon: CalendarDays },
  { type: 'select', icon: ChevronDown },
  { type: 'radio', icon: CircleDot },
  { type: 'tags', icon: Tags },
  { type: 'checkbox', icon: CheckSquare },
  { type: 'image', icon: Image },
  { type: 'gallery', icon: GalleryHorizontalEnd },
  { type: 'budget', icon: Receipt },
]

function DraggableFieldType({ item }: { item: FieldTypeItem }) {
  const t = useTranslation()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.type}`,
    data: { source: 'palette', fieldType: item.type },
  })

  const Icon = item.icon

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border bg-card text-sm font-medium transition-all hover:shadow-sm hover:border-primary/30 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate">{t(`customForms.fieldType.${item.type}`)}</span>
    </button>
  )
}

export function FieldPalette() {
  const t = useTranslation()

  return (
    <div className="w-44 shrink-0 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
        {t('customForms.builder.fields')}
      </p>
      {FIELD_TYPES.map((item) => (
        <DraggableFieldType key={item.type} item={item} />
      ))}
    </div>
  )
}
