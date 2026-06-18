import React, { useEffect, useState } from 'react'
import { Badge } from '@fayz-ai/ui'
import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import type { FieldRelation } from '@fayz-ai/core'

// Relation field support for the CRUD engine: load a select's options from a
// table at runtime so a foreign-key column stores a real id (e.g. uuid) instead
// of a static string. Shared by the form input (RelationSelect) and the table
// cell (RelationCell). Options are cached per (schema, table, fields, tenant,
// filter) so the list + every cell reuse one query.

type Option = { value: string; label: string }

const cache = new Map<string, Promise<Option[]>>()

function keyOf(r: FieldRelation): string {
  const tenant = r.tenantScoped !== false ? (getActiveTenantId() ?? '') : ''
  return JSON.stringify([
    r.schema ?? 'public', r.table, r.valueField ?? 'id', r.labelField ?? 'name',
    tenant, r.filter ?? null,
  ])
}

async function fetchOptions(r: FieldRelation): Promise<Option[]> {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) return []
  const valueField = r.valueField ?? 'id'
  const labelField = r.labelField ?? 'name'
  let q = (r.schema ? supabase.schema(r.schema) : supabase)
    .from(r.table)
    .select(`${valueField}, ${labelField}`)
  if (r.tenantScoped !== false) {
    const tid = getActiveTenantId()
    if (tid) q = q.eq('tenant_id', tid)
  }
  if (r.filter) for (const [k, v] of Object.entries(r.filter)) q = q.eq(k, v)
  q = q.order(labelField, { ascending: true })
  const { data } = await q
  return (data ?? []).map((row: any) => ({
    value: String(row[valueField]),
    label: String(row[labelField] ?? row[valueField]),
  }))
}

export function loadRelationOptions(r: FieldRelation): Promise<Option[]> {
  const k = keyOf(r)
  if (!cache.has(k)) {
    cache.set(k, fetchOptions(r).catch(() => { cache.delete(k); return [] }))
  }
  return cache.get(k)!
}

/** Drop cached relation options (call after creating/editing a related row). */
export function invalidateRelationOptions(): void {
  cache.clear()
}

export function useRelationOptions(r: FieldRelation | undefined): {
  options: Option[]
  loading: boolean
  labelFor: (value: any) => string
} {
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const dep = r ? keyOf(r) : 'none'
  useEffect(() => {
    let alive = true
    if (!r) { setLoading(false); return }
    setLoading(true)
    loadRelationOptions(r).then((opts) => {
      if (alive) { setOptions(opts); setLoading(false) }
    })
    return () => { alive = false }
  }, [dep]) // eslint-disable-line react-hooks/exhaustive-deps
  const labelFor = (value: any) => options.find((o) => o.value === String(value))?.label ?? ''
  return { options, loading, labelFor }
}

export function RelationSelect({
  relation,
  value,
  onChange,
  className,
  required,
  placeholder,
}: {
  relation?: FieldRelation
  value: any
  onChange: (value: any) => void
  className?: string
  required?: boolean
  placeholder?: string
}) {
  const { options, loading } = useRelationOptions(relation)
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      required={required}
      className={className}
    >
      <option value="">{loading ? 'Loading…' : (placeholder ?? 'Select...')}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function RelationCell({ relation, value }: { relation?: FieldRelation; value: any }) {
  const { labelFor, loading } = useRelationOptions(relation)
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>
  const label = labelFor(value)
  return <Badge variant="secondary">{label || (loading ? '…' : String(value))}</Badge>
}
