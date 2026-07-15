import type { BookingComponents } from '../types'
import { DefaultBrandHeader } from './BrandHeader'
import { DefaultServiceCard } from './ServiceCard'
import { DefaultSidebarExtras } from './SidebarExtras'
import { DefaultStepRailItem } from './StepRailItem'
import { DefaultSuccessPanel } from './SuccessPanel'

export const DEFAULT_BOOKING_COMPONENTS: BookingComponents = {
  BrandHeader: DefaultBrandHeader,
  ServiceCard: DefaultServiceCard,
  SidebarExtras: DefaultSidebarExtras,
  StepRailItem: DefaultStepRailItem,
  SuccessPanel: DefaultSuccessPanel,
}
