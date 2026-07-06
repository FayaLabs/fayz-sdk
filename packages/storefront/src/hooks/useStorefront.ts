import { getShopProvider } from '@fayz-ai/shop/runtime'
import type { CreateProductEnquiryInput } from '@fayz-ai/shop/types'
import { useStorefrontConfig } from '../config'
import { navigateTo } from '../router'
import { useCatalogStore } from '../stores/catalog.store'
import { useCartStore } from '../stores/cart.store'
import type { ProductOptionSelection } from '../product-options'
import type { Product } from '@fayz-ai/shop/types'

export function useStorefront() {
  return useStorefrontConfig()
}

export function useCatalog() {
  const config = useStorefrontConfig()
  const catalog = useCatalogStore()
  return {
    ...catalog,
    catalogPath: config.catalogPath,
    config,
  }
}

export function useCart() {
  return useCartStore()
}

export function useEnquiry() {
  const config = useStorefrontConfig()
  const createProductEnquiry = async (input: CreateProductEnquiryInput) => {
    const provider = getShopProvider()
    if (!provider.createProductEnquiry) {
      throw new Error('The active shop provider does not support product enquiries.')
    }
    return provider.createProductEnquiry(input)
  }

  return {
    enquiry: config.enquiry,
    createProductEnquiry,
  }
}

export function useStorefrontActions() {
  const addItem = useCartStore((state) => state.addItem)
  const openDrawer = useCartStore((state) => state.openDrawer)
  const closeDrawer = useCartStore((state) => state.closeDrawer)
  const { createProductEnquiry } = useEnquiry()

  return {
    navigateTo,
    addToCart: (product: Product, quantity?: number, options?: ProductOptionSelection) =>
      addItem(product, quantity, options),
    openCart: openDrawer,
    closeCart: closeDrawer,
    createProductEnquiry,
  }
}
