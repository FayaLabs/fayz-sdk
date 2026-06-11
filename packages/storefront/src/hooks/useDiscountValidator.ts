import { useCallback } from 'react'
import { getShopProvider } from '@fayz/shop'

export interface DiscountValidation {
  valid: boolean
  percent: number
  message?: string
}

export function useDiscountValidator(): (code: string) => Promise<DiscountValidation> {
  return useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return { valid: false, percent: 0, message: 'Informe um cupom.' }
    const discounts = await getShopProvider().listDiscounts({ status: 'active' })
    const match = discounts.find((d) => (d.code ?? '').toUpperCase() === normalized)
    if (!match) return { valid: false, percent: 0, message: 'Cupom inválido ou expirado.' }
    if (match.type !== 'percentage') {
      return { valid: false, percent: 0, message: 'Este cupom não é suportado na loja.' }
    }
    return { valid: true, percent: match.value }
  }, [])
}
