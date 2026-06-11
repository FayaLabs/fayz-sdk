import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '../utils/cn'

// ---------------------------------------------------------------------------
// Inject sheet animations once (module-level side effect)
// ---------------------------------------------------------------------------

const STYLE_ID = 'saas-sheet-styles'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes saas-sheet-fade-in { from { opacity: 0 } to { opacity: 1 } }
    @keyframes saas-sheet-fade-out { from { opacity: 1 } to { opacity: 0 } }
    @keyframes saas-sheet-slide-in { from { transform: translateX(100%) } to { transform: translateX(0) } }
    @keyframes saas-sheet-slide-out { from { transform: translateX(0) } to { transform: translateX(100%) } }
    .saas-sheet-overlay[data-state="open"] { animation: saas-sheet-fade-in 200ms ease-out }
    .saas-sheet-overlay[data-state="closed"] { animation: saas-sheet-fade-out 150ms ease-in }
    .saas-sheet-content[data-state="open"] { animation: saas-sheet-slide-in 280ms cubic-bezier(0.16, 1, 0.3, 1) }
    .saas-sheet-content[data-state="closed"] { animation: saas-sheet-slide-out 200ms ease-in }
  `
  document.head.appendChild(style)
}

// ---------------------------------------------------------------------------
// Root, Trigger, Close — re-exported from Radix
// ---------------------------------------------------------------------------

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'saas-sheet-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]',
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

// ---------------------------------------------------------------------------
// Content — slides in from the right
// ---------------------------------------------------------------------------

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Width class override — defaults to max-w-md */
    width?: string
    /** Hide the built-in close button */
    hideClose?: boolean
    /** Overlay style: "blur" (default), "dim" (no blur), "none" (transparent) */
    overlay?: 'blur' | 'dim' | 'none'
  }
>(({ className, children, width, hideClose, overlay = 'blur', ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay className={overlay === 'none' ? 'bg-transparent backdrop-blur-0' : overlay === 'dim' ? 'backdrop-blur-0' : undefined} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'saas-sheet-content fixed inset-y-0 right-0 z-50 flex flex-col border-l bg-card shadow-2xl outline-none',
        'w-full',
        width ?? 'max-w-md',
        className
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = 'SheetContent'

// ---------------------------------------------------------------------------
// Header — top section with title + description
// ---------------------------------------------------------------------------

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 px-5 py-4 border-b shrink-0', className)}
      {...props}
    />
  )
}
SheetHeader.displayName = 'SheetHeader'

// ---------------------------------------------------------------------------
// Footer — bottom section for actions
// ---------------------------------------------------------------------------

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 px-5 py-3 border-t shrink-0', className)}
      {...props}
    />
  )
}
SheetFooter.displayName = 'SheetFooter'

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-sm font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'

// ---------------------------------------------------------------------------
// Body — scrollable content area
// ---------------------------------------------------------------------------

function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto px-5 py-5', className)}
      {...props}
    />
  )
}
SheetBody.displayName = 'SheetBody'

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
