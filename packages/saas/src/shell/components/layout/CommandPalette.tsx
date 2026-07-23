import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Home, Users, Settings, CreditCard, Bell, Calendar, CalendarCheck2,
  CalendarClock, CalendarX, Package, Activity, BarChart3, FileText, FileCheck2, Mail, Search,
  DollarSign, BadgeDollarSign, CircleDollarSign, Megaphone, ShoppingCart, ShoppingBag, Target,
  Wrench, ClipboardList, ListChecks, Briefcase, UserCog, BookOpen, BookOpenCheck, MessageCircle,
  Globe, Percent, Tag, Tags, Camera, UtensilsCrossed, MapPin, Map, Handshake,
  Contact, Building2, Filter, Plus, List, Shield, User, Box, Sparkles, Loader2,
  ListPlus, FolderOpen, Boxes, Landmark, Receipt, Ban, Clock, Clock3, Inbox,
  Star, TrendingUp, UserCheck, UserPlus, UserX, Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  MIN_QUERY_LENGTH, highlightRanges, normalizeQuery, scoreCandidate, foldText,
  type GlobalSearchResult, type SearchHit,
} from '@fayz-ai/core'
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

/** Runs one global search. `onPartial` paints a cheap early answer, if there is one. */
export type EntitySearchFn = (
  query: string,
  onPartial?: (result: GlobalSearchResult) => void,
) => Promise<GlobalSearchResult>

interface CommandPaletteProps {
  commands?: CommandItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onEntitySearch?: EntitySearchFn
  onEntitySelect?: (hit: SearchHit) => void
}

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Users, Settings, CreditCard, Bell, Calendar, CalendarClock, Package, Activity, BarChart3,
  CalendarCheck2, CalendarX, FileText, FileCheck2, Mail, Search, DollarSign, BadgeDollarSign, CircleDollarSign, Megaphone, ShoppingCart, ShoppingBag, Target,
  Wrench, ClipboardList, ListChecks, Briefcase, UserCog, BookOpen, BookOpenCheck, MessageCircle,
  Globe, Percent, Tag, Tags, Camera, UtensilsCrossed, MapPin, Map, Handshake,
  Contact, Building2, Filter, Plus, List, Shield, ListPlus, FolderOpen, User, Box, Boxes, Sparkles, Landmark, Receipt, Ban, Clock, Clock3, Inbox,
  Star, TrendingUp, UserCheck, UserPlus, UserX, Zap,
}

/** Long enough that a fast typist issues one request per word, not per letter. */
const DEBOUNCE_MS = 140

// Highlighting — the matched run, in the record's own spelling

function Highlight({ text, query }: { text: string; query: string }) {
  const parts = useMemo(() => {
    const normalized = normalizeQuery(query)
    const ranges = highlightRanges(text, normalized)
    if (ranges.length === 0) return [{ text, hit: false }]
    const out: Array<{ text: string; hit: boolean }> = []
    let cursor = 0
    for (const [from, to] of ranges) {
      if (from > cursor) out.push({ text: text.slice(cursor, from), hit: false })
      out.push({ text: text.slice(from, to), hit: true })
      cursor = to
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), hit: false })
    return out
  }, [text, query])

  return (
    <>
      {parts.map((part, i) =>
        part.hit
          ? <mark key={i} className="bg-transparent font-semibold text-foreground">{part.text}</mark>
          : <React.Fragment key={i}>{part.text}</React.Fragment>,
      )}
    </>
  )
}

// Records arrive from the server; commands are already in memory. Same scorer,
// different clocks — commands re-rank per keystroke, records refine as they land.

