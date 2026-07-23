import type { ChatRecordLink } from '../stores/chat.store'

/** Index of every record seen this conversation, so a confirmation card can
 *  show "Zeilma Cunha" for an id the model passed. Never fetches — the label
 *  already came back with the tool result that produced the id. */

const MAX_ENTRIES = 300

const refs = new Map<string, ChatRecordLink>()

/** Fields a row uses to call itself something, best first. */
const LABEL_FIELDS = [
  'name',
  'full_name',
  'fullName',
  'title',
  'label',
  'client_name',
  'customer_name',
  'service_name',
  'display_name',
  'email',
]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True for the shape the model passes around as `client_id`, `service_id`, … */
export function looksLikeRecordId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

function bestLabel(row: Record<string, unknown>, ref: Record<string, unknown>): string | null {
  if (typeof ref.label === 'string' && ref.label.trim()) return ref.label.trim()
  for (const field of LABEL_FIELDS) {
    const value = row[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function remember(link: ChatRecordLink): void {
  const existing = refs.get(link.id)
  // Never downgrade — losing the archetype or the entity key turns a working
  // link into plain text.
  const merged: ChatRecordLink = {
    ...link,
    ...(!link.archetype && existing?.archetype
      ? { archetype: existing.archetype, ...(existing.kind ? { kind: existing.kind } : {}) }
      : {}),
    ...(!link.entityKey && existing?.entityKey ? { entityKey: existing.entityKey } : {}),
  }
  // Re-insert to move it to the end: eviction drops the least recently used.
  refs.delete(link.id)
  refs.set(link.id, merged)
  while (refs.size > MAX_ENTRIES) {
    const oldest = refs.keys().next().value
    if (oldest === undefined) break
    refs.delete(oldest)
  }
}

/** Walk a tool result and index every `{ ref }` in it, whatever shape the tool
 *  answers in. */
export function rememberRecordRefs(content: string): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return // non-JSON tool result — nothing to index
  }
  walk(parsed, 0)
}

function walk(node: unknown, depth: number): void {
  if (depth > 6 || !node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, depth + 1)
    return
  }
  const row = node as Record<string, unknown>
  const ref = row.ref
  if (ref && typeof ref === 'object' && !Array.isArray(ref)) {
    const r = ref as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id : null
    if (id) {
      const [archetype, kind] = String(r.archetype ?? '').split(':')
      const label = bestLabel(row, r)
      if (label) {
        remember({
          id,
          label,
          ...(archetype ? { archetype } : {}),
          ...(kind ? { kind } : {}),
          ...(typeof r.entityKey === 'string' ? { entityKey: r.entityKey } : {}),
        })
      }
    }
  } else if (looksLikeRecordId(row.id)) {
    // No ref: entities without an archetype still have an id and a name. No
    // archetype means no route, so the chip renders as plain text.
    const label = bestLabel(row, {})
    if (label) remember({ id: row.id, label })
  }
  for (const value of Object.values(row)) walk(value, depth + 1)
}

/** Null means "show the raw value" — never a guessed name. */
export function lookupRecordRef(id: unknown): ChatRecordLink | null {
  if (!looksLikeRecordId(id)) return null
  return refs.get(id) ?? null
}

/** A new thread starts with no memory of the old one's records. */
export function clearRecordRefs(): void {
  refs.clear()
}

/**
 * The records a reply is ABOUT — write results always, single-match reads too.
 * Narrower than the index above on purpose: everything gets remembered, only
 * these earn a goto button.
 */
export function extractRecordLinks(content: string): ChatRecordLink[] {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content) as Record<string, unknown>
  } catch {
    return []
  }
  const links: ChatRecordLink[] = []
  const push = (ref: unknown, fallbackLabel?: unknown) => {
    if (!ref || typeof ref !== 'object') return
    const r = ref as { id?: string; label?: string; archetype?: string; entityKey?: string }
    if (!r.id) return
    const [archetype, kind] = (r.archetype ?? '').split(':')
    links.push({
      id: r.id,
      label: String(r.label ?? fallbackLabel ?? 'registro'),
      ...(archetype ? { archetype } : {}),
      ...(kind ? { kind } : {}),
      ...(r.entityKey ? { entityKey: r.entityKey } : {}),
    })
  }
  const record = parsed.record as Record<string, unknown> | undefined
  push(parsed.ref, record?.name)
  push(record?.ref, record?.client_name ?? record?.service_name)
  const singleFrom = (rows: unknown) => {
    if (Array.isArray(rows) && rows.length === 1) {
      const row = rows[0] as Record<string, unknown>
      push(row.ref, row.name)
    }
  }
  singleFrom(parsed.records)
  for (const m of Array.isArray(parsed.matches) ? parsed.matches : []) {
    singleFrom((m as Record<string, unknown>).records)
  }
  return links
}

/** Same id twice is the same button. */
export function dedupeLinks(links: ChatRecordLink[]): ChatRecordLink[] {
  const seen = new Map<string, ChatRecordLink>()
  for (const l of links) if (!seen.has(l.id)) seen.set(l.id, l)
  return Array.from(seen.values()).slice(0, 3)
}
