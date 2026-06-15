/**
 * Request deduplication — prevents duplicate in-flight requests with the same key.
 * If a request with the same key is already in-flight, returns the existing promise.
 */
const inflight = new Map<string, Promise<any>>()

export function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>

  const promise = fn().finally(() => {
    inflight.delete(key)
  })

  inflight.set(key, promise)
  return promise
}
