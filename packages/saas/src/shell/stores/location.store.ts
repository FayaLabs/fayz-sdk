import { create } from 'zustand'
import type { Location } from '../types/tenant'

const STORAGE_KEY = 'saas-core:current-location'

interface LocationStore {
  /** All org locations (active + inactive) */
  locations: Location[]
  /** Currently selected location (session-scoped) */
  currentLocation: Location | null
  loading: boolean
  /** True while the full-page switch overlay is visible */
  switching: boolean

  setLocations: (locations: Location[]) => void
  setCurrentLocation: (location: Location | null) => void
  /** Switch with full-page overlay + page reload */
  switchLocation: (location: Location) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

function getPersistedLocationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function persistLocationId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  locations: [],
  currentLocation: null,
  loading: false,
  switching: false,

  setLocations: (locations) => {
    const persistedId = getPersistedLocationId()
    const active = locations.filter((l) => l.isActive)

    // Auto-select: persisted → HQ → first active
    let selected: Location | null = null
    if (persistedId) {
      selected = active.find((l) => l.id === persistedId) ?? null
    }
    if (!selected) {
      selected = active.find((l) => l.isHeadquarters) ?? active[0] ?? null
    }

    set({ locations, currentLocation: selected })
    if (selected) persistLocationId(selected.id)
  },

  setCurrentLocation: (location) => {
    persistLocationId(location?.id ?? null)
    set({ currentLocation: location })
  },

  switchLocation: (location) => {
    if (location.id === get().currentLocation?.id) return
    set({ switching: true })
    persistLocationId(location.id)
    // Let the overlay animate in, then reload
    setTimeout(() => {
      window.location.reload()
    }, 900)
  },

  setLoading: (loading) => set({ loading }),

  reset: () => {
    persistLocationId(null)
    set({ locations: [], currentLocation: null, loading: false, switching: false })
  },
}))

export { getPersistedLocationId }
