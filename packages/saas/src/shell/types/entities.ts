export type EntityArchetype = 'person' | 'category' | 'product' | 'service' | 'order' | 'transaction' | 'schedule' | 'location'

export interface BaseEntity {
  id: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface PersonEntity extends BaseEntity {
  archetype: 'person'
  kind: string
  name: string
  email?: string
  phone?: string
  documentNumber?: string
  avatarUrl?: string
  dateOfBirth?: string
  address?: string
  city?: string
  state?: string
  country: string
  postalCode?: string
  tags: string[]
  isActive: boolean
  notes?: string
  metadata: Record<string, unknown>
}

export interface CategoryEntity extends BaseEntity {
  archetype: 'category'
  kind: string
  name: string
  slug?: string
  parentId?: string
  icon?: string
  color?: string
  sortOrder: number
  isActive: boolean
  metadata: Record<string, unknown>
}

export interface ProductEntity extends BaseEntity {
  archetype: 'product'
  categoryId?: string
  name: string
  description?: string
  sku?: string
  price?: number
  cost?: number
  currency: string
  unit?: string
  imageUrl?: string
  stock?: number
  minStock?: number
  status: string
  isActive: boolean
  tags: string[]
  metadata: Record<string, unknown>
}

export interface ServiceEntity extends BaseEntity {
  archetype: 'service'
  categoryId?: string
  name: string
  description?: string
  price?: number
  cost?: number
  currency: string
  durationMinutes?: number
  imageUrl?: string
  status: string
  isActive: boolean
  tags: string[]
  metadata: Record<string, unknown>
}

export interface OrderEntity extends BaseEntity {
  archetype: 'order'
  kind: string
  referenceNumber?: string
  status: string
  partyId?: string
  assigneeId?: string
  locationId?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  currency: string
  dueAt?: string
  completedAt?: string
  notes?: string
  tags: string[]
  metadata: Record<string, unknown>
}

export interface OrderItemEntity {
  id: string
  orderId: string
  productId?: string
  serviceId?: string
  name: string
  description?: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  sortOrder: number
  metadata: Record<string, unknown>
  createdAt: string
}

export interface TransactionEntity extends BaseEntity {
  archetype: 'transaction'
  kind: string
  orderId?: string
  partyId?: string
  amount: number
  currency: string
  paymentMethod?: string
  reference?: string
  status: string
  transactedAt: string
  notes?: string
  metadata: Record<string, unknown>
}


export interface LocationEntity extends BaseEntity {
  archetype: 'location'
  kind: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country: string
  postalCode?: string
  isHeadquarters: boolean
  isActive: boolean
  tags: string[]
  notes?: string
  metadata: Record<string, unknown>
}

export interface ScheduleEntity extends BaseEntity {
  archetype: 'schedule'
  kind: string
  assigneeId?: string
  locationId?: string
  dayOfWeek?: number
  specificDate?: string
  startsAt: string
  endsAt: string
  isActive: boolean
  metadata: Record<string, unknown>
}

export type Entity =
  | PersonEntity
  | CategoryEntity
  | ProductEntity
  | ServiceEntity
  | LocationEntity
  | OrderEntity
  | TransactionEntity
  | ScheduleEntity
