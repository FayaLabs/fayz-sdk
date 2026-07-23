// ---------------------------------------------------------------------------
// Postal code → address lookup (SDK-level — shared by any surface that collects
// an address: storefront checkout, the SaaS address book, CRM, booking).
//
// Sits beside ./phone for the same reason: knowing that a Brazilian CEP is
// eight digits, and that '01310100' means Avenida Paulista, is not a
// storefront concern. It belongs wherever an address is typed.
//
// The lookup itself is behind an interface. ViaCEP is the default because it is
// free, keyless and CORS-enabled, but it is a third party the merchant does not
// control — so swapping it for an edge-function proxy (shared cache, no
// third-party call from the shopper's browser) must be one line, not a rewrite.
// ---------------------------------------------------------------------------

/**
 * An address as a postal service knows it: everything except the parts only the
 * resident can supply (number, complement).
 *
 * Field names mirror ShippingAddressInput in @fayz-ai/shop so the value crosses
 * from lookup to checkout to the order with no translation step in between.
 */
export interface PostalAddress {
  postalCode: string
  street: string
  district: string
  city: string
  state: string
  country: string
  /** IBGE municipality code when the source provides one — useful for tax later. */
  cityCode?: string
}

/** Where a postal code is resolved. Implementations must not throw for a
 *  well-formed code that simply does not exist — that is `null`, not an error. */
export interface PostalLookupProvider {
  lookup(postalCode: string): Promise<PostalAddress | null>
}

/** Keep only digits. */
export function normalizePostalCode(value: string): string {
  return (value || '').replace(/\D/g, '')
}

/** '01310100' | '01310-100' -> '01310-100'. Partial input formats progressively. */
export function formatPostalCode(value: string): string {
  const digits = normalizePostalCode(value).slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

/** A Brazilian CEP is exactly eight digits. */
export function isValidPostalCode(value: string): boolean {
  return normalizePostalCode(value).length === 8
}

// ---------------------------------------------------------------------------
// Cache
//
// A CEP maps to the same street for years, so the second lookup of one should
// never leave the browser. This also keeps a busy storefront well clear of
// ViaCEP's per-IP rate limit. localStorage when there is a window, an in-memory
// Map otherwise (SSR, tests, node) — never a hard failure over a cache miss.
// ---------------------------------------------------------------------------

const CACHE_KEY = 'fayz.postal.cache.v1'
const memoryCache = new Map<string, PostalAddress>()

function readCache(code: string): PostalAddress | undefined {
  const hit = memoryCache.get(code)
  if (hit) return hit
  try {
    const raw = globalThis.localStorage?.getItem(CACHE_KEY)
    if (!raw) return undefined
    const all = JSON.parse(raw) as Record<string, PostalAddress>
    const stored = all[code]
    if (stored) memoryCache.set(code, stored)
    return stored
  } catch {
    return undefined
  }
}

function writeCache(code: string, address: PostalAddress): void {
  memoryCache.set(code, address)
  try {
    const store = globalThis.localStorage
    if (!store) return
    const raw = store.getItem(CACHE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, PostalAddress>) : {}
    all[code] = address
    store.setItem(CACHE_KEY, JSON.stringify(all))
  } catch {
    /* quota or private mode — the in-memory copy still stands for this session */
  }
}

/** Drop the cache. Exposed for tests and for a "wrong address?" escape hatch. */
export function clearPostalCache(): void {
  memoryCache.clear()
  try {
    globalThis.localStorage?.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// ViaCEP
// ---------------------------------------------------------------------------

interface ViaCepResponse {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  ibge?: string
  erro?: boolean | string
}

/**
 * ViaCEP (https://viacep.com.br). Free, no key, CORS-enabled.
 *
 * The trap: an unknown CEP does NOT come back as 404. ViaCEP answers HTTP 200
 * with `{"erro": true}` (and, on some deploys, the string "true"), so checking
 * response.ok alone yields an address of empty strings that silently overwrites
 * whatever the shopper had typed. Both shapes are treated as "not found".
 */
export function createViaCepProvider(options?: { fetcher?: typeof fetch }): PostalLookupProvider {
  const fetcher = options?.fetcher ?? globalThis.fetch
  return {
    async lookup(postalCode: string): Promise<PostalAddress | null> {
      const code = normalizePostalCode(postalCode)
      if (code.length !== 8) return null

      const response = await fetcher(`https://viacep.com.br/ws/${code}/json/`)
      if (!response.ok) throw new Error(`Consulta de CEP falhou (${response.status})`)

      const data = (await response.json()) as ViaCepResponse
      if (data.erro === true || data.erro === 'true' || !data.localidade) return null

      return {
        postalCode: code,
        street: data.logradouro ?? '',
        district: data.bairro ?? '',
        city: data.localidade,
        state: (data.uf ?? '').toUpperCase(),
        country: 'BR',
        cityCode: data.ibge || undefined,
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Module-level resolver — same shape as setShopTenantResolver /
// setShopAccessTokenResolver, so an app overrides the source once at boot
// instead of threading a provider through every component that needs a CEP.
// ---------------------------------------------------------------------------

let _provider: PostalLookupProvider | null = null

export function setPostalLookupProvider(provider: PostalLookupProvider | null): void {
  _provider = provider
}

export function getPostalLookupProvider(): PostalLookupProvider {
  if (!_provider) _provider = createViaCepProvider()
  return _provider
}

/**
 * Resolve a postal code to an address, through the cache.
 *
 * Returns null for a code that is malformed or does not exist; throws only when
 * the lookup itself failed (offline, provider down), so a caller can tell
 * "no such CEP" from "we could not check right now" and say the right thing.
 */
export async function lookupPostalCode(postalCode: string): Promise<PostalAddress | null> {
  const code = normalizePostalCode(postalCode)
  if (code.length !== 8) return null

  const cached = readCache(code)
  if (cached) return cached

  const address = await getPostalLookupProvider().lookup(code)
  if (address) writeCache(code, address)
  return address
}
