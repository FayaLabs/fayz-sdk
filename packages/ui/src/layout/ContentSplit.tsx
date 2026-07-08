import * as React from 'react'
import { PanelRight, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle, SheetDescription,
} from '../primitives/sheet'

// ---------------------------------------------------------------------------
// ContentSplit — main content with a right-aligned companion panel, mobile
// first. Below `lg` the aside lives in a right Sheet (opened by a trigger the
// host places wherever fits — typically SubpageHeader actions, via
// <ContentSplitTrigger/>). From `lg` up it docks as a sticky right column.
//
// Pairs with SubpageHeader/ModulePage: the page keeps its own back-button
// header; ContentSplit only owns the columns below it. Reuse for any
// "document + operational panel" page (script + shooting checklist, form +
// help, detail + activity feed).
// ---------------------------------------------------------------------------

interface ContentSplitContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const ContentSplitContext = React.createContext<ContentSplitContextValue | null>(null)

export interface ContentSplitProps {
  /** Main column (the document). */
  children: React.ReactNode
  /** Companion panel content (the checklist / help / activity). */
  aside: React.ReactNode
  /** Panel title — Sheet header on mobile, card header on desktop. */
  asideTitle: React.ReactNode
  /** Optional subtitle under the title. */
  asideDescription?: React.ReactNode
  /** Desktop column width (defaults to 20rem). */
  asideWidth?: string
  /** Controlled mobile-sheet state; uncontrolled when omitted. */
  asideOpen?: boolean
  onAsideOpenChange?: (open: boolean) => void
  /** Desktop column can collapse into a slim reopen rail. */
  collapsible?: boolean
  /** Initial desktop collapsed state (e.g. expand only on the relevant day). */
  defaultCollapsed?: boolean
  className?: string
}

export function ContentSplit({
  children,
  aside,
  asideTitle,
  asideDescription,
  asideWidth = '20rem',
  asideOpen,
  onAsideOpenChange,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: ContentSplitProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = asideOpen ?? internalOpen
  const setOpen = onAsideOpenChange ?? setInternalOpen
  const [collapsed, setCollapsed] = React.useState(collapsible && defaultCollapsed)

  return (
    <ContentSplitContext.Provider value={{ open, setOpen }}>
      <div
        className={cn('lg:grid lg:items-start lg:gap-6', className)}
        style={{ gridTemplateColumns: `minmax(0, 1fr) ${collapsed ? 'auto' : asideWidth}` }}
      >
        <div className="min-w-0">{children}</div>

        {/* Desktop: docked sticky column (or slim reopen rail when collapsed) */}
        <aside className="hidden lg:block lg:sticky lg:top-4">
          {collapsed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCollapsed(false)}
              className="h-9 w-9 p-0"
              aria-label={typeof asideTitle === 'string' ? asideTitle : undefined}
              title={typeof asideTitle === 'string' ? asideTitle : undefined}
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          ) : (
            <div className="rounded-card border border-border bg-card">
              <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{asideTitle}</p>
                  {asideDescription && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{asideDescription}</p>
                  )}
                </div>
                {collapsible && (
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    aria-label="collapse"
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="p-4">{aside}</div>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile: right sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent width="max-w-sm">
            <SheetHeader>
              <SheetTitle>{asideTitle}</SheetTitle>
              {asideDescription && <SheetDescription>{asideDescription}</SheetDescription>}
            </SheetHeader>
            <SheetBody>{aside}</SheetBody>
          </SheetContent>
        </Sheet>
      </div>
    </ContentSplitContext.Provider>
  )
}

export interface ContentSplitTriggerProps {
  /** Accessible label; also the visible text unless `iconOnly`. */
  label: React.ReactNode
  iconOnly?: boolean
  className?: string
}

/** Opens the mobile aside sheet. Renders nothing from `lg` up (the panel is
 *  already docked). Place inside SubpageHeader `actions` or any toolbar. */
export function ContentSplitTrigger({ label, iconOnly, className }: ContentSplitTriggerProps) {
  const ctx = React.useContext(ContentSplitContext)
  if (!ctx) return null
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => ctx.setOpen(true)}
      className={cn('lg:hidden', className)}
      aria-label={typeof label === 'string' ? label : undefined}
    >
      <PanelRight className={cn('h-4 w-4', !iconOnly && 'mr-1.5')} />
      {!iconOnly && label}
    </Button>
  )
}
