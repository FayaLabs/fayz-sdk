import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '../utils/cn'

// ---------------------------------------------------------------------------
// Animations are defined in styles.css under .saas-mdl-ov / .saas-mdl-ct
// selectors with [data-state="open"/"closed"]. Radix defers unmount when
// it detects animationName on the element — CSS must be loaded before render.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

const SIZE_MAP = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  full: 'sm:max-w-[calc(100vw-4rem)]',
} as const

type ModalSize = keyof typeof SIZE_MAP

// ---------------------------------------------------------------------------
// Primitives re-export
// ---------------------------------------------------------------------------

const Modal = DialogPrimitive.Root
const ModalTrigger = DialogPrimitive.Trigger
const ModalClose = DialogPrimitive.Close
const ModalPortal = DialogPrimitive.Portal

// ---------------------------------------------------------------------------
// Overlay — also serves as the flex centering wrapper
// ---------------------------------------------------------------------------

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'saas-mdl-ov fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]',
      'flex items-center justify-center p-0 sm:p-6',
      className,
    )}
    {...props}
  />
))
ModalOverlay.displayName = 'ModalOverlay'

// ---------------------------------------------------------------------------
// Content — rendered INSIDE the overlay (flex-centered)
// ---------------------------------------------------------------------------

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: ModalSize
    hideClose?: boolean
    noPadding?: boolean
  }
>(({ className, children, size = 'lg', hideClose, noPadding, onPointerDownOutside, onInteractOutside, onCloseAutoFocus, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay>
      <DialogPrimitive.Content
        ref={ref}
        onCloseAutoFocus={(e) => {
          // Prevent Radix from stealing focus back to the trigger element on close.
          // This interferes with FullCalendar's selection and other interactive components.
          e.preventDefault()
          onCloseAutoFocus?.(e)
        }}
        onPointerDownOutside={(e) => {
          // Prevent Radix from intercepting clicks on portaled dropdowns (DatePicker, TimePicker, etc.)
          const target = e.target as HTMLElement
          if (target.closest('[data-modal-passthrough]') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault()
          }
          onPointerDownOutside?.(e)
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-modal-passthrough]') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault()
          }
          onInteractOutside?.(e)
        }}
        className={cn(
          'saas-mdl-ct relative z-50 flex flex-col w-full bg-card shadow-2xl outline-none',
          // Mobile fullscreen
          'h-full rounded-none border-0',
          // Desktop centered card
          'sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-border/50',
          SIZE_MAP[size],
          noPadding ? '' : 'p-6 gap-4',
          className,
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
    </ModalOverlay>
  </ModalPortal>
))
ModalContent.displayName = 'ModalContent'

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function ModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left shrink-0', className)} {...props} />
}

function ModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto min-h-0', className)} {...props} />
}

function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 shrink-0', className)} {...props} />
}

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
))
ModalTitle.displayName = 'ModalTitle'

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
ModalDescription.displayName = 'ModalDescription'

export {
  Modal, ModalPortal, ModalOverlay, ModalClose, ModalTrigger,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription,
}
export type { ModalSize }
