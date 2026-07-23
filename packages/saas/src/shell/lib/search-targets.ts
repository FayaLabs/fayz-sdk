import type { EntityDef, SearchTarget } from '@fayz-ai/core'
import { getAllEntities } from '@fayz-ai/core'
import { checkAccess } from '../../access/headless'
import { buildDataToolIndex } from './ai-tool-handlers'
import { entityToolName, registryToolName } from './core-ai-tools'
import type { PluginRegistryDef } from '../types/plugins'

// What the palette may search — built from buildDataToolIndex, the same index
// the agent's findAnything walks, so ⌘K and the agent never drift apart.
// Permission-filtered here, before anything is queried.

/** People first, then the catalog; taxonomy and ledger rows are reached by number. */
function boostFor(entity: EntityDef): number {
  switch (entity.data?.archetype) {
    case 'person': return 1
    case 'product':
    case 'service': return 0.95
    case 'order':
    case 'transaction': return 0.8
    case 'location': return 0.8
    case 'category': return 0.7
    default: return 0.85
  }
}

export interface CollectSearchTargetsInput {
  registries?: Map<string, PluginRegistryDef[]>
  queryEntities?: Array<{ key: string; entity: EntityDef; writable?: boolean }>
}

export function collectSearchTargets(input: CollectSearchTargetsInput = {}): SearchTarget[] {
  const index = buildDataToolIndex({
    registries: input.registries ?? new Map(),
    entities: getAllEntities(),
    registryToolName,
    entityToolName,
    queryEntities: input.queryEntities ?? [],
  })

  const targets: SearchTarget[] = []
  const seen = new Set<string>()
  for (const [indexKey, target] of index) {
    // The index holds each entity twice; only the `key:` twin carries the
    // stable identity the server index and route resolver speak.
    if (!indexKey.startsWith('key:')) continue
    const key = indexKey.slice(4)
    if (seen.has(key)) continue
    seen.add(key)

    const permission = target.entity.permission
    if (permission && !checkAccess(permission.feature, permission.action).allowed) continue

    targets.push({
      key,
      label: target.label,
      icon: target.entity.icon,
      entity: target.entity,
      mockData: target.mockData,
      boost: boostFor(target.entity),
    })
  }

  // Order only decides ties — a client should beat a category.
  return targets.sort((a, b) => (b.boost ?? 1) - (a.boost ?? 1) || a.key.localeCompare(b.key))
}
