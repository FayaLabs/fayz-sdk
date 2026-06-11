import React from 'react'
import { Minus, Plus } from 'lucide-react'

export interface QuantityInputProps {
  value: number
  onChange(next: number): void
  min?: number
  max?: number
  testId?: string
  incTestId?: string
  decTestId?: string
}

export function QuantityInput({ value, onChange, min = 1, max, testId, incTestId, decTestId }: QuantityInputProps) {
  const clamp = (n: number) => Math.max(min, max != null ? Math.min(n, max) : n)
  return (
    <div className="inline-flex items-center rounded-lg border">
      <button
        type="button"
        data-testid={decTestId}
        aria-label="Diminuir quantidade"
        onClick={() => onChange(clamp(value - 1))}
        className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
        disabled={value <= min}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        data-testid={testId}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n)) onChange(clamp(n))
        }}
        className="w-12 border-x bg-transparent py-1.5 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        data-testid={incTestId}
        aria-label="Aumentar quantidade"
        onClick={() => onChange(clamp(value + 1))}
        className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
        disabled={max != null && value >= max}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
