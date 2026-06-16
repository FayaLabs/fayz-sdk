import * as React from 'react'
import { EyeOff } from 'lucide-react'
import {
  usePluginRuntime,
  getDashboardWidgets,
  resolvePluginComponent,
  hashRouterAdapter,
  type DashboardLayoutConfig,
  type DashboardSurface,
  type DashboardWidgetDef,
} from '@fayz-ai/core'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../primitives/card'
import { DashboardGrid, type DashboardGridItem } from './DashboardGrid'
import { resolveDashboardLayout, type LaidOutWidget } from './layout'
import { useDashboardPreferences } from './preferences'
import { DashboardRangeProvider, DashboardRangeControl, type DashboardRange } from './DashboardRange'
import { DashboardCustomizeMenu } from './DashboardCustomizeMenu'

/** Wrap a widget so a hide button fades in on hover (top-right corner). */
function HoverHide({ id, onHide, children }: { id: string; onHide?: (id: string) => void; children: React.ReactNode }) {
  if (!onHide) return <>{children}</>
  return (
    <div className="group relative h-full">
      {children}
      <button
        type="button"
        onClick={() => onHide(id)}
        title="Hide widget"
        aria-label="Hide widget"
        className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function toGridItems(laidOut: LaidOutWidget[], onHide?: (id: string) => void): DashboardGridItem[] {
  return laidOut.map(({ def, span }) => {
    const Component = resolvePluginComponent(def)
    const node = Component ? <Component {...(def.props ?? {})} /> : null
    return { id: def.id, span, node: <HoverHide id={def.id} onHide={onHide}>{node}</HoverHide> }
  })
}

// ---------------------------------------------------------------------------
// Navigation — widgets (e.g. onboarding) call useDashboardNavigate() to route.
// Defaults to the shared hash router so widgets work without explicit wiring.
// ---------------------------------------------------------------------------

const DashboardNavigateContext = React.createContext<(path: string) => void>((path) =>
  hashRouterAdapter().navigate(path),
)

export const DashboardNavigateProvider = DashboardNavigateContext.Provider

export function useDashboardNavigate(): (path: string) => void {
  return React.useContext(DashboardNavigateContext)
}

// ---------------------------------------------------------------------------
// Shared widget grid — used by DashboardCanvas (registry) and by standalone
// callers (e.g. the dashboard plugin's legacy DashboardPage shim). Resolves the
// layout, then renders each widget by span.
// ---------------------------------------------------------------------------

export function WidgetGrid({ widgets, appLayout, surface }: {
  widgets: DashboardWidgetDef[]
  appLayout?: DashboardLayoutConfig
  surface: DashboardSurface
}) {
  const { prefs, setVisible } = useDashboardPreferences(surface)
  const laidOut = resolveDashboardLayout(widgets, appLayout, prefs ?? undefined)
  return <DashboardGrid items={toGridItems(laidOut, (id) => setVisible(id, false))} />
}

// ---------------------------------------------------------------------------
// DashboardCanvas — the registry-driven renderer. Serves the global app home
// (surface="home", all domains) and a plugin's own overview (surface="plugin-home"
// + domain). Widgets a plugin registers once appear on both.
// ---------------------------------------------------------------------------

export interface DashboardCanvasProps {
  surface: DashboardSurface
  /** Restrict to one plugin's widgets (used for plugin-home). */
  domain?: string
  title?: string
  subtitle?: string
  /** Render the in-content title/subtitle. Default: true. */
  showHeader?: boolean
  /** App-level curation of which widgets show, their order and span. */
  appLayout?: DashboardLayoutConfig
  /** Show a shared time-range control (sticky, top-right). Widgets read it via
   *  useDashboardRange(). Pass `true` for defaults or an options object. */
  range?: boolean | DashboardRangeOptions
  /** Show the "Customize" menu so users can choose which widgets appear
   *  (persisted per surface). Default: true. */
  customizable?: boolean
  /** Label for the customize menu trigger. */
  customizeLabel?: string
  /** Initial visibility before user prefs: 'default' honors each widget's
   *  `defaultVisible` (used by the global home to curate a starting set); 'all'
   *  shows every eligible widget. Defaults to 'all' on a plugin-home, 'default'
   *  on the global home. */
  initialVisibility?: 'default' | 'all'
  /** Route handler for widgets that navigate (defaults to the hash router). */
  onNavigate?: (path: string) => void
  className?: string
}

export interface DashboardRangeOptions {
  options?: DashboardRange[]
  default?: DashboardRange
  onChange?: (range: DashboardRange) => void
}

export function DashboardCanvas({
  surface, domain, title, subtitle, showHeader = true, appLayout, range,
  customizable = true, customizeLabel, initialVisibility, onNavigate, className,
}: DashboardCanvasProps) {
  const runtime = usePluginRuntime()
  const widgets = getDashboardWidgets(runtime, { surface, domain })
  const rangeOpts: DashboardRangeOptions | null = range ? (range === true ? {} : range) : null

  const forceAll = (initialVisibility ?? (surface === 'plugin-home' ? 'all' : 'default')) === 'all'
  const { prefs, setVisible, reset } = useDashboardPreferences(surface, domain ?? 'home')
  const laidOut = resolveDashboardLayout(widgets, appLayout, prefs ?? undefined, forceAll)
  const visibleIds = React.useMemo(() => new Set(laidOut.map((w) => w.def.id)), [laidOut])

  const hasControls = Boolean(rangeOpts) || (customizable && widgets.length > 0)
  const headerBlock = showHeader && (title || subtitle) ? (
    <div>
      {title ? <h1 className="text-2xl font-semibold tracking-tight">{title}</h1> : null}
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  ) : null

  // Controls sit inline on the header row (right-aligned) — no separate band, so
  // there's no empty gap above the content.
  const topRow = (headerBlock || hasControls) ? (
    <div className="flex items-start justify-between gap-4">
      {headerBlock ?? <span />}
      {hasControls ? (
        <div className="flex shrink-0 items-center gap-2">
          {customizable && widgets.length > 0 ? (
            <DashboardCustomizeMenu
              widgets={widgets}
              visibleIds={visibleIds}
              onToggle={setVisible}
              onReset={reset}
              label={customizeLabel}
            />
          ) : null}
          {rangeOpts ? <DashboardRangeControl /> : null}
        </div>
      ) : null}
    </div>
  ) : null

  const content = (
    <div className={className ?? 'space-y-6 p-6'}>
      {topRow}

      {widgets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>Your dashboard will show key metrics and information here.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enable plugins or register dashboard widgets to populate this view.
            </p>
          </CardContent>
        </Card>
      ) : laidOut.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            All widgets are hidden. Use “Customize” to choose what to show.
          </CardContent>
        </Card>
      ) : (
        <DashboardGrid items={toGridItems(laidOut)} />
      )}
    </div>
  )

  const navWrapped = onNavigate
    ? <DashboardNavigateProvider value={onNavigate}>{content}</DashboardNavigateProvider>
    : content

  return rangeOpts
    ? (
      <DashboardRangeProvider options={rangeOpts.options} defaultRange={rangeOpts.default} onChange={rangeOpts.onChange}>
        {navWrapped}
      </DashboardRangeProvider>
    )
    : navWrapped
}
