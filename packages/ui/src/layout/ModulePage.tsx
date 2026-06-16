import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import { useTranslation } from '@fayz-ai/core'
import { cn } from '../utils/cn'
import { ICON_MAP } from './Topbar'
import { useModuleHeaderSlot, useModuleHeaderActionsSlot } from './AppShell'
import { PageTransition } from './PageTransition'

// ---------------------------------------------------------------------------
// PageHeaderActions — portals a page's primary action button(s) into the shell
// top-bar's right-aligned actions slot. Falls back to a right-aligned inline row
// when there's no slot (e.g. topbar layout). Any page can use it:
//   <PageHeaderActions><Button>New campaign</Button></PageHeaderActions>
// ---------------------------------------------------------------------------

export function PageHeaderActions({ children }: { children: React.ReactNode }) {
  const slot = useModuleHeaderActionsSlot()
  if (slot) return createPortal(children, slot)
  return <div className="mb-4 flex items-center justify-end gap-2">{children}</div>
}

export interface ModuleNavItem {
  id: string
  label: string
  icon?: string
  active?: boolean
  onClick?: () => void
  children?: { id: string; label: string; active?: boolean; onClick?: () => void }[]
}

export interface ModulePageProps {
  title: string
  subtitle?: string
  nav: ModuleNavItem[]
  children: React.ReactNode
  className?: string
  /** Optional action element rendered next to the title (e.g. settings gear) */
  headerAction?: React.ReactNode
  /** Show the title/subtitle header. Default: true */
  showHeader?: boolean
  /** Optional content pinned to the bottom of the sidebar (e.g. "Powered by X") */
  sidebarFooter?: React.ReactNode
  /** How the module-internal nav renders. Falls back to the ModuleLayout context
   *  (set by the app shell from its layout), then 'rail'. */
  navVariant?: ModuleNavVariant
  /** Active sub-view id — drives the SDK page transition when it changes.
   *  Plugins pass their `useModuleNavigation().view`; they no longer animate themselves. */
  viewKey?: string
  /** Navigation direction for the transition (from `useModuleNavigation`). */
  direction?: 'forward' | 'back'
}

// ---------------------------------------------------------------------------
// ModuleLayout context — lets the app shell decide how every module's internal
// navigation renders ('rail' for topbar products, 'tabs' for sidebar/GHL-style
// products), so plugins stay agnostic and products feel distinct.
// ---------------------------------------------------------------------------

export type ModuleNavVariant = 'rail' | 'tabs'

const ModuleLayoutContext = React.createContext<ModuleNavVariant>('rail')

export function ModuleLayoutProvider({ variant, children }: { variant: ModuleNavVariant; children: React.ReactNode }) {
  return <ModuleLayoutContext.Provider value={variant}>{children}</ModuleLayoutContext.Provider>
}

export function useModuleLayout(): ModuleNavVariant {
  return React.useContext(ModuleLayoutContext)
}

