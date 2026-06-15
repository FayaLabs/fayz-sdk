import type { FieldDef, EntityDef } from '../types/crud'
import type { EntityArchetype } from '../types/entities'

export interface RegisteredEntity {
  entityKey: string
  label: string
  labelPlural: string
  icon: string
  fields: FieldDef[]
  source: 'page' | 'plugin'
  archetype?: EntityArchetype
  pluginId?: string
  pluginName?: string
  pluginIcon?: string
}

const registry = new Map<string, RegisteredEntity>()

export function deriveEntityKey(entityDef: EntityDef): string {
  if (entityDef.data?.archetypeKind) {
    return `${entityDef.data.archetype ?? ''}:${entityDef.data.archetypeKind}`
  }
  if (entityDef.data?.archetype) {
    return entityDef.data.archetype
  }
  return entityDef.data?.table ?? entityDef.name
}

export function registerEntity(entity: RegisteredEntity): void {
  registry.set(entity.entityKey, entity)
}

export function getRegisteredEntities(): RegisteredEntity[] {
  return Array.from(registry.values())
}

export function getEntityByKey(key: string): RegisteredEntity | undefined {
  return registry.get(key)
}
