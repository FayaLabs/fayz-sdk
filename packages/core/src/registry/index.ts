import type { ComponentType } from 'react'

// ---------------------------------------------------------------------------
// Uniform registry — the indirection layer that lets a pure-data AppManifest
// reference code by string id. Generalizes the entity registry pattern to
// components, blocks, pages, metrics, scaffolds and plugins.
//
// Naming convention: SDK/plugin artifacts use a namespaced id
// (`agenda.week-view`, `crud.detail-header`); app-local custom code uses the
// reserved `custom:` prefix (`custom:tannat.HarvestBoard`). The platform never
// generates `custom:` ids — they only come from an app's registry.tsx.
// ---------------------------------------------------------------------------

/** A JSON Schema object (loosely typed; validated by tooling, not at runtime). */
export type JsonSchema = Record<string, unknown>

export type RegistrySource = 'sdk' | 'plugin' | 'app'

export interface RegistryMeta {
  /** Human label for the platform editor. */
  label?: string
  description?: string
  /** Where this artifact came from (for introspection / conflict reporting). */
  source?: RegistrySource
  /** Owning plugin id, when source is 'plugin'. */
  pluginId?: string
  /** JSON Schema for this artifact's props/config — drives the visual editor
   *  and constrains AI generation. Optional but strongly encouraged. */
  propsSchema?: JsonSchema
}

export interface RegistryEntry<T> {
  id: string
  value: T
  meta: RegistryMeta
}

/** A typed, introspectable id→value map. Last registration wins (so an app's
 *  registry.tsx can override an SDK artifact by re-registering its id). */
export class Registry<T> {
  private readonly entries = new Map<string, RegistryEntry<T>>()

  constructor(readonly kind: string) {}

  register(id: string, value: T, meta: RegistryMeta = {}): void {
    this.entries.set(id, { id, value, meta })
  }

  get(id: string): T | undefined {
    return this.entries.get(id)?.value
  }

  getEntry(id: string): RegistryEntry<T> | undefined {
    return this.entries.get(id)
  }

  has(id: string): boolean {
    return this.entries.has(id)
  }

  list(): RegistryEntry<T>[] {
    return Array.from(this.entries.values())
  }

  ids(): string[] {
    return Array.from(this.entries.keys())
  }

  clear(): void {
    this.entries.clear()
  }
}

/** True for app-local custom artifacts (`custom:*`). */
export function isCustomId(id: string): boolean {
  return id.startsWith('custom:')
}

// ---------------------------------------------------------------------------
// Metric definitions (consumed by dashboard / reports / KPI panels).
// ---------------------------------------------------------------------------

export type MetricFormat = 'number' | 'currency' | 'percent' | 'duration' | 'rating'

export interface MetricContext {
  tenantId?: string
  /** ISO date range the metric should compute over, when applicable. */
  range?: { from: string; to: string }
  [key: string]: unknown
}

export interface MetricValue {
  value: number
  previousValue?: number
  trend?: 'up' | 'down' | 'flat'
}

export interface MetricDefinition {
  id: string
  label?: string
  category?: string
  format?: MetricFormat
  compute: (ctx: MetricContext) => Promise<MetricValue> | MetricValue
}

// ---------------------------------------------------------------------------
// Concrete registries. Components/blocks/pages/scaffolds hold React component
// types; metrics hold definitions; plugins hold opaque manifests (typed at the
// plugin layer to avoid a circular import).
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

export const componentRegistry = new Registry<AnyComponent>('component')
export const blockRegistry = new Registry<AnyComponent>('block')
export const pageRegistry = new Registry<AnyComponent>('page')
export const scaffoldRegistry = new Registry<AnyComponent>('scaffold')
export const metricRegistry = new Registry<MetricDefinition>('metric')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pluginRegistry = new Registry<any>('plugin')

// Thin functional facade (the public API surface) -----------------------------

export const registerComponent = (id: string, c: AnyComponent, meta?: RegistryMeta) =>
  componentRegistry.register(id, c, meta)
export const getComponent = (id: string) => componentRegistry.get(id)

export const registerBlock = (id: string, c: AnyComponent, meta?: RegistryMeta) =>
  blockRegistry.register(id, c, meta)
export const getBlock = (id: string) => blockRegistry.get(id)
export const listBlocks = () => blockRegistry.list()

export const registerPage = (id: string, c: AnyComponent, meta?: RegistryMeta) =>
  pageRegistry.register(id, c, meta)
export const getPage = (id: string) => pageRegistry.get(id)

export const registerScaffold = (id: string, c: AnyComponent, meta?: RegistryMeta) =>
  scaffoldRegistry.register(id, c, meta)
export const getScaffold = (id: string) => scaffoldRegistry.get(id)

export const registerMetric = (def: MetricDefinition, meta?: RegistryMeta) =>
  metricRegistry.register(def.id, def, meta)
export const getMetric = (id: string) => metricRegistry.get(id)
export const listMetrics = () => metricRegistry.list()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerPlugin = (id: string, manifest: any, meta?: RegistryMeta) =>
  pluginRegistry.register(id, manifest, meta)
export const getPlugin = (id: string) => pluginRegistry.get(id)
export const listPlugins = () => pluginRegistry.list()

// Plugin factories — a generated app registers each installed @fayz/plugin-*
// factory by id (src/plugins.generated.ts), so a scaffold can resolve a
// manifest's PluginRef (id + JSON config) to a live PluginManifest:
//   getPluginFactory(ref.id)?.(ref.config)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginFactory = (config?: Record<string, unknown>) => any
export const pluginFactoryRegistry = new Registry<PluginFactory>('plugin-factory')
export const registerPluginFactory = (id: string, factory: PluginFactory, meta?: RegistryMeta) =>
  pluginFactoryRegistry.register(id, factory, meta)
export const getPluginFactory = (id: string) => pluginFactoryRegistry.get(id)
export const listPluginFactories = () => pluginFactoryRegistry.list()
