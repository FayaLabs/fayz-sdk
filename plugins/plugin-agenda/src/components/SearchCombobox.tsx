import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus } from 'lucide-react'

// ---------------------------------------------------------------------------
// Reusable search combobox with keyboard navigation + optional create
// ---------------------------------------------------------------------------

export interface ComboboxOption {
  id: string
  label: string
  subtitle?: string
  price?: number
  data?: Record<string, unknown>
}

interface SearchComboboxProps {
  value: string
  onChange: (value: string) => void
  onSelect: (option: ComboboxOption) => void
  options: ComboboxOption[]
  placeholder?: string
  autoFocus?: boolean
  onBlurEmpty?: () => void
  renderRight?: (option: ComboboxOption) => React.ReactNode
  /** Show a "+ Create ..." option when search has no exact match */
  allowCreate?: boolean
  /** Called when user clicks the create option. Receives the current search text. */
  onCreateNew?: (searchText: string) => void
  /** Label for the create option (default: 'Create') */
  createLabel?: string
  className?: string
  /** Minimal style — no border/bg, just underline on focus. For inline use. */
  minimal?: boolean
  /** Inline label shown when collapsed. Click reveals the search input. */
  inlineLabel?: string
  /** Icon for the inline label: 'search' (default) or 'plus' (for "add" actions) */
  inlineIcon?: 'search' | 'plus'
  /** Show a loading skeleton in the dropdown while results are being fetched */
  loading?: boolean
  /** Called when the input gains focus */
  onFocus?: () => void
}

export function SearchCombobox({
  value, onChange, onSelect, options, placeholder, autoFocus, onBlurEmpty,
  renderRight, allowCreate, onCreateNew, createLabel = 'Create', className, minimal, inlineLabel, inlineIcon = 'search',
  loading, onFocus: onFocusProp,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [expanded, setExpanded] = useState(!inlineLabel)
  const [dropRect, setDropRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // When value is set externally (e.g. edit mode), auto-expand; collapse when cleared
  useEffect(() => {
    if (value && inlineLabel) setExpanded(true)
    if (!value && inlineLabel && !open) setExpanded(false)
  }, [value, open])

  function updateRect() {
    if (wrapperRef.current) setDropRect(wrapperRef.current.getBoundingClientRect())
  }

  // Show create option only when dropdown is open, has text, and no exact match
  const showCreate = open && allowCreate && onCreateNew && value.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === value.trim().toLowerCase())

  const totalItems = options.length + (showCreate ? 1 : 0)

  useEffect(() => { setActiveIndex(-1) }, [options])
  useEffect(() => {
    if ((options.length > 0 || showCreate || loading) && document.activeElement === inputRef.current) setOpen(true)
  }, [options, showCreate, loading])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || totalItems === 0) {
      if (e.key === 'ArrowDown' && totalItems > 0) {
        e.preventDefault()
        setOpen(true)
        setActiveIndex(0)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % totalItems)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < options.length) {
          onSelect(options[activeIndex])
          setOpen(false)
          setActiveIndex(-1)
        } else if (showCreate && activeIndex === options.length) {
          onCreateNew?.(value.trim())
          setOpen(false)
          setActiveIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }, [open, options, totalItems, activeIndex, onSelect, showCreate, onCreateNew, value])

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const items = listRef.current.children
    if (items[activeIndex]) (items[activeIndex] as HTMLElement).scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      setActiveIndex(-1)
      if (!value && onBlurEmpty) onBlurEmpty()
      if (!value && inlineLabel) setExpanded(false)
    }, 200)
  }

  const hasDropdown = open && (options.length > 0 || showCreate || loading)

  // Collapsed inline label — click to expand
  if (!expanded && inlineLabel) {
    const isPlus = inlineIcon === 'plus'
    return (
      <button type="button" onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className={`flex items-center gap-1.5 w-full text-left text-sm py-1.5 pl-2 transition-colors ${
          isPlus ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-foreground'
        } ${className ?? ''}`}>
        {isPlus && <Plus className="h-3.5 w-3.5 shrink-0" />}
        {inlineLabel}
      </button>
    )
  }

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      {!minimal && (
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); updateRect(); setOpen(true) }}
        onFocus={() => { updateRect(); onFocusProp?.(); if (options.length > 0 || showCreate || loading) setOpen(true) }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={minimal
          ? 'w-full bg-transparent pl-2 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none border-b border-transparent hover:border-border focus:border-foreground transition-colors'
          : 'w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
        }
        role="combobox"
        aria-expanded={hasDropdown}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `combobox-opt-${activeIndex}` : undefined}
      />
      {hasDropdown && dropRect && createPortal(
        <div ref={listRef} role="listbox" data-modal-passthrough
          style={{ position: 'fixed', left: dropRect.left, top: dropRect.bottom + 4, width: dropRect.width, zIndex: 9999, pointerEvents: 'auto' }}
          className="max-h-52 overflow-y-auto rounded-lg border bg-popover shadow-lg py-0.5 animate-in fade-in zoom-in-95 duration-100">
          {loading && options.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <svg className="h-3.5 w-3.5 animate-spin shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
                <path d="M14.5 8a6.5 6.5 0 00-6.5-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Buscando…</span>
            </div>
          )}
          {options.map((opt, i) => (
            <div key={opt.id} id={`combobox-opt-${i}`} role="option" aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); onSelect(opt); setOpen(false) }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === activeIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
              }`}>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{opt.label}</p>
                {opt.subtitle && <p className="truncate text-[11px] text-muted-foreground">{opt.subtitle}</p>}
              </div>
              {renderRight && <div className="shrink-0">{renderRight(opt)}</div>}
            </div>
          ))}
          {showCreate && (
            <div id={`combobox-opt-${options.length}`} role="option" aria-selected={activeIndex === options.length}
              onMouseDown={(e) => { e.preventDefault(); onCreateNew?.(value.trim()); setOpen(false) }}
              onMouseEnter={() => setActiveIndex(options.length)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors border-t ${
                activeIndex === options.length ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
              }`}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>{createLabel} &ldquo;<span className="font-medium">{value.trim()}</span>&rdquo;</span>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
