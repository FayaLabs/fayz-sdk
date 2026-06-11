import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ---------------------------------------------------------------------------
// Inject animations once
// ---------------------------------------------------------------------------

const STYLE_ID = 'saas-floating-panel'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes _fp-dismiss { from { opacity:1; transform:scale(1) } to { opacity:0; transform:scale(.96) } }
    @keyframes _fp-expand  { from { opacity:1; transform:scale(1) } to { opacity:0; transform:scale(1.08) } }
    .saas-fp-dismissing { animation: _fp-dismiss 150ms ease-in forwards; pointer-events: none }
    .saas-fp-expanding  { animation: _fp-expand 200ms ease-in forwards; pointer-events: none }
  `
  document.head.appendChild(s)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'visible' | 'dismissing' | 'expanding'

export interface FloatingPanelRef {
  /** Dismiss with fade-out, then call onClose */
  dismiss: () => void
  /** Expand-out animation (e.g. popover → modal), then call callback */
  expandThen: (callback: () => void) => void
}

interface FloatingPanelProps {
  position: { x: number; y: number }
  width: number
  height: number
  /** Offset from cursor (default: { x: 0, y: 0 }) */
  offset?: { x: number; y: number }
  onClose: () => void
  className?: string
  children: (ref: FloatingPanelRef) => React.ReactNode
  zIndex?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FloatingPanel({
  position, width, height, offset, onClose, className, children, zIndex = 100,
}: FloatingPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('visible')
  const phaseRef = useRef<Phase>('visible')
  phaseRef.current = phase
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const expandCallbackRef = useRef<(() => void) | null>(null)

  const dismiss = useCallback(() => {
    if (phaseRef.current !== 'visible') return
    setPhase('dismissing')
    setTimeout(() => onCloseRef.current(), 150)
  }, [])

  const expandThen = useCallback((callback: () => void) => {
    if (phaseRef.current !== 'visible') return
    expandCallbackRef.current = callback
    setPhase('expanding')
    setTimeout(() => {
      callback()
      onCloseRef.current()
    }, 220)
  }, [])

  // Outside click + Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (phaseRef.current !== 'visible') return
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Don't dismiss if clicking another calendar event — let eventClick handle it
        const target = e.target as HTMLElement
        if (target.closest('.fc-event')) return
        dismiss()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [dismiss])

  // Clamp position to viewport
  const ox = offset?.x ?? 0
  const oy = offset?.y ?? 0
  let x = position.x + ox
  let y = position.y + oy
  if (x + width > window.innerWidth - 12) x = x - width - ox * 2
  if (y + height > window.innerHeight - 12) y = y - height - oy * 2
  if (x < 12) x = 12
  if (y < 12) y = 12

  const panelRef: FloatingPanelRef = { dismiss, expandThen }

  return createPortal(
    <div ref={ref}
      style={{ position: 'fixed', left: x, top: y, zIndex, transition: phase === 'visible' ? 'left 200ms ease-out, top 200ms ease-out' : undefined }}
      className={`rounded-modal border border-border bg-popover shadow-lg overflow-hidden ${
        phase === 'expanding' ? 'saas-fp-expanding'
        : phase === 'dismissing' ? 'saas-fp-dismissing'
        : 'animate-in fade-in zoom-in-95 duration-150'
      } ${className ?? ''}`}>
      {children(panelRef)}
    </div>,
    document.body,
  )
}
