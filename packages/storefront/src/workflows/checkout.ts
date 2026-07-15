import { getShopProvider } from '@fayz-ai/shop/runtime'
import type { Order } from '@fayz-ai/shop/types'
import { establishCustomerSession } from '../auth'
import type { ResolvedStorefrontConfig } from '../config'
import type { CartState } from '../stores/cart.store'
import { selectShipping } from '../stores/cart.store'
import type { SessionState } from '../stores/session.store'

export interface StorefrontCheckoutCustomer {
  email: string
  name: string
}

export interface StorefrontCheckoutAddress {
  street?: string
  city?: string
  zip?: string
  notes?: string
}

export interface PlaceStorefrontOrderInput {
  config: ResolvedStorefrontConfig
  cart: Pick<CartState, 'lines' | 'discountCode' | 'discountPercent'>
  session?: Pick<SessionState, 'customerId' | 'email'>
  customer: StorefrontCheckoutCustomer
  address?: StorefrontCheckoutAddress
  markPaid?: boolean
}

export interface PlaceStorefrontOrderResult {
  order: Order
  customerId: string
}

function formatDeliveryNotes(address: StorefrontCheckoutAddress | undefined): string | undefined {
  if (!address) return undefined
  if (address.notes?.trim()) return address.notes.trim()

  const parts = [address.street, address.city, address.zip]
    .map((part) => part?.trim())
    .filter(Boolean)

  return parts.length > 0 ? `Entrega: ${parts.join(', ')}` : undefined
}

/**
 * Storefront checkout primitive for custom/generated checkout screens.
 * It owns the order payload math and customer-session handshake so app-owned
 * routes can customize UX without copying provider/business logic.
 */
export async function placeStorefrontOrder({
  config,
  cart,
  session,
  customer,
  address,
  markPaid = false,
}: PlaceStorefrontOrderInput): Promise<PlaceStorefrontOrderResult> {
  const email = customer.email.trim().toLowerCase()
  const name = customer.name.trim()
  const provider = getShopProvider()

  let customerId = session?.customerId ?? null
  if (!customerId || session?.email !== email) {
    const established = await establishCustomerSession(email, { name })
    customerId = established.customerId
  }

  // Trusted placement: send only product ids + quantities. The provider
  // (shop_place_order RPC on Supabase, in-memory provider in mock) re-reads
  // prices, validates the discount, and decrements inventory server-side.
  const order = await provider.placeOrder({
    customerId: customerId ?? undefined,
    customer: { name, email },
    currency: config.currency,
    notes: formatDeliveryNotes(address),
    discountCode: cart.discountCode ?? undefined,
    shippingTotal: selectShipping(cart, config),
    items: cart.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      optionsLabel: line.optionsLabel || undefined,
    })),
  })

  if (markPaid) {
    // Prefer the RPC seam — anon storefronts have no UPDATE grant on the
    // orders table, so a direct updateOrder 401s on pool backends.
    if (provider.confirmPayment) await provider.confirmPayment(order.id)
    else await provider.updateOrder(order.id, { financialStatus: 'paid' })
  }

  return { order, customerId: customerId ?? order.customerId ?? '' }
}
