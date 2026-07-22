import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { lookupPostalCode, normalizePostalCode, type PostalAddress } from '@fayz-ai/core'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import type { ShippingQuoteOption } from '@fayz-ai/shop/types'

/**
 * Where the shopper wants it delivered, decided before the cart exists.
 *
 * Two different things live here and they are persisted differently on purpose:
 *
 *   the ADDRESS is durable — a CEP maps to the same street for years, and
 *   carrying it to checkout is the whole point (the buyer types the number and
 *   nothing else);
 *
 *   the QUOTE is not persisted at all. It is a price, and a price restored from
 *   localStorage is a price the shopper can edit with devtools. It is re-asked
 *   on demand, and resolved for the current cart through resolveOptionRate —
 *   the same rule shop_shipping_for applies — so it can never go stale. The
 *   order is charged from shop_place_order, which recomputes from the same
 *   zones and ignores anything the client sends.
 */

export type DeliveryStatus = 'idle' | 'loading' | 'served' | 'unserved' | 'error'

export interface DeliveryState {
  postalCode: string
  address: PostalAddress | null
  options: ShippingQuoteOption[]
  selectedZoneId: string | null
  status: DeliveryStatus
  error: string | null

  /** Look the CEP up and quote it. `subtotal` decides free-above thresholds. */
  resolve: (postalCode: string, subtotal: number) => Promise<void>
  selectZone: (zoneId: string) => void
  clear: () => void
}

const EMPTY = {
  postalCode: '',
  address: null,
  options: [] as ShippingQuoteOption[],
  selectedZoneId: null,
  status: 'idle' as DeliveryStatus,
  error: null,
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      async resolve(postalCode: string, subtotal: number) {
        const code = normalizePostalCode(postalCode)
        if (code.length !== 8) {
          set({ ...EMPTY, postalCode, status: 'error', error: 'Digite os 8 dígitos do CEP.' })
          return
        }

        set({ postalCode: code, status: 'loading', error: null })

        // The QUOTE comes first and is the answer that matters. Whether we
        // deliver to a postcode, and for how much, is decided entirely by our
        // own zones against eight digits — it does not need to know the street.
        //
        // Doing it the other way round made the delivery answer depend on a
        // third party: with ViaCEP slow or rate-limited, a perfectly serviceable
        // address reported an error instead of a price.
        let options: ShippingQuoteOption[] = []
        try {
          options = (await getShopProvider().quoteShipping?.(code, subtotal)) ?? []
        } catch {
          set({ ...EMPTY, postalCode: code, status: 'error',
                error: 'Não foi possível calcular o frete agora. Tente de novo.' })
          return
        }

        // The ADDRESS is the convenience layer: it saves the buyer typing, and
        // losing it costs typing, not the sale. Failures here never change the
        // delivery verdict already decided above.
        let address: PostalAddress | null = null
        let notFound = false
        try {
          address = await lookupPostalCode(code)
          notFound = address === null
        } catch {
          address = null
        }

        set({
          postalCode: code,
          address,
          options,
          selectedZoneId: options[0]?.zoneId ?? null,
          // A store with no zones configured quotes nothing, and that must NOT
          // read as "we don't deliver here" — it falls back to the store-wide
          // flat rate, which the cart already knows how to show.
          status: options.length > 0 ? 'served' : 'unserved',
          // Reported alongside the price, not instead of it: the CEP may be
          // mistyped even though its range is covered.
          error: notFound ? 'CEP não encontrado. Confira os números.' : null,
        })
      },

      selectZone(zoneId: string) {
        if (get().options.some((option) => option.zoneId === zoneId)) set({ selectedZoneId: zoneId })
      },

      clear() {
        set({ ...EMPTY })
      },
    }),
    {
      name: 'fayz.storefront.delivery.v1',
      // Deliberately NOT persisting `options`: a rehydrated
      // price would be shown as current without anything having quoted it. The
      // address survives, the money is asked for again.
      partialize: (state) => ({ postalCode: state.postalCode, address: state.address }),
      onRehydrateStorage: () => (state) => {
        if (state?.address) state.status = 'idle'
      },
    },
  ),
)

/**
 * The freight for the chosen zone at THIS subtotal, or null when there is no
 * zone in play (no CEP yet, or a store that configured none) and the caller
 * should use the store-wide rate. Null never means free.
 *
 * The free-above rule is applied here rather than trusting the `rate` the
 * server resolved, because that one was resolved for whatever the cart held at
 * quote time. Re-deriving from `baseRate`/`freeAbove` — the same CASE
 * shop_shipping_for runs — means adding an item can never leave a stale price
 * on screen. An earlier version fell back to the config flat rate when the
 * quote went stale, which showed R$ 8 (the flat rate) for an address in an
 * R$ 18 zone: shown one number, charged another.
 */
export function resolveOptionRate(option: ShippingQuoteOption, subtotal: number): number {
  if (option.freeAbove != null && subtotal >= option.freeAbove) return 0
  return option.baseRate
}

export const selectQuotedShipping = (
  state: Pick<DeliveryState, 'options' | 'selectedZoneId' | 'status'>,
  subtotal: number,
): number | null => {
  if (state.status !== 'served') return null
  const option = state.options.find((o) => o.zoneId === state.selectedZoneId) ?? state.options[0]
  return option ? resolveOptionRate(option, subtotal) : null
}
