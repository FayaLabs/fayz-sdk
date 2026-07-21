import type { EntityDef } from '../types/crud'
import type { EntityArchetype } from '../types/entities'

export interface RegisteredEntity {
  entityKey: string
  label: string
  labelPlural: string
  icon?: string
  fields: EntityDef['fields']
  source: 'app' | 'plugin'
  /**
   * The definition itself, so consumers that need to *read* the entity — the AI
   * tool executor resolving a data provider — are not limited to the display
   * metadata. Optional: registrations made before this existed omit it.
   */
  entityDef?: EntityDef
  mockData?: Array<{ id: string }>
  archetype?: EntityArchetype
  pluginId?: string
  pluginName?: string
  pluginIcon?: string
}

const entityRegistry = new Map<string, RegisteredEntity>()

export function registerEntity(entry: RegisteredEntity): void {
  entityRegistry.set(entry.entityKey, entry)
}

export function getEntityByKey(key: string): RegisteredEntity | undefined {
  return entityRegistry.get(key)
}

export function getAllEntities(): RegisteredEntity[] {
  return Array.from(entityRegistry.values())
}

export function clearEntityRegistry(): void {
  entityRegistry.clear()
}

export function deriveEntityKey(entityDef: EntityDef): string {
  const name = entityDef.name.toLowerCase().replace(/\s+/g, '-')
  if (entityDef.data?.archetype && entityDef.data?.archetypeKind) {
    return `${entityDef.data.archetype}:${entityDef.data.archetypeKind}`
  }
  if (entityDef.data?.archetype) return entityDef.data.archetype
  return name
}
