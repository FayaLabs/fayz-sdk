import React from 'react'
import { formatMoney } from '../format'
import { useStorefrontConfig } from '../config'

export interface PriceProps {
  value: number
  compareAt?: number | null
  testId?: string
  compareTestId?: string
  className?: string
}

/** Formatted money. Always carries data-price so tests assert raw numbers, never locale strings. */
export function Price({ value, compareAt, testId, compareTestId, className }: PriceProps) {
  const { currency, locale } = useStorefrontConfig()
  return (
    <span className={`inline-flex items-baseline gap-2 ${className ?? ''}`}>
      <span data-testid={testId} data-price={value.toFixed(2)} className="font-semibold">
        {formatMoney(value, currency, locale)}
      </span>
      {compareAt != null && compareAt > value && (
        <span
          data-testid={compareTestId}
          data-price={compareAt.toFixed(2)}
          className="text-sm text-muted-foreground line-through"
        >
          {formatMoney(compareAt, currency, locale)}
        </span>
      )}
    </span>
  )
}
