import * as React from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Home, Users, Settings, CreditCard, Bell, Calendar, Package, BarChart3,
  FileText, Mail, Search, DollarSign, Megaphone, ShoppingCart, Target,
  Wrench, ClipboardList, Briefcase, UserCog, BookOpen, MessageCircle,
  Globe, Percent, Tag, Camera, UtensilsCrossed, MapPin, Handshake,
  Contact, Building2, Filter, Plus, List, User, Box, Sparkles, Loader2,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'

export interface CommandItem {
  id: string
  label: string
  icon?: string
  action: () => void
  group?: string
  keywords?: string
  subtitle?: string
}

export interface EntitySearchResult {
  id: string
  label: string
  subtitle?: string
  group: string
  icon?: string
  data?: Record<string, unknown>
}

export type EntitySearchFn = (query: string) => Promise<EntitySearchResult[]>

interface CommandPaletteProps {
  commands?: CommandItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onEntitySearch?: EntitySearchFn
  onEntitySelect?: (result: EntitySearchResult) => void
}

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Users, Settings, CreditCard, Bell, Calendar, Package, BarChart3,
  FileText, Mail, Search, DollarSign, Megaphone, ShoppingCart, Target,
  Wrench, ClipboardList, Briefcase, UserCog, BookOpen, MessageCircle,
  Globe, Percent, Tag, Camera, UtensilsCrossed, MapPin, Handshake,
  Contact, Building2, Filter, Plus, List, User, Box, Sparkles,
}

const ENTITY_ICON: Record<string, LucideIcon> = {
  person: User,
  persons: User,
  product: Box,
  products: Box,
  service: Sparkles,
  services: Sparkles,
}

// ---------------------------------------------------------------------------
// Debounced entity search hook
// ---------------------------------------------------------------------------

function useEntitySearch(searchFn: EntitySearchFn | undefined, query: string, open: boolean) {
  const [results, setResults] = useState<EntitySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(0)

  useEffect(() => {
    if (!open) {
      setResults([])
      setLoading(false)
      return
    }

    const trimmed = query.trim()
    if (!searchFn || trimmed.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const id = ++abortRef.current

    const timer = setTimeout(async () => {
      try {
        const data = await searchFn(trimmed)
        if (abortRef.current === id) {
          setResults(data)
          setLoading(false)
        }
      } catch {
        if (abortRef.current === id) {
          setResults([])
          setLoading(false)
        }
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, searchFn, open])

  return { results, loading }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette({ commands = [], open, onOpenChange, onEntitySearch, onEntitySelect }: CommandPaletteProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const { results: entityResults, loading: entityLoading } = useEntitySearch(onEntitySearch, search, open)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const grouped = commands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    const group = cmd.group ?? 'Actions'
    if (!acc[group]) acc[group] = []
    acc[group].push(cmd)
    return acc
  }, {})

  // Group entity results
  const entityGrouped = entityResults.reduce<Record<string, EntitySearchResult[]>>((acc, r) => {
    const group = r.group || 'Results'
    if (!acc[group]) acc[group] = []
    acc[group].push(r)
    return acc
  }, {})

  const hasSearch = search.trim().length >= 2
  const totalResults = commands.length + entityResults.length

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="saas-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="saas-cmd-palette fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border/50 bg-popover shadow-2xl">
          <Dialog.Title className="sr-only">{t('layout.commandPalette.title')}</Dialog.Title>
          <Dialog.Description className="sr-only">{t('layout.commandPalette.description')}</Dialog.Description>

          <Command className="flex flex-col" label="Command palette" shouldFilter={true}>
            <div className="flex items-center gap-3 border-b border-border/50 px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                placeholder={t('layout.commandPalette.placeholder')}
                className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
                value={search}
                onValueChange={setSearch}
              />
              {entityLoading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
              <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">ESC</kbd>
            </div>

            <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                {entityLoading ? t('layout.commandPalette.searching') : t('layout.commandPalette.noResults')}
              </Command.Empty>

              {/* Static commands (pages, actions) */}
              {Object.entries(grouped).map(([group, items]) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {items.map((cmd) => {
                    const Icon = cmd.icon ? (ICON_MAP[cmd.icon] ?? null) : null
                    return (
                      <Command.Item
                        key={cmd.id}
                        value={`${cmd.label} ${cmd.keywords ?? ''}`}
                        onSelect={() => { cmd.action(); onOpenChange(false) }}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors aria-selected:bg-muted"
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <span className="flex-1">{cmd.label}</span>
                        <span className="text-[11px] text-muted-foreground/40">{cmd.group}</span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              ))}

              {/* Entity search results */}
              {hasSearch && Object.entries(entityGrouped).map(([group, items]) => {
                const GroupIcon = ENTITY_ICON[group.toLowerCase()] ?? User
                return (
                  <Command.Group
                    key={`entity:${group}`}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {items.map((result) => {
                      const Icon = result.icon ? (ICON_MAP[result.icon] ?? GroupIcon) : GroupIcon
                      return (
                        <Command.Item
                          key={`entity:${result.id}`}
                          value={`${result.label} ${result.subtitle ?? ''} ${result.group}`}
                          onSelect={() => { onEntitySelect?.(result); onOpenChange(false) }}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors aria-selected:bg-muted"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <span className="block truncate">{result.label}</span>
                            {result.subtitle && (
                              <span className="block truncate text-[11px] text-muted-foreground">{result.subtitle}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground/40 shrink-0">{result.group}</span>
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                )
              })}
            </Command.List>

            <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {entityLoading
                  ? t('layout.commandPalette.searching')
                  : hasSearch
                    ? t('layout.commandPalette.resultCount', { count: String(totalResults), plural: totalResults !== 1 ? 's' : '' })
                    : t('layout.commandPalette.commandCount', { count: String(commands.length), plural: commands.length !== 1 ? 's' : '' })}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-medium">&uarr;&darr;</kbd>
                <span>{t('layout.commandPalette.navigate')}</span>
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-medium">&crarr;</kbd>
                <span>{t('layout.commandPalette.open')}</span>
              </div>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
