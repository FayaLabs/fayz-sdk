// ---------------------------------------------------------------------------
// Reusable phone / country helpers (SDK-level — shared by any plugin that
// collects a phone number: booking, CRM, forms, auth…). Provides the country
// list (flag + dial code + national mask) and mask/unmask utilities.
// ---------------------------------------------------------------------------

export interface CountryDef {
  /** ISO 3166-1 alpha-2 code, e.g. 'BR'. */
  iso2: string
  /** Localized-ish display name. */
  name: string
  /** International dial code including '+', e.g. '+55'. */
  dial: string
  /** Flag emoji (derived from iso2). */
  flag: string
  /** National number mask; '#' = one digit. e.g. '(##) #####-####'. */
  mask: string
}

/** Derive a flag emoji from an ISO2 code via regional indicator symbols. */
function flagOf(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

const RAW: Omit<CountryDef, 'flag'>[] = [
  { iso2: 'BR', name: 'Brasil', dial: '+55', mask: '(##) #####-####' },
  { iso2: 'US', name: 'Estados Unidos', dial: '+1', mask: '(###) ###-####' },
  { iso2: 'PT', name: 'Portugal', dial: '+351', mask: '### ### ###' },
  { iso2: 'AR', name: 'Argentina', dial: '+54', mask: '(##) ####-####' },
  { iso2: 'ES', name: 'Espanha', dial: '+34', mask: '### ### ###' },
  { iso2: 'MX', name: 'México', dial: '+52', mask: '## #### ####' },
  { iso2: 'GB', name: 'Reino Unido', dial: '+44', mask: '##### ######' },
  { iso2: 'FR', name: 'França', dial: '+33', mask: '# ## ## ## ##' },
  { iso2: 'DE', name: 'Alemanha', dial: '+49', mask: '#### #######' },
  { iso2: 'IT', name: 'Itália', dial: '+39', mask: '### #######' },
]

export const COUNTRIES: CountryDef[] = RAW.map((c) => ({ ...c, flag: flagOf(c.iso2) }))

export const DEFAULT_COUNTRY = 'BR'

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso2, c]))

/** Look up a country by ISO2 (falls back to the default). */
export function getCountry(iso2: string | undefined): CountryDef {
  return (iso2 && BY_ISO.get(iso2.toUpperCase())) || BY_ISO.get(DEFAULT_COUNTRY)!
}

/** Keep only digit characters. */
export function unmaskPhone(value: string): string {
  return (value || '').replace(/\D/g, '')
}

/**
 * Apply a '#'-placeholder mask to a raw string, consuming its digits. Extra
 * digits beyond the mask are dropped; partial input masks progressively.
 *
 *   maskPhone('11987654321', '(##) #####-####') -> '(11) 98765-4321'
 */
export function maskPhone(value: string, mask: string): string {
  const digits = unmaskPhone(value)
  let out = ''
  let di = 0
  for (const ch of mask) {
    if (di >= digits.length) break
    if (ch === '#') {
      out += digits[di++]
    } else {
      out += ch
    }
  }
  return out
}

/** Count how many digits a mask expects. */
export function maskDigitCount(mask: string): number {
  let n = 0
  for (const ch of mask) if (ch === '#') n++
  return n
}
