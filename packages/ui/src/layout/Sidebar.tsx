import * as React from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Home,
  Users,
  Settings,
  CreditCard,
  Bell,
  Calendar,
  CalendarClock,
  Package,
  Activity,
  BarChart3,
  FileText,
  Mail,
  PanelLeftClose,
  PanelLeft,
  Search,
  Shield,
  DollarSign,
  Megaphone,
  Receipt,
  ShoppingCart,
  ShoppingBag,
  Target,
  Wrench,
  ClipboardList,
  ListChecks,
  Briefcase,
  UserCog,
  BookOpen,
  BookOpenCheck,
  MessageCircle,
  Globe,
  Percent,
  Tag,
  Tags,
  Camera,
  UtensilsCrossed,
  MapPin,
  Map,
  Handshake,
  Contact,
  Building2,
  Filter,
  Plus,
  List,
  ListPlus,
  ChevronDown,
  Ban,
  Clock,
  Dog,
  Cat,
  PawPrint,
  Heart,
  FolderOpen,
  LayoutTemplate,
  LeafyGreen,
  Apple,
  Egg,
  Wheat,
  PartyPopper,
  Radio,
  CalendarDays,
  CalendarCheck2,
  CalendarX,
  BadgeDollarSign,
  Banknote,
  Landmark,
  CircleDollarSign,
  Layers,
  Music,
  Eye,
  ListMusic,
  Disc3,
  UsersRound,
  Mic,
  Zap,
  Award,
  LayoutDashboard,
  MessageSquare,
  Inbox,
  Star,
  TrendingUp,
  GraduationCap,
  Repeat,
  UserCheck,
  UserPlus,
  UserX,
  Workflow,
  Boxes,
  Clock3,
  FileCheck2,
  User,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Puzzle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useLayoutStore } from '../stores/layout.store'

export interface NavigationItem {
  id: string
  label: string
  icon: string
  route: string
  section: 'main' | 'secondary' | 'settings'
  badge?: string | number
  permission?: { feature: string; action: 'read' | 'create' | 'edit' | 'delete' }
  children?: NavigationItem[]
}

export interface SidebarUser {
  fullName: string
  avatarUrl?: string
  email: string
}

export interface SidebarProps {
  navigation: NavigationItem[]
  logo?: React.ReactNode
  collapsed: boolean
  onToggle: () => void
  onNavigate?: (route: string) => void
  currentPath?: string
  user?: SidebarUser
  onSignOut?: () => void
  onProfile?: () => void
  onSettings?: () => void
  onBilling?: () => void
  userMenuExtras?: { label: string; icon?: React.ReactNode; onClick: () => void }[]
  orgSwitcher?: React.ReactNode
  topContent?: React.ReactNode
  footerContent?: React.ReactNode
  /** When true, removes all borders for a cleaner framed look */
  borderless?: boolean
  /** User menu component to render at the bottom */
  userMenuSlot?: React.ReactNode
  /** Notification slot to render at the bottom */
  notificationSlot?: React.ReactNode
  /** Unread notification count for the bell indicator */
  unreadCount?: number
  /** Optional headings above each nav section. Used by contextual sidebars
   *  (e.g. /settings swaps the rail for "Settings links" + "Plugins"); the
   *  normal app rail leaves them undefined and renders no headings. */
  sectionLabels?: { main?: string; secondary?: string; settings?: string }
  /** Identity of the current rail context. When it changes, the rail animates
   *  as a push: the new nav slides in while the previous one slides out.
   *  Leave undefined for a static rail (no swap animation). */
  navKey?: string
  /** Push direction for a `navKey` change. 'forward' pulls the new rail in
   *  from the right (drilling in), 'back' from the left (returning). */
  navDirection?: 'forward' | 'back'
}

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Users, Settings, CreditCard, Bell, Calendar, CalendarClock, Package, Activity, BarChart3,
  FileText, Mail, DollarSign, Megaphone, ShoppingCart, Target, Wrench,
  Receipt, ShoppingBag, ClipboardList, ListChecks, Briefcase, UserCog, BookOpen, BookOpenCheck, MessageCircle, Globe,
  Percent, Tag, Tags, Camera, UtensilsCrossed, MapPin, Map, Handshake, Contact,
  Building2, Filter, Plus, List, ListPlus, Search, Shield, Ban, Clock, Dog, Cat, PawPrint, Heart, FolderOpen, LayoutTemplate, LeafyGreen, Apple, Egg, Wheat,
  PartyPopper, Radio, CalendarDays, CalendarCheck2, CalendarX, BadgeDollarSign, Banknote, Landmark, CircleDollarSign, Layers, Music, Eye, ListMusic, Disc3, UsersRound, Mic,
  Zap, Award, LayoutDashboard, MessageSquare, Inbox, Star, TrendingUp, UserCheck, UserPlus, UserX, Workflow, Boxes, Clock3, FileCheck2,
  GraduationCap, Repeat,
  User, Palette, ShieldCheck, SlidersHorizontal, Puzzle,
}

