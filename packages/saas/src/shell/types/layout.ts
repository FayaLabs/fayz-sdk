import type React from 'react'

export type LayoutVariant = 'sidebar' | 'topbar' | 'minimal' | (string & {})

export interface NavigationItem {
  id: string
  label: string
  icon: string
  route: string
  section: 'main' | 'secondary' | 'settings'
  position: number
  badge?: string | number
  children?: NavigationItem[]
}

export interface LayoutConfig {
  variant: LayoutVariant
  navigation: NavigationItem[]
  logo?: React.ReactNode
  userMenu?: React.ReactNode
  footer?: React.ReactNode
}

export interface LayoutState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  mobileDrawerOpen: boolean
  commandPaletteOpen: boolean
}
