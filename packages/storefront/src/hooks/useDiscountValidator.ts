import { useCallback } from 'react'
import { validateDiscount } from '@fayz-ai/shop'
import { useStorefrontConfig } from '../config'

export interface DiscountValidation {
  valid: boolean
  percent: number
  message?: string
}

const REASON_MESSAGE: Record<string, string> = {
  expired: 'Cupom expirado.',
  not_started: 'Cupom ainda não está ativo.',
  usage_limit: 'Cupom esgotado.',
  not_found: 'Cupom inválido ou expirado.',
}

/**
 * Storefront coupon validator. The store's own config.discounts (simple percent
 * codes) are trusted directly; everything else goes through the provider-backed
 * validateDiscount primitive, which enforces status/date-window/usage-limit.
 * The storefront cart models discounts as a percentage, so non-percentage codes
 * are rejected for client-side preview (the server still honors them at checkout).
 */
export function useDiscountValidator(): (code: string) => Promise<DiscountValidation> {
  const config = useStorefrontConfig()
  return useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return { valid: false, percent: 0, message: 'Informe um cupom.' }

    const configDiscount = config.discounts?.find((d) => d.code.trim().toUpperCase() === normalized)
    if (configDiscount) return { valid: true, percent: configDiscount.percent }

    const validation = await validateDiscount({ code: normalized })
    if (!validation.valid) {
      return { valid: false, percent: 0, message: REASON_MESSAGE[validation.reason ?? 'not_found'] ?? 'Cupom inválido ou expirado.' }
    }
    if (validation.type !== 'percentage') {
      return { valid: false, percent: 0, message: 'Este cupom não é suportado na loja.' }
    }
    return { valid: true, percent: validation.value }
  }, [config.discounts])
}
