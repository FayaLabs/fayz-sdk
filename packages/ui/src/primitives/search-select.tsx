import * as React from 'react'
import { Search, X, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '../utils/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchSelectOption {
  id: string
  label: string
  subtitle?: string
  icon?: React.ReactNode
  group?: string
  disabled?: boolean
  data?: any
}

export interface SearchSelectProps {
  /** Currently selected option ID */
  value?: string
  /** Display text when a value is selected (overrides auto-lookup) */
  displayValue?: string
  /** Callback when an option is selected */
  onChange: (id: string, option: SearchSelectOption | null) => void
  /** Search function — async or sync. Called with debounced query. */
  onSearch: (query: string) => Promise<SearchSelectOption[]> | SearchSelectOption[]
  /** Placeholder text */
  placeholder?: string
  /** Label above the input */
  label?: string
  /** Required field indicator */
  required?: boolean
  /** Debounce delay in ms (default: 250) */
  debounce?: number
  /** Minimum characters before searching (default: 1) */
  minChars?: number
  /** Show a "Create new" action at the bottom */
  allowCreate?: boolean
  /** Label for create action (default: "Add") */
  createLabel?: string
  /** Callback when create is clicked. Can be async — component shows optimistic state while waiting. */
  onCreate?: (query: string) => void | Promise<void>
  /** Custom render for each option */
  renderOption?: (option: SearchSelectOption) => React.ReactNode
  /** Load initial results when dropdown opens (calls onSearch('')) */
  loadOnOpen?: boolean
  /** Additional className for the container */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchSelect({
  value,
  displayValue,
  onChange,
  onSearch,
  placeholder = 'Search...',
  label,
  required,
  debounce = 250,
  minChars = 1,
  allowCreate,
  createLabel = 'Add',
  onCreate,
  renderOption,
  loadOnOpen,
  className,
  disabled,
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchSelectOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState(displayValue ?? '')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>()

  // Close on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Update display when value/displayValue changes externally
  React.useEffect(() => {
    if (displayValue !== undefined) setSelectedLabel(displayValue)
  }, [displayValue])

  // Load initial results when dropdown opens with empty query
  React.useEffect(() => {
    if (open && loadOnOpen && query.length === 0 && results.length === 0 && !loading) {
      setLoading(true)
      Promise.resolve(onSearch('')).then(setResults).catch(() => setResults([])).finally(() => setLoading(false))
    }
  }, [open, loadOnOpen])

  function handleQueryChange(q: string) {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (q.length < minChars && !(loadOnOpen && q.length === 0)) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await onSearch(q)
        setResults(res)
      } catch {
        setResults([])
      }
      setLoading(false)
    }, debounce)
  }

  function handleSelect(option: SearchSelectOption) {
    onChange(option.id, option)
    setSelectedLabel(option.label)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  function handleClear() {
    onChange('', null)
    setSelectedLabel('')
    setQuery('')
    setResults([])
  }

  async function handleCreate(name: string) {
    if (!onCreate) return
    setCreating(true)
    setSelectedLabel(name)
    setOpen(false)
    setQuery('')
    setResults([])
    try {
      await onCreate(name)
    } finally {
      setCreating(false)
    }
  }

  function handleOpen() {
    if (disabled || creating) return
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Group results
  const groups = React.useMemo(() => {
    const map = new Map<string, SearchSelectOption[]>()
    for (const opt of results) {
      const group = opt.group ?? ''
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(opt)
    }
    return map
  }, [results])

  const hasValue = !!value && !!selectedLabel
  const showDropdown = open && query.length >= minChars

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground">
          {label}{required && ' *'}
        </label>
      )}

      {/* Trigger — shows selected value or search input */}
      <div
        className={cn(
          'mt-1 flex items-center gap-2 rounded-lg border bg-background transition-colors',
          open ? 'ring-2 ring-primary/20' : 'hover:bg-muted/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground ml-3 shrink-0" />
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
            }}
          />
        ) : (
          <button
            type="button"
            onClick={handleOpen}
            className="flex-1 text-left py-2 pr-3 text-sm outline-none"
            disabled={disabled || creating}
          >
            {creating ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="font-medium text-foreground">{selectedLabel}</span>
              </span>
            ) : hasValue ? (
              <span className="font-medium">{selectedLabel}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </button>
        )}
        {hasValue && !open && (
          <button onClick={handleClear} className="pr-3 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
        {!hasValue && !open && (
          <ChevronDown className="h-3 w-3 text-muted-foreground mr-3 shrink-0" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-muted-foreground">No results for "{query}"</p>
              {allowCreate && onCreate && (
                <button
                  onClick={() => handleCreate(query)}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  + {createLabel} "{query}"
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-64 overflow-auto py-1">
              {[...groups.entries()].map(([group, options]) => (
                <React.Fragment key={group}>
                  {group && (
                    <div className="sticky top-0 bg-muted/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </div>
                  )}
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect(opt)}
                      disabled={opt.disabled}
                      className={cn(
                        'w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2.5',
                        opt.disabled && 'opacity-40 cursor-not-allowed',
                        opt.id === value && 'bg-muted/30',
                      )}
                    >
                      {renderOption ? renderOption(opt) : (
                        <>
                          {opt.icon}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{opt.label}</p>
                            {opt.subtitle && <p className="text-[10px] text-muted-foreground truncate">{opt.subtitle}</p>}
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </React.Fragment>
              ))}
              {allowCreate && onCreate && (
                <button
                  onClick={() => handleCreate(query)}
                  className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-muted/50 transition-colors border-t"
                >
                  + {createLabel} "{query}"
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