export { ICON_MAP }

/** Kept in sync with --saas-rail-duration in styles.css. */
const RAIL_PUSH_MS = 260

/** Layout effect on the client, plain effect during SSR (avoids the warning).
 *  The rail push needs the layout variant: the animation classes must be on
 *  the DOM before paint, or the new rail shows one frame at its final spot. */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Home
}

function NavItem({
  item,
  collapsed,
  isActive,
  onNavigate,
}: {
  item: NavigationItem
  collapsed: boolean
  isActive: boolean
  onNavigate: (route: string) => void
}) {
  const Icon = getIcon(item.icon)

  const content = (
    <button
      onClick={() => onNavigate(item.route)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
        'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        isActive
          ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm'
          : 'text-sidebar-foreground/80',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.badge !== undefined && (
            <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>{content}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={8}
            className="fayz-glass-surface z-50 rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
          >
            {item.label}
            {item.badge !== undefined && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {item.badge}
              </span>
            )}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    )
  }

  return content
}

/** How specifically `route` matches `path` (-1 = no match; higher = more specific).
 *  An exact match beats a prefix match; a longer prefix beats a shorter one. */
function routeMatchScore(route: string, path: string): number {
  if (path === route) return route.length + 1
  if (route !== '/' && path.startsWith(route + '/')) return route.length
  return -1
}

/** The single most-specific nav route that matches the current path (longest wins).
 *  Prevents a parent like `/courses` from staying active on `/courses/sales`. */
function resolveActiveRoute(navigation: NavigationItem[], path: string): string | null {
  let best: string | null = null
  let bestScore = 0
  const consider = (route?: string) => {
    if (!route) return
    const score = routeMatchScore(route, path)
    if (score > bestScore) { bestScore = score; best = route }
  }
  for (const item of navigation) {
    consider(item.route)
    for (const child of item.children ?? []) consider(child.route)
  }
  return best
}

