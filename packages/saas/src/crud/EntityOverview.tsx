import React, { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Badge } from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import type { EntityDef, FieldDef, FieldGroup } from '@fayz/core'
import { formatCurrency } from '@fayz/core'

// ---------------------------------------------------------------------------
// Shared formatValue — display a field value by type
// ---------------------------------------------------------------------------

export function formatValue(field: FieldDef, value: any, t?: (key: string) => string): React.ReactNode {
  if (value == null || value === '') return <span className="text-muted-foreground/50">—</span>
  if (field.renderCell) return field.renderCell(value, {})

  switch (field.type) {
    case 'boolean':
      return <Badge variant={value ? 'default' : 'secondary'}>{value ? (t?.('common.yes') ?? 'Yes') : (t?.('common.no') ?? 'No')}</Badge>
    case 'currency': {
      const num = typeof value === 'number' ? value : parseFloat(value)
      return isNaN(num) ? value : formatCurrency(num, field.currency)
    }
    case 'date':
      try { return new Date(value).toLocaleDateString() } catch { return value }
    case 'datetime':
      try { return new Date(value).toLocaleString() } catch { return value }
    case 'select': {
      const options = (field.options ?? []).map((o) => typeof o === 'string' ? { label: o, value: o } : o)
      const match = options.find((o) => o.value === value)
      return <Badge variant="secondary">{match?.label ?? value}</Badge>
    }
    case 'color':
      return (
        <span className="inline-flex items-center gap-2">
          <span className="h-5 w-5 rounded-full border shrink-0" style={{ backgroundColor: String(value) }} />
          <span className="text-xs font-mono text-muted-foreground">{String(value)}</span>
        </span>
      )
    case 'email':
      return <a href={`mailto:${value}`} className="text-primary hover:underline">{value}</a>
    case 'phone':
      return <a href={`tel:${value}`} className="text-primary hover:underline">{value}</a>
    case 'url':
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{value}</a>
    case 'textarea':
      return <p className="whitespace-pre-wrap">{value}</p>
    default:
      return String(value)
  }
}

// ---------------------------------------------------------------------------
// Editable field row — click to edit inline
// ---------------------------------------------------------------------------

function EditableFieldRow({ field, value, t, onSave }: {
  field: FieldDef
  value: any
  t?: (key: string) => string
  onSave?: (key: string, value: any) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value ?? '')

  function handleSave() {
    onSave?.(field.key, editValue)
    setEditing(false)
  }

  function handleCancel() {
    setEditValue(value ?? '')
    setEditing(false)
  }

  if (editing && onSave) {
    const inputType = field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'currency' ? 'number' : 'text'

    if (field.type === 'select') {
      const options = (field.options ?? []).map((o) => typeof o === 'string' ? { label: o, value: o } : o)
      return (
        <div className="grid grid-cols-3 gap-4 py-2">
          <dt className="text-xs font-medium text-muted-foreground pt-2">{field.label}</dt>
          <dd className="col-span-2 flex items-center gap-1.5">
            <select value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus
              className="flex-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">—</option>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="button" onClick={handleSave} className="p-1 text-primary hover:bg-primary/10 rounded"><Check className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={handleCancel} className="p-1 text-muted-foreground hover:bg-muted rounded"><X className="h-3.5 w-3.5" /></button>
          </dd>
        </div>
      )
    }

    if (field.type === 'textarea') {
      return (
        <div className="grid grid-cols-3 gap-4 py-2">
          <dt className="text-xs font-medium text-muted-foreground pt-2">{field.label}</dt>
          <dd className="col-span-2 flex items-start gap-1.5">
            <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus rows={3}
              className="flex-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex flex-col gap-1">
              <button type="button" onClick={handleSave} className="p-1 text-primary hover:bg-primary/10 rounded"><Check className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={handleCancel} className="p-1 text-muted-foreground hover:bg-muted rounded"><X className="h-3.5 w-3.5" /></button>
            </div>
          </dd>
        </div>
      )
    }

    if (field.type === 'boolean') {
      return (
        <div className="grid grid-cols-3 gap-4 py-2">
          <dt className="text-xs font-medium text-muted-foreground pt-2">{field.label}</dt>
          <dd className="col-span-2 flex items-center gap-2">
            <button type="button" onClick={() => { onSave?.(field.key, !value); setEditing(false) }}
              className={`relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : ''}`} />
            </button>
          </dd>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-3 gap-4 py-2">
        <dt className="text-xs font-medium text-muted-foreground pt-2">{field.label}</dt>
        <dd className="col-span-2 flex items-center gap-1.5">
          <input type={inputType} value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            className="flex-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="button" onClick={handleSave} className="p-1 text-primary hover:bg-primary/10 rounded"><Check className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={handleCancel} className="p-1 text-muted-foreground hover:bg-muted rounded"><X className="h-3.5 w-3.5" /></button>
        </dd>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4 py-2 group">
      <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
      <dd className="col-span-2 text-sm text-foreground flex items-center gap-1.5">
        <span className="flex-1">{formatValue(field, value, t)}</span>
        {onSave && field.showInForm !== false && (
          <button type="button" onClick={() => { setEditValue(value ?? ''); setEditing(true) }}
            className="p-0.5 text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-primary transition-colors">
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EntityOverview — field list with optional inline edit
// ---------------------------------------------------------------------------

interface EntityOverviewProps {
  entityDef: EntityDef
  item: Record<string, any>
  /** When provided, fields become editable. Called with (fieldKey, newValue). */
  onFieldChange?: (key: string, value: any) => void
  /** Compact mode — less padding, smaller text */
  compact?: boolean
}

export function EntityOverview({ entityDef, item, onFieldChange, compact }: EntityOverviewProps) {
  const tFn = useTranslation()

  const detailFields = entityDef.fields.filter(
    (f) => f.showInDetail !== false && f.key !== 'id' && f.key !== entityDef.displayField && f.key !== entityDef.imageField
  )

  const groups = entityDef.fieldGroups ?? []
  const groupFieldMap = new Map<string, FieldDef[]>()
  for (const field of detailFields) {
    if (field.group) {
      const existing = groupFieldMap.get(field.group) ?? []
      existing.push(field)
      groupFieldMap.set(field.group, existing)
    }
  }
  const ungroupedFields = detailFields.filter((f) => !f.group)

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      {ungroupedFields.length > 0 && (
        <div className="divide-y">
          {ungroupedFields.map((field) => (
            <EditableFieldRow key={field.key} field={field} value={item[field.key]} t={tFn} onSave={onFieldChange} />
          ))}
        </div>
      )}

      {groups.map((group) => {
        const fields = groupFieldMap.get(group.id)
        if (!fields || fields.length === 0) return null
        return (
          <div key={group.id}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{group.label}</h4>
            <div className="divide-y">
              {fields.map((field) => (
                <EditableFieldRow key={field.key} field={field} value={item[field.key]} t={tFn} onSave={onFieldChange} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Grouped fields without a matching FieldGroup definition */}
      {Array.from(groupFieldMap.entries()).map(([groupId, fields]) => {
        if (groups.some((g) => g.id === groupId)) return null
        return (
          <div key={groupId}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {groupId.charAt(0).toUpperCase() + groupId.slice(1)}
            </h4>
            <div className="divide-y">
              {fields.map((field) => (
                <EditableFieldRow key={field.key} field={field} value={item[field.key]} t={tFn} onSave={onFieldChange} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
