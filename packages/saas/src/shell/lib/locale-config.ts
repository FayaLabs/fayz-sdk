export interface LocaleOption {
  code: string
  label: string
  flag: string
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
]

export function getLocaleOption(code: string): LocaleOption {
  return SUPPORTED_LOCALES.find((l) => l.code === code) ?? SUPPORTED_LOCALES[0]
}
