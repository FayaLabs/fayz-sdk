export function formatMoney(value: number, currency = 'BRL', locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}
