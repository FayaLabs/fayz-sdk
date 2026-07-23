import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@fayz-ai/shop/types'
import { roundCents } from '../format'
import type { ResolvedStorefrontConfig } from '../config'
import { useDeliveryStore, selectQuotedShipping } from './delivery.store'
import {
  formatProductOptionSelection,
  normalizeProductOptionSelection,
  productOptionSelectionKey,
  type ProductOptionSelection,
} from '../product-options'

export interface CartLine {
  lineId: string
  productId: string
  slug: string
  name: string
  sku: string | null
  options: ProductOptionSelection
  optionsLabel: string
  unitPrice: number
  quantity: number
  imageUrl: string | null
  /** inventoryCount at add time — clamps quantity */
  maxQuantity: number
}

export interface CartState {
  lines: CartLine[]
  discountCode: string | null
  discountPercent: number
  isOpen: boolean
  /** Line most recently added — lets the drawer briefly highlight it. */
  justAddedLineId: string | null
  addItem(product: Product, qty?: number, options?: ProductOptionSelection): void
  setQuantity(lineId: string, qty: number): void
  removeItem(lineId: string): void
  applyDiscount(code: string, percent: number): void
  clearDiscount(): void
  clear(): void
  openDrawer(): void
  closeDrawer(): void
  /** Drop persisted lines the active backend can no longer resolve (e.g. a cart
   *  built in an earlier mock-mode session, whose ids don't exist live). The
   *  resolver returns false only for a definitive "not found"; on error it must
   *  return true so a transient failure never discards a legit line. */
  reconcile(resolve: (line: CartLine) => Promise<boolean>): Promise<void>
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      discountCode: null,
      discountPercent: 0,
      isOpen: false,
      justAddedLineId: null,

      addItem: (product, qty = 1, options) =>
        set((state) => {
          const normalizedOptions = normalizeProductOptionSelection(options)
          const optionKey = productOptionSelectionKey(normalizedOptions)
          const lineId = optionKey ? `${product.id}:${optionKey}` : product.id
          const existing = state.lines.find((l) => (l.lineId ?? l.productId) === lineId)
          if (existing) {
            const nextQty = Math.min(existing.quantity + qty, existing.maxQuantity || Infinity)
            return {
              // Auto-open the cart on add — the standard premium "slide-in cart"
              // signal — and flag the line so the drawer can highlight it.
              isOpen: true,
              justAddedLineId: lineId,
              lines: state.lines.map((l) =>
                (l.lineId ?? l.productId) === lineId ? { ...l, lineId, quantity: nextQty } : l,
              ),
            }
          }
          const image = product.images.find((i) => i.isPrimary) ?? product.images[0]
          const line: CartLine = {
            lineId,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            sku: product.sku,
            options: normalizedOptions,
            optionsLabel: formatProductOptionSelection(normalizedOptions),
            unitPrice: product.price,
            quantity: Math.min(qty, product.inventoryCount || Infinity),
            imageUrl: image?.url ?? null,
            maxQuantity: product.inventoryCount,
          }
          return { isOpen: true, justAddedLineId: lineId, lines: [...state.lines, line] }
        }),

      setQuantity: (lineId, qty) =>
        set((state) => {
          if (qty <= 0) return { lines: state.lines.filter((l) => (l.lineId ?? l.productId) !== lineId) }
          return {
            lines: state.lines.map((l) =>
              (l.lineId ?? l.productId) === lineId
                ? { ...l, quantity: Math.min(qty, l.maxQuantity || Infinity) }
                : l,
            ),
          }
        }),

      removeItem: (lineId) =>
        set((state) => ({ lines: state.lines.filter((l) => (l.lineId ?? l.productId) !== lineId) })),

      applyDiscount: (code, percent) => set({ discountCode: code, discountPercent: percent }),
      clearDiscount: () => set({ discountCode: null, discountPercent: 0 }),
      clear: () => set({ lines: [], discountCode: null, discountPercent: 0 }),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false, justAddedLineId: null }),

      reconcile: async (resolve) => {
        const lines = get().lines
        if (lines.length === 0) return
        const keep = await Promise.all(
          lines.map((line) => resolve(line).catch(() => true)),
        )
        const kept = lines.filter((_, i) => keep[i])
        if (kept.length !== lines.length) set({ lines: kept })
      },
    }),
    {
      name: 'fayz.storefront.cart.v1',
      partialize: (state) => ({
        lines: state.lines,
        discountCode: state.discountCode,
        discountPercent: state.discountPercent,
      }),
    },
  ),
)

// ---------------------------------------------------------------------------
// Money selectors — the single place cart math happens. Checkout passes these
// exact values to createOrder so drawer totals always match order totals.
// ---------------------------------------------------------------------------

export const selectCount = (s: Pick<CartState, 'lines'>): number =>
  s.lines.reduce((n, l) => n + l.quantity, 0)

export const selectSubtotal = (s: Pick<CartState, 'lines'>): number =>
  roundCents(s.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0))

export const selectDiscountTotal = (s: Pick<CartState, 'lines' | 'discountPercent'>): number =>
  roundCents(selectSubtotal(s) * (s.discountPercent / 100))

/**
 * Freight to display.
 *
 * When the shopper has given a CEP and the store quoted it, that quote wins —
 * it came from the same shipping_zones rows shop_place_order will charge from.
 * Otherwise this falls back to the store-wide rate in config, which is what
 * every storefront did before zones existed.
 *
 * The subtotal is PRE-discount on both sides of this. That is 0017's rule, and
 * the quote is requested against the same number, so a coupon can never make
 * the cart and the order disagree.
 *
 * Read through getState() rather than a hook because this is a plain selector
 * called from several screens; components that render the value subscribe to
 * useDeliveryStore themselves so a fresh quote re-renders them.
 */
export const selectShipping = (
  s: Pick<CartState, 'lines'>,
  cfg: ResolvedStorefrontConfig,
): number => {
  if (s.lines.length === 0) return 0
  const subtotal = selectSubtotal(s)

  const quoted = selectQuotedShipping(useDeliveryStore.getState(), subtotal)
  if (quoted != null) return quoted

  if (cfg.shipping.freeAbove != null && subtotal >= cfg.shipping.freeAbove) return 0
  return cfg.shipping.flatRate
}

export const selectTotal = (
  s: Pick<CartState, 'lines' | 'discountPercent'>,
  cfg: ResolvedStorefrontConfig,
): number =>
  roundCents(selectSubtotal(s) - selectDiscountTotal(s) + selectShipping(s, cfg))