function useEntitySearch(searchFn: EntitySearchFn | undefined, query: string, open: boolean) {
  const [result, setResult] = useState<GlobalSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const generation = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (!open || !searchFn || foldText(trimmed).length < MIN_QUERY_LENGTH) {
      setResult(null)
      setLoading(false)
      return
    }

    const token = ++generation.current
    setLoading(true)

    const timer = setTimeout(() => {
      searchFn(trimmed, (partial) => {
        // A partial must never replace a final answer for this same query.
        if (token === generation.current) setResult((prev) => (prev?.partial === false && prev.query === trimmed ? prev : partial))
      })
        .then((final) => {
          if (token !== generation.current) return
          setResult(final)
          setLoading(false)
        })
        .catch(() => {
          // Keep what is on screen: a failed refresh is not an empty result.
          if (token !== generation.current) return
          setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, searchFn, open])

  return { result, loading }
}

/**
 * Commands, ranked by the same ladder records use. cmdk's own filter is OFF:
 * it re-filtered the SERVER's results with its own substring rules, so a record
 * matched by phone, by a note or by an accent-folded name was fetched and then
 * dropped — the list said "no results" while the footer counted them.
 */
function useRankedCommands(commands: CommandItem[], query: string): CommandItem[] {
  return useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return commands
    const normalized = normalizeQuery(trimmed)
    if (normalized.tokens.length === 0) return commands
    return commands
      .map((cmd) => ({
        cmd,
        score: scoreCandidate(normalized, {
          title: foldText(cmd.label),
          haystack: foldText(`${cmd.label} ${cmd.group ?? ''} ${cmd.keywords ?? ''} ${cmd.subtitle ?? ''}`),
        }),
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((c) => c.cmd)
  }, [commands, query])
}

const GROUP_HEADING =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground'

const ITEM =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors aria-selected:bg-muted'

export function CommandPalette({ commands = [], open, onOpenChange, onEntitySearch, onEntitySelect }: CommandPaletteProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const { result, loading } = useEntitySearch(onEntitySearch, search, open)
  const rankedCommands = useRankedCommands(commands, search)

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

  const grouped = rankedCommands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    const group = cmd.group ?? 'Actions'
    if (!acc[group]) acc[group] = []
    acc[group].push(cmd)
    return acc
  }, {})

  const hasQuery = foldText(search).length >= MIN_QUERY_LENGTH
  // A lookup wants the client, not the page that lists clients.
  const recordGroups = hasQuery ? (result?.groups ?? []) : []
  const recordCount = recordGroups.reduce((n, g) => n + g.hits.length, 0)
  const totalResults = rankedCommands.length + recordCount
  const nothingYet = totalResults === 0

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="saas-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fayz-glass-surface saas-cmd-palette fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border/50 bg-popover shadow-2xl">
          <Dialog.Title className="sr-only">{t('layout.commandPalette.title')}</Dialog.Title>
          <Dialog.Description className="sr-only">{t('layout.commandPalette.description')}</Dialog.Description>

          <Command className="flex flex-col" label="Command palette" shouldFilter={false}>
            <div className="flex items-center gap-3 border-b border-border/50 px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                placeholder={t('layout.commandPalette.placeholder')}
                className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
                value={search}
                onValueChange={setSearch}
              />
              {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
              <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">ESC</kbd>
            </div>

            <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
              {nothingYet && (
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  {loading ? t('layout.commandPalette.searching') : t('layout.commandPalette.noResults')}
                </Command.Empty>
              )}

              {/* Records first */}
              {recordGroups.map((group) => {
                const GroupIcon = group.icon ? (ICON_MAP[group.icon] ?? User) : User
                return (
                  <Command.Group key={`entity:${group.key}`} heading={group.label} className={GROUP_HEADING}>
                    {group.hits.map((hit) => {
                      const Icon = hit.icon ? (ICON_MAP[hit.icon] ?? GroupIcon) : GroupIcon
                      return (
                        <Command.Item
                          key={hit.uid}
                          value={hit.uid}
                          onSelect={() => { onEntitySelect?.(hit); onOpenChange(false) }}
                          className={ITEM}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate"><Highlight text={hit.title} query={search} /></span>
                            {hit.subtitle && (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                <Highlight text={hit.subtitle} query={search} />
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground/40">{group.label}</span>
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                )
              })}

              {/* Pages and actions */}
              {Object.entries(grouped).map(([group, items]) => (
                <Command.Group key={group} heading={group} className={GROUP_HEADING}>
                  {items.map((cmd, i) => {
                    const Icon = cmd.icon ? (ICON_MAP[cmd.icon] ?? null) : null
                    // Command ids are not unique — "Clientes" and its "Lista"
                    // child both mint `page:/clients`. Also the cmdk value.
                    const uid = `${group}:${cmd.id}:${i}`
                    return (
                      <Command.Item
                        key={uid}
                        value={uid}
                        onSelect={() => { cmd.action(); onOpenChange(false) }}
                        className={ITEM}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <span className="flex-1"><Highlight text={cmd.label} query={search} /></span>
                        <span className="text-[11px] text-muted-foreground/40">{cmd.group}</span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              ))}
            </Command.List>

            <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {loading
                  ? t('layout.commandPalette.searching')
                  : hasQuery
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
