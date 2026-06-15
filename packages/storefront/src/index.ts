// Factory
export { createStorefrontApp, initStorefrontRuntime, StorefrontShell } from './createStorefrontApp'
export type {
  StorefrontConfig,
  ResolvedStorefrontConfig,
  StorefrontRouteComponentProps,
  StorefrontRouteChrome,
  StorefrontRouteDefinition,
  StorefrontRouteKind,
  StorefrontRouteParams,
} from './config'
export { useStorefrontConfig } from './config'

// Manifest path (renderApp(defineStorefront(config)) / storefront scaffold)
export { defineStorefront, StorefrontScaffold } from './scaffold'

// Block system (storefront sections as registry blocks)
export { registerStorefrontBlocks, sectionsToBlocks } from './blocks'

// Routing
export { Link, navigateTo, useHashPath, matchPath } from './router'
export type { LinkProps } from './router'

// Stores
export {
  useCartStore,
  selectCount,
  selectSubtotal,
  selectDiscountTotal,
  selectShipping,
  selectTotal,
} from './stores/cart.store'
export type { CartLine, CartState } from './stores/cart.store'
export { useSessionStore } from './stores/session.store'
export type { SessionState } from './stores/session.store'
export {
  signInByEmail,
  signUpCustomer,
  establishCustomerSession,
  signOutCustomer,
  getCustomerAuthAdapter,
  resolveAuthAdapter,
} from './auth'
export type { StorefrontAuthAdapter, EstablishSessionOptions } from './auth'
export { useCatalogStore } from './stores/catalog.store'
export type { CatalogState, CatalogSort } from './stores/catalog.store'

// Hooks
export { useProducts, useProduct, useCategories, useMyOrders, useDiscountValidator } from './hooks'

// Components (for custom layouts)
export { StorefrontHeader } from './components/StorefrontHeader'
export { ProductCard } from './components/ProductCard'
export type { ProductCardProps } from './components/ProductCard'
export { OrderTrackingTimeline } from './components/OrderTrackingTimeline'
export { ProductGrid } from './components/ProductGrid'
export { FiltersPanel } from './components/FiltersPanel'
export { CartDrawer } from './components/CartDrawer'
export { Price } from './components/Price'
export { QuantityInput } from './components/QuantityInput'
export { ProductOptionSelector } from './components/ProductOptionSelector'
export type { ProductOptionSelectorProps } from './components/ProductOptionSelector'
export {
  getProductOptionGroups,
  normalizeProductOptionSelection,
  formatProductOptionSelection,
  productOptionSelectionKey,
} from './product-options'
export type { ProductOptionGroup, ProductOptionSelection } from './product-options'

// Pages (for custom routing)
export { CatalogPage } from './pages/CatalogPage'
export { ProductDetailPage } from './pages/ProductDetailPage'
export { CheckoutPage } from './pages/CheckoutPage'
export { OrderConfirmationPage } from './pages/OrderConfirmationPage'
export { MyPurchasesPage } from './pages/MyPurchasesPage'
export { placeStorefrontOrder } from './workflows/checkout'
export type {
  PlaceStorefrontOrderInput,
  PlaceStorefrontOrderResult,
  StorefrontCheckoutAddress,
  StorefrontCheckoutCustomer,
} from './workflows/checkout'

// Theming + templates
export { StorefrontThemeStyle, themeToCss } from './theme'
export type {
  StorefrontTheme,
  StorefrontThemeColors,
  StorefrontThemeFont,
  StorefrontRadius,
  HeaderVariant,
  HeroVariant,
  CardStyle,
} from './theme'
export type { HomeSection, HomeConfig, HeroSlide, NavLink, FooterConfig } from './sections'
export { bannerPlaceholder } from './sections'
export {
  storefrontTemplates,
  mareTemplate,
  sertaoTemplate,
  voltTemplate,
  atelierTemplate,
} from './presets'
export type { StorefrontTemplate, StorefrontTemplateId } from './presets'

// Home sections (for custom compositions)
export { HomePage } from './pages/HomePage'
export { HeroSection } from './components/sections/HeroSection'
export { CategoryShowcase } from './components/sections/CategoryShowcase'
export { ProductRail } from './components/sections/ProductRail'
export {
  BenefitsRow,
  PromoBanner,
  ManifestoBlock,
  Testimonials,
  NewsletterBand,
} from './components/sections/MiscSections'
export { StorefrontFooter } from './components/StorefrontFooter'

// Motion (core animation primitives)
export { Reveal, useInView, useScrolled, usePopOnChange, prefersReducedMotion } from './motion'
export type { RevealProps } from './motion'

// Utilities
export { formatMoney, roundCents } from './format'
export { TID } from './testids'
export {
  productCardSlotContract,
  storefrontSlotContracts,
} from './slot-contracts'
export type { ProductCardSlotContract } from './slot-contracts'