function NavGroup({
  item,
  collapsed,
  activeRoute,
  onNavigate,
}: {
  item: NavigationItem
  collapsed: boolean
  activeRoute: string | null
  onNavigate: (route: string) => void
}) {
  const isChildActive = item.children?.some((c) => c.route === activeRoute)
  const [open, setOpen] = React.useState(() => isChildActive ?? false)
  const Icon = getIcon(item.icon)

  if (collapsed) {
    return (
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>
          <button
            onClick={() => onNavigate(item.route)}
            className={cn(
              'flex w-full items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isChildActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="right" sideOffset={8} className="fayz-glass-surface z-50 rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md">
            {item.label}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isChildActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-muted'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border/50 pl-3">
          {item.children?.map((child) => {
            const ChildIcon = getIcon(child.icon)
            const isActive = child.route === activeRoute
            return (
              <button
                key={child.id}
                onClick={() => onNavigate(child.route)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-muted hover:text-sidebar-accent-foreground'
                )}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{child.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  navigation,
  logo,
  collapsed,
  onToggle,
  onNavigate,
  currentPath: currentPathProp = '/',
  user: _user,
  orgSwitcher,
  topContent,
  footerContent,
  borderless,
  userMenuSlot,
  notificationSlot,
  unreadCount = 0,
  sectionLabels,
  navKey,
  navDirection = 'forward',
}: SidebarProps) {
  const currentPath = currentPathProp
  const setCommandPaletteOpen = useLayoutStore((s) => s.setCommandPaletteOpen)

  // Most-specific match wins, so sibling routes that share a prefix (e.g.
  // /courses vs /courses/sales) don't both light up.
  const activeRoute = resolveActiveRoute(navigation, currentPath)

  const mainItems = navigation.filter((item) => item.section === 'main')
  const secondaryItems = navigation.filter((item) => item.section === 'secondary')
  const settingsItems = navigation.filter((item) => item.section === 'settings')

  const handleNavigate = (route: string) => {
    onNavigate?.(route)
  }

  const sectionHeading = (label?: string) =>
    label && !collapsed ? (
      <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
        {label}
      </p>
    ) : null

  const renderItem = (item: NavigationItem) =>
    item.children && item.children.length > 0 ? (
      <NavGroup key={item.id} item={item} collapsed={collapsed} activeRoute={activeRoute} onNavigate={handleNavigate} />
    ) : (
      <NavItem
        key={item.id}
        item={item}
        collapsed={collapsed}
        isActive={item.route === activeRoute}
        onNavigate={handleNavigate}
      />
    )

  // The swappable part of the rail (top slot + both nav sections). Kept as one
  // node so a context change can snapshot the outgoing rail and animate it out.
  const navBody = (
    <>
      {topContent && <div className="mb-4 space-y-2">{topContent}</div>}
      {mainItems.length > 0 && (
        <div className="space-y-1">
          {sectionHeading(sectionLabels?.main)}
          {mainItems.map(renderItem)}
        </div>
      )}
      {secondaryItems.length > 0 && (
        <div className="mt-6 space-y-1">
          {sectionHeading(sectionLabels?.secondary)}
          {secondaryItems.map(renderItem)}
        </div>
      )}
    </>
  )

  // Rail push: when `navKey` changes, hold the previous rail on screen for one
  // animation cycle. `lastBodyRef` is refreshed after every render, so the
  // snapshot is the rail exactly as it looked before the swap (correct active
  // item included) rather than a stale one.
  const [outgoing, setOutgoing] = React.useState<{ body: React.ReactNode; direction: 'forward' | 'back' } | null>(null)
  const lastBodyRef = React.useRef<React.ReactNode>(null)
  const lastKeyRef = React.useRef(navKey)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (lastKeyRef.current !== navKey) {
      const previousBody = lastBodyRef.current
      lastKeyRef.current = navKey
      if (previousBody) {
        setOutgoing({ body: previousBody, direction: navDirection })
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setOutgoing(null), RAIL_PUSH_MS)
      }
    }
    lastBodyRef.current = navBody
  })

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <Tooltip.Provider>
      <aside
        data-print="hide"
        className={cn(
          'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200',
          !borderless && 'border-r border-sidebar-border',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo + Collapse Toggle */}
        <div
          className={cn(
            'flex h-14 items-center justify-between px-4',
            !borderless && 'border-b border-sidebar-border',
            collapsed && 'justify-center px-2'
          )}
        >
          {!collapsed && (
            <>
              {logo ?? <span className="text-lg font-bold">App</span>}
              <button
                onClick={onToggle}
                className="ml-auto rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
          {collapsed && (
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Main Navigation. During a rail swap the outgoing nav is pinned on
            top of the incoming one so the two cross-slide; overflow is clipped
            for the duration so neither pane can scroll the rail sideways. */}
        <nav
          className={cn(
            'relative flex-1 p-2',
            outgoing ? 'overflow-hidden' : 'overflow-y-auto',
          )}
        >
          {outgoing && (
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-2 top-2 space-y-1',
                outgoing.direction === 'back' ? 'saas-rail-out-back' : 'saas-rail-out-forward',
              )}
            >
              {outgoing.body}
            </div>
          )}
          <div
            key={navKey}
            className={cn(
              'space-y-1',
              outgoing && (outgoing.direction === 'back' ? 'saas-rail-in-back' : 'saas-rail-in-forward'),
            )}
          >
          {navBody}
          </div>
        </nav>

        {/* Settings nav items */}
        {settingsItems.length > 0 && (
          <div className={cn('p-2 space-y-1', !borderless && 'border-t border-sidebar-border')}>
            {settingsItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                collapsed={collapsed}
                isActive={item.route === activeRoute}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}

        {footerContent && (
          <div className={cn('p-2', !borderless && 'border-t border-sidebar-border')}>
            <div className="space-y-2">{footerContent}</div>
          </div>
        )}

        {/* Org Switcher — above user row */}
        {orgSwitcher && React.isValidElement(orgSwitcher)
          ? React.cloneElement(orgSwitcher as React.ReactElement<any>, { collapsed })
          : orgSwitcher}

        {/* Bottom: User row with inline action icons */}
        <div className={cn('p-2', !borderless && 'border-t border-sidebar-border')}>
          <div className={cn(
            'flex items-center rounded-md',
            collapsed ? 'flex-col gap-1' : 'gap-1 px-1'
          )}>
            {/* User Menu slot */}
            {userMenuSlot}

            {/* Spacer pushes icons to right when expanded */}
            {!collapsed && <div className="flex-1" />}

            {/* Search — opens command palette */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notification slot or default bell */}
            {notificationSlot ?? (
              <button
                className="relative inline-flex shrink-0 items-center justify-center rounded-md p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </button>
            )}
          </div>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
