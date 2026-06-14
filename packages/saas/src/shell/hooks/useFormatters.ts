import { useMemo } from 'react'
import { useLocaleStore } from '../stores/locale.store'

export function useFormatters() {
  const { locale } = useLocaleStore()

  return useMemo(() => {
    const resolvedLocale = locale || 'en'

    const formatCurrency = (
      amount: number,
      currency = 'USD',
      options?: Intl.NumberFormatOptions
    ): string => {
      return new Intl.NumberFormat(resolvedLocale, {
        style: 'currency',
        currency,
        ...options,
      }).format(amount)
    }

    const formatDate = (
      date: Date | string,
      options?: Intl.DateTimeFormatOptions
    ): string => {
      const d = typeof date === 'string' ? new Date(date) : date
      return new Intl.DateTimeFormat(resolvedLocale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options,
      }).format(d)
    }

    const formatNumber = (
      value: number,
      options?: Intl.NumberFormatOptions
    ): string => {
      return new Intl.NumberFormat(resolvedLocale, options).format(value)
    }

    const formatRelativeTime = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date
      const now = Date.now()
      const diff = Math.floor((now - d.getTime()) / 1000)

      if (diff < 60) return 'just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
      return formatDate(d)
    }

    return { formatCurrency, formatDate, formatNumber, formatRelativeTime }
  }, [locale])
}
