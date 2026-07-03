import type React from 'react'
import type { Category, CreateProductEnquiryInput, Product, ProductEnquiry, ProductImage } from '@fayz-ai/shop/types'
import type { ProductOptionGroup, ProductOptionSelection } from './product-options'
import type { ResolvedStorefrontConfig, StorefrontCommerceMode } from './config'
import type { MediaCarouselItem } from './sections'

export interface StorefrontComponentBaseProps {
  config: ResolvedStorefrontConfig
  commerceMode: StorefrontCommerceMode
  className?: string
  testId?: string
}

export interface StorefrontActions {
  navigateTo: (to: string) => void
  addToCart: (product: Product, quantity?: number, options?: ProductOptionSelection) => void
  openCart: () => void
  closeCart: () => void
  createProductEnquiry: (input: CreateProductEnquiryInput) => Promise<ProductEnquiry>
}

export interface ProductCardProps extends StorefrontComponentBaseProps {
  product: Product
  actions: Pick<StorefrontActions, 'navigateTo' | 'addToCart' | 'openCart'>
}

export interface ProductDetailProps extends StorefrontComponentBaseProps {
  product: Product
  primaryImage?: ProductImage
  optionGroups: ProductOptionGroup[]
  selectedOptions: ProductOptionSelection
  setSelectedOptions: React.Dispatch<React.SetStateAction<ProductOptionSelection>>
  quantity: number
  setQuantity: React.Dispatch<React.SetStateAction<number>>
  soldOut: boolean
  lowStock: boolean
  actions: Pick<StorefrontActions, 'addToCart' | 'createProductEnquiry' | 'navigateTo'>
  addToCart: () => void
  openEnquiry: () => void
}

export interface ProductGalleryProps extends StorefrontComponentBaseProps {
  product: Product
  images: ProductImage[]
  primaryImage?: ProductImage
}

export interface ProductPriceProps extends StorefrontComponentBaseProps {
  product: Product
  value: number
  compareAt?: number | null
}

export interface ProductActionsProps extends StorefrontComponentBaseProps {
  product: Product
  quantity: number
  setQuantity: React.Dispatch<React.SetStateAction<number>>
  soldOut: boolean
  actions: Pick<StorefrontActions, 'addToCart' | 'createProductEnquiry' | 'navigateTo'>
  addToCart: () => void
  openEnquiry: () => void
}

export interface ProductEnquiryFormContractProps extends StorefrontComponentBaseProps {
  product: Product
  onSuccess?: () => void
}

export interface CategoryCardProps extends StorefrontComponentBaseProps {
  category: Category
  actions: Pick<StorefrontActions, 'navigateTo'>
}

export interface CollectionSectionProps extends StorefrontComponentBaseProps {
  title: string
  subtitle?: string
  products: Product[]
  category?: Category
  children?: React.ReactNode
}

export interface HeroSectionContractProps extends StorefrontComponentBaseProps {
  title: string
  subtitle?: string
  eyebrow?: string
  image?: string
  cta?: string
  href?: string
  children?: React.ReactNode
}

export interface MediaCarouselProps extends StorefrontComponentBaseProps {
  items: MediaCarouselItem[]
  height?: 'medium' | 'tall' | 'screen'
  autoplayMs?: number
  overlay?: 'dark' | 'soft' | 'none'
}

export interface ProductSliderProps extends StorefrontComponentBaseProps {
  title: string
  subtitle?: string
  eyebrow?: string
  filter?: 'sale' | 'new' | 'all'
  categoryName?: string
  collection?: string
  limit?: number
  cta?: string
  href?: string
}

export interface StorefrontChromeProps extends StorefrontComponentBaseProps {
  children?: React.ReactNode
}

export interface StorefrontStateProps extends StorefrontComponentBaseProps {
  title?: string
  message?: string
  children?: React.ReactNode
}

export interface StorefrontComponents {
  ProductCard?: React.ComponentType<ProductCardProps>
  ProductDetail?: React.ComponentType<ProductDetailProps>
  ProductGallery?: React.ComponentType<ProductGalleryProps>
  ProductPrice?: React.ComponentType<ProductPriceProps>
  ProductActions?: React.ComponentType<ProductActionsProps>
  ProductEnquiryForm?: React.ComponentType<ProductEnquiryFormContractProps>
  CategoryCard?: React.ComponentType<CategoryCardProps>
  CollectionSection?: React.ComponentType<CollectionSectionProps>
  HeroSection?: React.ComponentType<HeroSectionContractProps>
  MediaCarousel?: React.ComponentType<MediaCarouselProps>
  ProductSlider?: React.ComponentType<ProductSliderProps>
  Header?: React.ComponentType<StorefrontChromeProps>
  Footer?: React.ComponentType<StorefrontChromeProps>
  Shell?: React.ComponentType<StorefrontChromeProps>
  EmptyState?: React.ComponentType<StorefrontStateProps>
  LoadingState?: React.ComponentType<StorefrontStateProps>
  ErrorState?: React.ComponentType<StorefrontStateProps>

}
