import * as React from 'react'

// ---------------------------------------------------------------------------
// Event bus — the substrate for cross-plugin behavior. Replaces the bespoke
// `window.dispatchEvent('agenda:open-booking')` hack and the imperative
// financial bridge: plugins emit named events, others subscribe, and the
// AppManifest can declare event→action bindings as data. Plugins describe the
// events they emit via PluginManifest.events (see types/plugins) so the
// platform can introspect and wire automations.
// ---------------------------------------------------------------------------

export type EventHandler<T = unknown> = (payload: T) => void

export interface EventBus {
  emit<T = unknown>(event: string, payload?: T): void
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void
  off<T = unknown>(event: string, handler: EventHandler<T>): void
  clear(event?: string): void
}

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>()
  const bus: EventBus = {
    emit(event, payload) {
      const set = handlers.get(event)
      if (!set) return
      // Snapshot so handlers can subscribe/unsubscribe during dispatch.
      for (const handler of Array.from(set)) {
        try {
          handler(payload)
        } catch (err) {
          // A misbehaving subscriber must not break the emitter or its peers.
          console.error(`[fayz] event handler for "${event}" threw:`, err)
        }
      }
    },
    on(event, handler) {
      let set = handlers.get(event)
      if (!set) {
        set = new Set()
        handlers.set(event, set)
      }
      set.add(handler as EventHandler)
      return () => bus.off(event, handler)
    },
    once(event, handler) {
      const wrapped: EventHandler = (payload) => {
        bus.off(event, wrapped)
        ;(handler as EventHandler)(payload)
      }
      return bus.on(event, wrapped)
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler as EventHandler)
    },
    clear(event) {
      if (event) handlers.delete(event)
      else handlers.clear()
    },
  }
  return bus
}

/** The app-wide default bus. One per app runtime (repo-per-app). */
export const eventBus: EventBus = createEventBus()

/** Subscribe to an event for the lifetime of the component. The latest handler
 *  is always invoked, so closures over fresh props/state work without resubscribing. */
export function useOnEvent<T = unknown>(
  event: string,
  handler: EventHandler<T>,
  deps: React.DependencyList = [],
): void {
  const ref = React.useRef(handler)
  ref.current = handler
  React.useEffect(
    () => eventBus.on<T>(event, (payload) => ref.current(payload)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event, ...deps],
  )
}
