import { getSupabaseClientOptional } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntityLookupResult {
  id: string
  label: string
  subtitle?: string
  group?: string
  icon?: string
  price?: number
  data?: Record<string, unknown>
}

export type EntityLookupMap = Record<string, EntityLookup>

export interface EntityLookup {
  search(query: string): Promise<EntityLookupResult[]>
  getById(id: string): Promise<EntityLookupResult | null>
  list?(): Promise<EntityLookupResult[]>
}

export type ArchetypeType = 'person' | 'product' | 'service' | 'location'

// ---------------------------------------------------------------------------
// Archetype display config
// ---------------------------------------------------------------------------

const ARCHETYPE_DISPLAY: Record<ArchetypeType, {
  table: string
  labelField: string
  subtitleFields: string[]
  priceField?: string
  groupField?: string
}> = {
  person: { table: 'persons', labelField: 'name', subtitleFields: ['phone'], groupField: 'kind' },
  product: { table: 'products', labelField: 'name', subtitleFields: ['sku', 'description'], priceField: 'price' },
  service: { table: 'services', labelField: 'name', subtitleFields: ['duration_minutes', 'description'], priceField: 'price' },
  location: { table: 'locations', labelField: 'name', subtitleFields: ['city', 'address'], groupField: 'kind' },
}

interface ArchetypeLookupConfig {
  archetype: ArchetypeType
  kind?: string | string[]
  kindLabels?: Record<string, string>
  limit?: number
  subtitleFields?: string[]
}

function toResult(
  row: Record<string, unknown>,
  display: typeof ARCHETYPE_DISPLAY[ArchetypeType],
  kindLabels?: Record<string, string>,
): EntityLookupResult {
  const label = String(row[display.labelField] ?? row.name ?? '')
  const subtitleParts = display.subtitleFields
    .map((f) => row[f])
    .filter(Boolean)
    .map((v) => {
      if (typeof v === 'number') return `${v}min`
      return String(v)
    })

  let group: string | undefined
  if (display.groupField && row[display.groupField]) {
    const rawGroup = String(row[display.groupField])
    group = kindLabels?.[rawGroup] ?? rawGroup
  }

  return {
    id: String(row.id),
    label,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined,
    group,
    price: display.priceField ? Number(row[display.priceField]) || undefined : undefined,
    data: row,
  }
}

/**
 * Create an EntityLookup that queries a saas_core archetype table via Supabase.
 * Returns empty results if Supabase is not configured.
 */
export function createArchetypeLookup(config: ArchetypeLookupConfig): EntityLookup {
  const baseDisplay = ARCHETYPE_DISPLAY[config.archetype]
  const display = config.subtitleFields
    ? { ...baseDisplay, subtitleFields: config.subtitleFields }
    : baseDisplay
  const limit = config.limit ?? 20
  const kinds = config.kind
    ? Array.isArray(config.kind) ? config.kind : [config.kind]
    : undefined

  function applyKindFilter(qb: any) {
    if (kinds && kinds.length === 1) return qb.eq('kind', kinds[0])
    if (kinds && kinds.length > 1) return qb.in('kind', kinds)
    return qb
  }

  return {
    async search(query: string) {
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return []

      let qb = supabase
        .schema('saas_core')
        .from(display.table)
        .select('*')
        .eq('is_active', true)
        .order(display.labelField, { ascending: true })
        .limit(limit)

      if (query) qb = qb.ilike(display.labelField, `%${query}%`)
      qb = applyKindFilter(qb)

      const { data } = await qb
      return (data ?? []).map((row: Record<string, unknown>) =>
        toResult(row, display, config.kindLabels),
      )
    },

    async list() {
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return []

      let qb = supabase
        .schema('saas_core')
        .from(display.table)
        .select('*')
        .eq('is_active', true)
        .order(display.labelField, { ascending: true })
        .limit(limit)

      qb = applyKindFilter(qb)

      const { data } = await qb
      return (data ?? []).map((row: Record<string, unknown>) =>
        toResult(row, display, config.kindLabels),
      )
    },

    async getById(id: string) {
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return null

      const { data } = await supabase
        .schema('saas_core')
        .from(display.table)
        .select('*')
        .eq('id', id)
        .single()

      return data
        ? toResult(data as Record<string, unknown>, display, config.kindLabels)
        : null
    },
  }
}
