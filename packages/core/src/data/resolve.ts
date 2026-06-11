import type { EntityDef } from '../types/crud'
import type { DataProvider } from './types'
import { getSupabaseClientOptional } from './supabase'
import { createSupabaseProvider } from './supabase'
import { createArchetypeProvider } from './archetype'
import { createMockProvider } from './mock'
import { withCache } from './cached'
import { getActiveTenantId } from '../tenant'

/**
 * Resolve the best data provider for an EntityDef.
 * Supabase → Archetype → Mock (in order of preference).
 *
 * Reusable by createCrudPage, PluginRegistryManager, or any component
 * that needs a DataProvider from an EntityDef.
 */
export function resolveDataProvider<T extends { id: string }>(
  entityDef: EntityDef<T>,
  mockData?: T[],
): DataProvider<T> {
  const client = getSupabaseClientOptional()

  if (client && entityDef.data?.table) {
    const tenantId = () => getActiveTenantId()
    const cacheOptions = {
      table: entityDef.data.table,
      tenantId,
      ttl: entityDef.data.cacheTTL,
    }

    if (entityDef.data.archetype && entityDef.data.archetypeKind && !entityDef.data.schema) {
      return withCache(createArchetypeProvider<T>({
        archetype: entityDef.data.archetype,
        archetypeKind: entityDef.data.archetypeKind,
        projectTable: entityDef.data.table,
        tenantId,
        searchColumns: entityDef.data.searchColumns ?? entityDef.fields
          .filter((field) => field.searchable)
          .map((field) => field.key),
      }), cacheOptions)
    }

    return withCache(createSupabaseProvider<T>(entityDef.data.table, {
      schema: entityDef.data.schema,
      tenantId: entityDef.data.tenantScoped === false ? undefined : tenantId,
      tenantIdColumn: entityDef.data.tenantIdColumn,
      searchColumns: entityDef.data.searchColumns ?? entityDef.fields
        .filter((field) => field.searchable)
        .map((field) => field.key),
      selectColumns: entityDef.data.selectColumns,
      columnMap: entityDef.data.columnMap,
      filters: entityDef.data.filters,
      defaults: entityDef.data.defaults,
    }), cacheOptions)
  }

  if (entityDef.data?.table) {
    console.warn(
      `[fayz/core] resolveDataProvider: falling back to mock for "${entityDef.name}" (table: ${entityDef.data.table}). ` +
      `Supabase client ${client ? 'available' : 'NOT initialized'}.`,
    )
  }
  return createMockProvider(entityDef, mockData)
}
