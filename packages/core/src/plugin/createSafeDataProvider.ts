/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseClientOptional } from '../data/supabase'

/**
 * createSafeDataProvider — the standard lazy provider resolver every plugin
 * repeated by hand. Returns a Proxy that, on first method call, resolves to the
 * Supabase-backed provider when a Supabase client is configured, otherwise the
 * mock provider. Resolution is deferred so importing a plugin never forces a
 * Supabase connection, and memoized so it only happens once.
 *
 *   const provider = options?.dataProvider ?? createSafeDataProvider(
 *     () => createSupabaseCrmProvider(providerOptions),
 *     () => createMockCrmProvider(),
 *   )
 */
export function createSafeDataProvider<T extends object>(
  makeSupabase: () => T,
  makeMock: () => T,
): T {
  let resolved: T | null = null
  const get = (): T => {
    if (!resolved) {
      resolved = getSupabaseClientOptional() ? makeSupabase() : makeMock()
    }
    return resolved
  }
  return new Proxy({} as T, {
    get: (_target, prop) => (...args: any[]) => (get() as any)[prop](...args),
  })
}
