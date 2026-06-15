import { create } from 'zustand'

const STORAGE_KEY = 'saas-core:locale'

function getPersistedLocale(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'en'
  } catch {
    return 'en'
  }
}

interface LocaleState {
  locale: string
  setLocale: (locale: string) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getPersistedLocale(),
  setLocale: (locale) => {
    try { localStorage.setItem(STORAGE_KEY, locale) } catch { /* ignore */ }
    set({ locale })
  },
}))
