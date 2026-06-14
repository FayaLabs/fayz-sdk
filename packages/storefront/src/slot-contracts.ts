import { TID } from './testids'

/**
 * Stable selectors that custom storefront slots must preserve.
 *
 * Apps can fully customize the visual tree, but catalog/product-rail slots still
 * need these anchors so checkout smoke tests, QA, and agents can operate stores.
 */
export const productCardSlotContract = {
  root: { 'data-testid': TID.productCard },
  name: { 'data-testid': TID.productCardName },
  priceTestId: TID.productCardPrice,
  addButton: { 'data-testid': TID.productCardAdd },
} as const

export const storefrontSlotContracts = {
  productCard: productCardSlotContract,
} as const

export type ProductCardSlotContract = typeof productCardSlotContract
