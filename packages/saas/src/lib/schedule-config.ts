// ---------------------------------------------------------------------------
// Schedule Block Config Registry
// Lightweight global config — set by the agenda plugin, read by ScheduleEditor.
// No React context needed. Graceful degradation when not configured.
// ---------------------------------------------------------------------------

export interface ScheduleBlockConfig {
  defaults: {
    bufferMinutes: number
    maxConcurrent: number
    minAdvanceHours: number
    maxAdvanceDays: number
  }
  /** Available services for the multi-select filter. */
  services?: { id: string; name: string }[]
  showServices?: boolean
  showConcurrent?: boolean
  showBookingWindow?: boolean
  /** Available locations for per-block assignment. */
  locations?: { id: string; name: string }[]
  showLocations?: boolean
  /** Lazy fetcher — called when locations are needed but not yet loaded. */
  fetchLocations?: () => Promise<{ id: string; name: string }[]>
}

let globalConfig: ScheduleBlockConfig | null = null
const listeners = new Set<() => void>()

export function setScheduleBlockConfig(config: ScheduleBlockConfig): void {
  globalConfig = config
  listeners.forEach((fn) => fn())
}

export function getScheduleBlockConfig(): ScheduleBlockConfig | null {
  return globalConfig
}

/** Subscribe to config changes. Returns unsubscribe function. */
export function subscribeScheduleBlockConfig(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
