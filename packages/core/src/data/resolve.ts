import type { EntityDef } from '../types/crud'
import type { BackendRef } from '../manifest'
import type { DataProvider } from './types'
import { getSupabaseClientOptional } from './supabase'
import { createSupabaseProvider } from './supabase'
import { createArchetypeProvider } from './archetype'
import { createMockProvider } from './mock'
import { createFayzApiProvider, type FayzApiProviderConfig } from './platform-api'
import { withCache } from './cached'
import { getActiveTenantId } from '../tenant'

/**
 * Resolve the best data provider for an EntityDef.
 * Supabase → Archetype → Mock (in order of preference).
 *
 * Reusable by createCrudPage, PluginRegistryManager, or any component
 * that needs a DataProvider from an EntityDef.
 */
export interface ResolveDataProviderOptions {
  backend?: BackendRef
  fayzApi?: Omit<FayzApiProviderConfig, 'entityKey' | 'table'>
  customProviders?: Record<string, <T extends { id: string }>(entityDef: EntityDef<T>, mockData?: T[]) => DataProvider<T>>
}

export function resolveDataProvider<T extends { id: string }>(
  entityDef: EntityDef<T>,
  mockData?: T[],
  options: ResolveDataProviderOptions = {},
): DataProvider<T> {
  const backend = options.backend

  if (backend?.provider === 'mock') {
    return createMockProvider(entityDef, mockData)
  }

  if (backend?.provider === 'fayz-api') {
    const table = entityDef.data?.table ?? entityDef.name
    return createFayzApiProvider<T>(table, {
      ...options.fayzApi,
      baseUrl: options.fayzApi?.baseUrl ?? backend.url,
      projectId: options.fayzApi?.projectId ?? backend.projectRef,
      entityKey: entityDef.name ?? table,
      table,
      schema: options.fayzApi?.schema ?? entityDef.data?.schema,
      idColumn: options.fayzApi?.idColumn ?? entityDef.data?.columnMap?.id,
      searchColumns: options.fayzApi?.searchColumns ?? entityDef.data?.searchColumns ?? entityDef.fields
        .filter((field) => field.searchable)
        .map((field) => field.key),
      tenantIdColumn: entityDef.data?.tenantScoped === false
        ? false
        : options.fayzApi?.tenantIdColumn ?? entityDef.data?.tenantIdColumn,
      tenantId: options.fayzApi?.tenantId ?? (() => getActiveTenantId()),
    })
  }

  if (backend?.provider === 'custom') {
    const adapterId = backend.adapterId
    const factory = adapterId ? options.customProviders?.[adapterId] : undefined
    if (!adapterId || !factory) {
      throw new Error(`[@fayz-ai/core] Custom data provider "${adapterId ?? 'unknown'}" is not registered.`)
    }
    return factory<T>(entityDef, mockData)
  }

  const client = getSupabaseClientOptional()

  if (client && entityDef.data?.table) {
    const tenantId = () => getActiveTenantId()
    // Archetype entities share a physical table (e.g. people) across kinds
    // (student/teacher/staff…). The cache key must carry the kind or the first
    // kind's resultset is served to every sibling entity (teachers page
    // listing students).
    const cacheOptions = {
      table: entityDef.data.archetypeKind
        ? `${entityDef.data.table}#${entityDef.data.archetypeKind}`
        : entityDef.data.table,
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