function NavItem({ item }: { item: ModuleNavItem }) {
  const [expanded, setExpanded] = React.useState(true)
  const Icon = item.icon ? (ICON_MAP[item.icon] ?? null) : null
  const hasChildren = item.children && item.children.length > 0
  const hasActiveChild = hasChildren && item.children!.some((c) => c.active)
  const isActive = item.active || hasActiveChild

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren ? setExpanded(!expanded) : item.onClick?.()}
        className={cn(
          'flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="flex-1 text-left truncate">{item.label}</span>
        {hasChildren && (
          expanded
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
        )}
      </button>
      {hasChildren && expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2">
          {item.children!.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={child.onClick}
              className={cn(
                'flex items-center w-full rounded-md px-2.5 py-1 text-xs transition-colors',
                child.active
                  ? 'text-primary font-medium bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Horizontal scrollable tabs for mobile — with expandable children */
function MobileTabs({ nav }: { nav: ModuleNavItem[] }) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  // Auto-scroll to active tab on mount
  React.useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const activeEl = container.querySelector('[data-active="true"]') as HTMLElement
    if (activeEl) {
      const left = activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2
      container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    }
  }, [nav])

  return (
    <div className="md:hidden -mx-1 mb-4 no-print">
      <div ref={scrollRef} className="flex gap-1 px-1 pb-2 overflow-x-auto scrollbar-hide">
        {nav.map((item) => {
          const Icon = item.icon ? (ICON_MAP[item.icon] ?? null) : null
          const hasChildren = item.children && item.children.length > 0
          const isActive = item.active || item.children?.some((c) => c.active)
          const isExpanded = expandedId === item.id

          return (
            <button
              key={item.id}
              type="button"
              data-active={isActive || undefined}
              onClick={() => {
                if (hasChildren) {
                  setExpandedId(isExpanded ? null : item.id)
                } else {
                  item.onClick?.()
                  setExpandedId(null)
                }
              }}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors shrink-0',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {item.label}
              {hasChildren && <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', isExpanded && 'rotate-180')} />}
            </button>
          )
        })}
      </div>

      {/* Expanded children dropdown */}
      {expandedId && (() => {
        const item = nav.find((n) => n.id === expandedId)
        if (!item?.children) return null
        return (
          <div className="flex gap-1 px-2 pb-2 animate-in fade-in-0 slide-in-from-top-1">
            {item.children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => { child.onClick?.(); setExpandedId(null) }}
                className={cn(
                  'whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors shrink-0',
                  child.active
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {child.label}
              </button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubpageHeader
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Back-button style — the SINGLE, app-wide affordance for returning from a
// detail/subpage. Set once by the product via <BackStyleProvider>, NOT chosen
// per-plugin (mirrors NavTransitionProvider for page transitions). Plugins just
// pass `onBack` + `parentLabel` to SubpageHeader and inherit whatever style the
// app picked:
//   'link'       → subtle "← Back to {parent}" above the title (default)
//   'breadcrumb' → "{parent} › Title"
//   'icon'       → square chevron button beside the title
// ---------------------------------------------------------------------------

export type BackButtonStyle = 'link' | 'breadcrumb' | 'icon'

const BackStyleContext = React.createContext<BackButtonStyle>('link')

export function BackStyleProvider({ style, children }: { style: BackButtonStyle; children: React.ReactNode }) {
  return <BackStyleContext.Provider value={style}>{children}</BackStyleContext.Provider>
}

export function useBackStyle(): BackButtonStyle {
  return React.useContext(BackStyleContext)
}

export interface SubpageHeaderProps {
  /** Page title */
  title: string
  /** Short description */
  subtitle?: string
  /** Lucide icon name */
  icon?: string
  /** Back button handler */
  onBack?: () => void
  /** Parent label (e.g. "Invoices") — used by every back style ("Back to Invoices", breadcrumb root, etc.) */
  parentLabel?: string
  /** Actions rendered on the right */
  actions?: React.ReactNode
  /** Override the app-wide back style for this one header. Rarely needed. */
  backStyle?: BackButtonStyle
}

export function SubpageHeader({ title, subtitle, icon, onBack, parentLabel, actions, backStyle }: SubpageHeaderProps) {
  const t = useTranslation()
  const appStyle = useBackStyle()
  const Icon = icon ? (ICON_MAP[icon] ?? null) : null
  // Breadcrumb/link need a parent label; without one we fall back to the icon button.
  const style: BackButtonStyle = !onBack ? 'icon' : (backStyle ?? appStyle)
  const effectiveStyle: BackButtonStyle = style !== 'icon' && !parentLabel ? 'icon' : style

  const titleBlock = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {effectiveStyle === 'icon' && onBack && (
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="no-print">{actions}</div>}
    </div>
  )

  if (effectiveStyle === 'breadcrumb') {
    return (
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={onBack} className="hover:text-foreground transition-colors">{parentLabel}</button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{title}</span>
          </div>
          {actions && <div className="no-print">{actions}</div>}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground -mt-2">{subtitle}</p>}
      </div>
    )
  }

  if (effectiveStyle === 'link') {
    return (
      <div className="space-y-3 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('crud.detail.backTo', { entities: parentLabel as string })}
        </button>
        {titleBlock}
      </div>
    )
  }

  // icon (default fallback)
  return <div className="space-y-4 mb-6">{titleBlock}</div>
}

// ---------------------------------------------------------------------------
// ModuleHeader — GoHighLevel-style module header (title + horizontal sub-nav),
// portalled into the shell's top-of-page header slot. Active tab's children
// render as a secondary pill row. Falls back to inline if no slot is present.
// ---------------------------------------------------------------------------

function ModuleHeader({ nav }: { nav: ModuleNavItem[] }) {
  const slot = useModuleHeaderSlot()

  // Tabs are flat: a parent with children navigates straight to its default
  // "list" view (sub-actions like "New" live as a button inside that list).
  function defaultChild(item: ModuleNavItem) {
    const kids = item.children ?? []
    return kids.find((c) => /list/i.test(c.id) || /^list$/i.test(c.label)) ?? kids[kids.length - 1]
  }

  const content = (
    <div className="flex w-full min-w-0 items-center gap-4">
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-hide">
        {nav.map((item) => {
          const Icon = item.icon ? (ICON_MAP[item.icon] ?? null) : null
          const hasChildren = item.children && item.children.length > 0
          const isActive = item.active || item.children?.some((c) => c.active)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (hasChildren ? defaultChild(item)?.onClick?.() : item.onClick?.())}
              className={cn(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  if (slot) return createPortal(content, slot)
  // Fallback: render inline above content when no shell header slot exists.
  return <div className="mb-5 border-b border-border pb-2">{content}</div>
}

// ---------------------------------------------------------------------------
// ModulePage
// ---------------------------------------------------------------------------

export function ModulePage({ title, subtitle, nav, children, className, headerAction, showHeader = true, sidebarFooter, navVariant, viewKey, direction }: ModulePageProps) {
  const ctxVariant = useModuleLayout()
  const variant = navVariant ?? ctxVariant
  const transitionKey = viewKey ?? 'view'

  // Tabs variant — the module sub-nav renders in the shell's top-of-page header
  // container and actions in its right slot (GoHighLevel style); the content
  // area holds only the view (the shell owns the page title).
  if (variant === 'tabs') {
    return (
      <>
        <ModuleHeader nav={nav} />
        {/* Header actions belong to the module overview only; internal sub-views
            (showHeader=false) carry their own actions. */}
        {showHeader && headerAction && <PageHeaderActions>{headerAction}</PageHeaderActions>}
        <PageTransition transitionKey={transitionKey} direction={direction} className={cn('min-w-0', className)}>
          {children}
        </PageTransition>
      </>
    )
  }

  // Rail variant (default) — left sub-nav column.
  return (
    <div className={cn('flex gap-6 -mt-2', className)}>
      {/* Side navigation — hidden on mobile + print */}
      <div className="w-48 shrink-0 hidden md:block no-print">
        <div className={cn(sidebarFooter && 'sticky top-4 flex flex-col')} style={sidebarFooter ? { height: 'calc(100vh - 8rem)' } : undefined}>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2.5 mb-2">{title}</p>
            <nav className="space-y-0.5">
              {nav.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </nav>
          </div>
          {sidebarFooter && <div className="mt-auto">{sidebarFooter}</div>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {headerAction}
          </div>
        )}
        {/* Mobile tabs */}
        <MobileTabs nav={nav} />
        <PageTransition transitionKey={transitionKey} direction={direction}>
          {children}
        </PageTransition>
      </div>
    </div>
  )
}
