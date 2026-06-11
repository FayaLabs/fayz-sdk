import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@fayz/shop'
import { roundCents } from '../format'
import type { ResolvedStorefrontConfig } from '../config'

export interface CartLine {
  productId: string
  slug: string
  name: string
  sku: string | null
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
  addItem(product: Product, qty?: number): void
  setQuantity(productId: string, qty: number): void
  removeItem(productId: string): void
  applyDiscount(code: string, percent: number): void
  clearDiscount(): void
  clear(): void
  openDrawer(): void
  closeDrawer(): void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      discountCode: null,
      discountPercent: 0,
      isOpen: false,

      addItem: (product, qty = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === product.id)
          if (existing) {
            const nextQty = Math.min(existing.quantity + qty, existing.maxQuantity || Infinity)
            return {
              lines: state.lines.map((l) =>
                l.productId === product.id ? { ...l, quantity: nextQty } : l,
              ),
            }
          }
          const image = product.images.find((i) => i.isPrimary) ?? product.images[0]
          const line: CartLine = {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            sku: product.sku,
            unitPrice: product.price,
            quantity: Math.min(qty, product.inventoryCount || Infinity),
            imageUrl: image?.url ?? null,
            maxQuantity: product.inventoryCount,
          }
          return { lines: [...state.lines, line] }
        }),

      setQuantity: (productId, qty) =>
        set((state) => {
          if (qty <= 0) return { lines: state.lines.filter((l) => l.productId !== productId) }
          return {
            lines: state.lines.map((l) =>
              l.productId === productId
                ? { ...l, quantity: Math.min(qty, l.maxQuantity || Infinity) }
                : l,
            ),
          }
        }),

      removeItem: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

      applyDiscount: (code, percent) => set({ discountCode: code, discountPercent: percent }),
      clearDiscount: () => set({ discountCode: null, discountPercent: 0 }),
      clear: () => set({ lines: [], discountCode: null, discountPercent: 0 }),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
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

export const selectShipping = (
  s: Pick<CartState, 'lines'>,
  cfg: ResolvedStorefrontConfig,
): number => {
  if (s.lines.length === 0) return 0
  const subtotal = selectSubtotal(s)
  if (cfg.shipping.freeAbove != null && subtotal >= cfg.shipping.freeAbove) return 0
  return cfg.shipping.flatRate
}

export const selectTotal = (
  s: Pick<CartState, 'lines' | 'discountPercent'>,
  cfg: ResolvedStorefrontConfig,
): number =>
  roundCents(selectSubtotal(s) - selectDiscountTotal(s) + selectShipping(s, cfg))
