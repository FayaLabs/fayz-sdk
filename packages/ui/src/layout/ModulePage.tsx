import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../utils/cn'
import { ICON_MAP } from './Topbar'

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

export interface SubpageHeaderProps {
  /** Page title */
  title: string
  /** Short description */
  subtitle?: string
  /** Lucide icon name */
  icon?: string
  /** Back button handler */
  onBack?: () => void
  /** Parent label for breadcrumb (e.g. "Invoices"). When set, renders ← Parent / Title breadcrumb instead of bare chevron */
  parentLabel?: string
  /** Actions rendered on the right */
  actions?: React.ReactNode
}

export function SubpageHeader({ title, subtitle, icon, onBack, parentLabel, actions }: SubpageHeaderProps) {
  const Icon = icon ? (ICON_MAP[icon] ?? null) : null
  return (
    <div className="space-y-4 mb-6">
      {onBack && parentLabel ? (
        /* Breadcrumb mode */
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button onClick={onBack} className="hover:text-foreground transition-colors">
                {parentLabel}
              </button>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{title}</span>
            </div>
            {actions && <div className="no-print">{actions}</div>}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground -mt-2">{subtitle}</p>}
        </>
      ) : (
        /* Standard mode */
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
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
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ModulePage
// ---------------------------------------------------------------------------

export function ModulePage({ title, subtitle, nav, children, className, headerAction, showHeader = true, sidebarFooter }: ModulePageProps) {
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
        {children}
      </div>
    </div>
  )
}
