import { TID } from './testids'

/**
 * Stable selectors that custom storefront components must preserve.
 *
 * Apps can fully customize the visual tree, but replacement components still
 * need these anchors so smoke tests, QA, and agents can operate stores.
 */
export const productCardComponentContract = {
  root: { 'data-testid': TID.productCard },
  name: { 'data-testid': TID.productCardName },
  priceTestId: TID.productCardPrice,
  addButton: { 'data-testid': TID.productCardAdd },
} as const

export const storefrontComponentContracts = {
  productCard: productCardComponentContract,
  productDetail: {
    root: { 'data-testid': TID.pdpRoot },
    gallery: { 'data-testid': TID.pdpGallery },
    name: { 'data-testid': TID.pdpName },
    description: { 'data-testid': TID.pdpDescription },
    actions: { 'data-testid': TID.pdpActions },
    addButton: { 'data-testid': TID.pdpAddToCart },
    enquiryButton: { 'data-testid': TID.pdpEnquiryButton },
    enquiryForm: { 'data-testid': TID.enquiryForm },
  },
} as const

export type ProductCardComponentContract = typeof productCardComponentContract
export type ProductDetailComponentContract = typeof storefrontComponentContracts.productDetail
