import { getShopProvider } from './runtime'
import type { ShopProvider } from './provider'
import type {
  CartTotals, DiscountValidation, InventoryCheck, InventoryIssue, InventoryLine, Order,
} from './types'

// ---------------------------------------------------------------------------
// Commerce primitive APIs (FAY-1193)
//
// Provider-agnostic helpers that custom app workflows call instead of re-deriving
// discount/inventory/total logic. They take an explicit ShopProvider (default:
// the configured runtime provider) so they work the same against mock or Supabase.
//
// NOTE: when run in the browser these compute the *advisory* answer (UI preview).
// The authoritative values are recomputed server-side in the shop_place_order RPC
// — the browser can never set what it pays.
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Validate a discount code against the provider: existence, status, date window, usage limit, supported type. */
export async function validateDiscount(
  input: { code: string; subtotal?: number; customerId?: string },
  provider: ShopProvider = getShopProvider(),
): Promise<DiscountValidation> {
  const code = input.code.trim()
  if (!code) return { valid: false, code: null, type: null, value: 0, reason: 'empty' }

  const list = await provider.listDiscounts({ status: 'active' })
  const discount = list.find((d) => (d.code ?? '').toUpperCase() === code.toUpperCase())
  if (!discount) return { valid: false, code: null, type: null, value: 0, reason: 'not_found' }

  const now = new Date().toISOString()
  if (discount.startsAt > now) return { valid: false, code: discount.code, type: discount.type, value: 0, reason: 'not_started' }
  if (discount.endsAt && discount.endsAt < now) return { valid: false, code: discount.code, type: discount.type, value: 0, reason: 'expired' }
  if (discount.usageLimit != null && discount.timesUsed >= discount.usageLimit) {
    return { valid: false, code: discount.code, type: discount.type, value: 0, reason: 'usage_limit' }
  }
  if (discount.type !== 'percentage' && discount.type !== 'fixed_amount') {
    return { valid: false, code: discount.code, type: discount.type, value: 0, reason: 'unsupported' }
  }
  return { valid: true, code: discount.code, type: discount.type, value: discount.value }
}

/** Apply a validated discount to a subtotal, clamped to [0, subtotal]. Pure. */
export function applyDiscount(validation: DiscountValidation, subtotal: number): { discountTotal: number; code: string | null } {
  if (!validation.valid) return { discountTotal: 0, code: null }
  if (validation.type === 'percentage') {
    return { discountTotal: round2(Math.min(subtotal, (subtotal * validation.value) / 100)), code: validation.code }
  }
  if (validation.type === 'fixed_amount') {
    return { discountTotal: round2(Math.min(subtotal, validation.value)), code: validation.code }
  }
  return { discountTotal: 0, code: validation.code }
}

/** Report out-of-stock / unavailable lines against current catalog inventory. No mutation. */
export async function checkInventory(
  lines: InventoryLine[],
  provider: ShopProvider = getShopProvider(),
): Promise<InventoryCheck> {
  const issues: InventoryIssue[] = []
  for (const line of lines) {
    const product = await provider.getProduct(line.productId)
    if (!product || product.status !== 'active') {
      issues.push({ productId: line.productId, name: product?.name ?? line.productId, requested: line.quantity, available: 0 })
      continue
    }
    if (product.inventoryCount < line.quantity) {
      issues.push({ productId: line.productId, name: product.name, requested: line.quantity, available: product.inventoryCount })
    }
  }
  return { ok: issues.length === 0, issues }
}

/**
 * Recompute cart totals from authoritative catalog prices (ignores any client
 * unitPrice), applying a validated discount and shipping. Tax is 0 in v1 (hook).
 */
export async function computeCartTotals(
  input: { lines: InventoryLine[]; discountCode?: string; customerId?: string; shipping?: number },
  provider: ShopProvider = getShopProvider(),
): Promise<CartTotals> {
  const lines: CartTotals['lines'] = []
  let subtotal = 0
  for (const line of input.lines) {
    const product = await provider.getProduct(line.productId)
    if (!product) continue
    const lineTotal = round2(product.price * line.quantity)
    subtotal += lineTotal
    lines.push({ productId: product.id, name: product.name, sku: product.sku, unitPrice: product.price, quantity: line.quantity, lineTotal })
  }
  subtotal = round2(subtotal)

  let discountTotal = 0
  let discountCode: string | null = null
  if (input.discountCode) {
    const applied = applyDiscount(
      await validateDiscount({ code: input.discountCode, subtotal, customerId: input.customerId }, provider),
      subtotal,
    )
    discountTotal = applied.discountTotal
    discountCode = applied.code
  }

  const shippingTotal = round2(Math.max(input.shipping ?? 0, 0))
  const taxTotal = 0
  const total = round2(Math.max(subtotal - discountTotal + shippingTotal + taxTotal, 0))
  return { lines, subtotal, discountTotal, discountCode, taxTotal, shippingTotal, total }
}

/** A customer's orders (scoped by id; RLS-enforced to the owner on Supabase). */
export async function getCustomerOrders(
  customerId: string,
  provider: ShopProvider = getShopProvider(),
): Promise<Order[]> {
  return provider.listOrders({ customerId, limit: 100 })
}
