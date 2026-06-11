/* eslint-disable @typescript-eslint/no-explicit-any */
const inflight = new Map<string, Promise<any>>()
export function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const e = inflight.get(key); if (e) return e as Promise<T>
  const p = fn().finally(() => inflight.delete(key)); inflight.set(key, p); return p
}
