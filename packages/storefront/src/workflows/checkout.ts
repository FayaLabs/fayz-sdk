import { getShopProvider } from '@fayz-ai/shop/runtime'
import type { Order } from '@fayz-ai/shop/types'
import { establishCustomerSession } from '../auth'
import type { ResolvedStorefrontConfig } from '../config'
import type { CartState } from '../stores/cart.store'
import {
  selectDiscountTotal,
  selectShipping,
} from '../stores/cart.store'
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

  const order = await provider.createOrder({
    customerId,
    customerName: name,
    customerEmail: email,
    currency: config.currency,
    notes: formatDeliveryNotes(address),
    discountCode: cart.discountCode ?? undefined,
    discountTotal: selectDiscountTotal(cart),
    shippingTotal: selectShipping(cart, config),
    items: cart.lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      sku: line.sku ?? undefined,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      imageUrl: line.imageUrl ?? undefined,
    })),
  })

  if (markPaid) {
    await provider.updateOrder(order.id, { financialStatus: 'paid' })
  }

  return { order, customerId }
}
