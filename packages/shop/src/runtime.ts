import type { ShopProvider } from './provider'
import { createMockShopProvider } from './mock-provider'

let provider: ShopProvider | null = null
let mockFallback: ShopProvider | null = null

export function getShopProvider(): ShopProvider {
  if (provider) return provider
  if (!mockFallback) mockFallback = createMockShopProvider()
  return mockFallback
}

export function setShopProvider(nextProvider: ShopProvider): void {
  provider = nextProvider
}

export function resetShopProvider(): void {
  provider = null
  mockFallback = null
}
