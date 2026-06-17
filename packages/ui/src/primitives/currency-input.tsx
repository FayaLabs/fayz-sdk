import * as React from 'react'
import { cn } from '../utils/cn'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  symbol?: string
  locale?: string
  currencyCode?: string
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Currency input with automatic decimal formatting.
 *
 * - Always displays the value with 2 decimal places using the project's locale
 * - Input works like an ATM: digits push from right, decimals are fixed
 * - Typing "12345" shows "123,45" (or "123.45" depending on locale)
 * - Backspace removes the last digit
 * - Supports the project currency symbol
 */
export function CurrencyInput({
  value,
  onChange,
  symbol = 'R$',
  locale = 'pt-BR',
  currencyCode = 'BRL',
  label,
  placeholder,
  className,
  disabled,
}: CurrencyInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [focused, setFocused] = React.useState(false)

  // Format number to locale string with 2 decimals
  const format = React.useCallback((v: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v)
  }, [locale])

  const displayValue = format(value)

  // Handle key-by-key input — ATM-style (digits push from right)
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return

    // Allow tab, arrow keys, etc.
    if (['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return

    e.preventDefault()

    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Remove last digit: 123.45 → 12.34
      const cents = Math.floor(Math.round(value * 100) / 10)
      onChange(cents / 100)
      return
    }

    // Only accept digits
    if (!/^\d$/.test(e.key)) return

    // Append digit: 12.34 + '5' → 123.45
    const currentCents = Math.round(value * 100)
    const newCents = currentCents * 10 + parseInt(e.key, 10)
    // Cap at 999,999,999.99
    if (newCents > 99999999999) return
    onChange(newCents / 100)
  }

  // Handle paste — parse number from pasted text
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    // Remove everything except digits, dots, commas
    const cleaned = text.replace(/[^\d.,]/g, '')
    // Replace comma with dot for parsing
    const normalized = cleaned.replace(',', '.')
    const parsed = parseFloat(normalized)
    if (!isNaN(parsed)) {
      onChange(Math.round(parsed * 100) / 100)
    }
  }

  return (
    <div className={className}>
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div
        className={cn(
          'flex items-center rounded-lg border border-input bg-background ring-offset-background transition-colors cursor-text',
          label && 'mt-1',
          focused && 'border-ring ring-2 ring-ring ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="pl-3 pr-1 text-sm font-medium text-muted-foreground select-none">{symbol}</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder ?? format(0)}
          disabled={disabled}
          readOnly={false}
          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none text-right tabular-nums caret-primary selection:bg-primary/20"
          onChange={() => {}}
        />
      </div>
    </div>
  )
}
