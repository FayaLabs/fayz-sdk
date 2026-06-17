import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '@fayz-ai/core'
import { cn } from '../utils/cn'

// ---------------------------------------------------------------------------
// SaveBar — the single, app-wide "Unsaved changes" floating island. A form
// declares its state via useSaveBar({ dirty, saving, onSave, onDiscard }); the
// shell renders ONE <SaveBar/> (centered, floating above the content area) that
// appears whenever the active form is dirty. Mirrors the BackStyleProvider /
// PageHeaderActions idiom: decide-once at the shell, hook-in at the page.
//
// Handlers live in a ref (not state) so per-render closure changes never cause
// re-render loops; only the primitive `dirty`/`saving` flags drive visibility.
// ---------------------------------------------------------------------------

export interface SaveBarRegistration {
  /** Show the bar when true (form has unsaved changes). */
  dirty: boolean
  /** Save in progress — disables buttons and shows a spinner. */
  saving?: boolean
  onSave: () => void
  onDiscard?: () => void
  /** Override the "Unsaved changes" message. */
  message?: string
  /** Override the Save / Discard button labels. */
  saveLabel?: string
  discardLabel?: string
}

interface SaveBarState {
  visible: boolean
  saving: boolean
  message?: string
  saveLabel?: string
  discardLabel?: string
}

interface SaveBarApi {
  setState: React.Dispatch<React.SetStateAction<SaveBarState>>
  handlers: React.MutableRefObject<{ onSave?: () => void; onDiscard?: () => void }>
}

// Two contexts on purpose: the API context is STABLE (so useSaveBar's effect
// deps don't change every render → no loop), the state context changes to
// re-render only <SaveBar/>.
const SaveBarApiContext = React.createContext<SaveBarApi | null>(null)
const SaveBarStateContext = React.createContext<SaveBarState>({ visible: false, saving: false })

// Module-level "is the SaveBar showing" signal so sibling UI that isn't a
// descendant of SaveBarProvider (e.g. the ToastProvider) can react to it —
// used to lift toasts above the bar so they stack instead of overlapping.
let _saveBarVisible = false
const _saveBarSubs = new Set<() => void>()
function setSaveBarVisibleSignal(v: boolean) {
  if (v === _saveBarVisible) return
  _saveBarVisible = v
  _saveBarSubs.forEach((fn) => fn())
}

/** Subscribe to whether the floating SaveBar is currently on screen. */
export function useSaveBarVisible(): boolean {
  return React.useSyncExternalStore(
    (cb) => { _saveBarSubs.add(cb); return () => { _saveBarSubs.delete(cb) } },
    () => _saveBarVisible,
    () => false,
  )
}

export function SaveBarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SaveBarState>({ visible: false, saving: false })
  const handlers = React.useRef<{ onSave?: () => void; onDiscard?: () => void }>({})
  const api = React.useMemo<SaveBarApi>(() => ({ setState, handlers }), [])

  // Stack of registered back-navigation handlers (latest-mounted wins) so the
  // app-wide Escape key can navigate "up" to the parent route. Lives here, next
  // to the SaveBar handlers, so ONE keydown listener arbitrates both — Escape
  // discards a dirty form first, and only navigates back when none is open.
  const backStack = React.useRef<React.MutableRefObject<(() => void) | undefined>[]>([])
  const backApi = React.useMemo<BackNavApi>(() => ({ stack: backStack }), [])

  // Broadcast visibility to the module-level signal (for the ToastProvider).
  React.useEffect(() => { setSaveBarVisibleSignal(state.visible) }, [state.visible])

  // App-wide keyboard shortcuts, arbitrated in one place:
  //   • Cmd/Ctrl+Enter → save the active (dirty) form
  //   • Escape (form dirty) → discard the form
  //   • Escape (no dirty form) → navigate back to the parent route
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (state.visible && !state.saving) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          handlers.current.onSave?.()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          handlers.current.onDiscard?.()
        }
        return
      }
      // No open/dirty form — Escape walks "up" via the topmost back handler.
      if (e.key === 'Escape' && !e.defaultPrevented && !isEditableTarget(e.target)) {
        for (let i = backStack.current.length - 1; i >= 0; i--) {
          const back = backStack.current[i].current
          if (back) { e.preventDefault(); back(); return }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.visible, state.saving])

  return (
    <SaveBarApiContext.Provider value={api}>
      <BackNavApiContext.Provider value={backApi}>
        <SaveBarStateContext.Provider value={state}>
          {children}
        </SaveBarStateContext.Provider>
      </BackNavApiContext.Provider>
    </SaveBarApiContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Back-navigation registry — lets any subpage register its "go to parent" action
// so the shell's single Escape handler can drive it (see SaveBarProvider above).
// SubpageHeader already receives onBack, so wiring it there gives every plugin
// detail page Escape-to-parent for free, with zero per-plugin code.
// ---------------------------------------------------------------------------

interface BackNavApi {
  stack: React.MutableRefObject<React.MutableRefObject<(() => void) | undefined>[]>
}
const BackNavApiContext = React.createContext<BackNavApi | null>(null)

/** True when the keyboard event originates from a field where Escape has its
 *  own meaning (clear/close), so we shouldn't hijack it for back-navigation. */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

/**
 * Register a back-navigation handler with the app-wide Escape key. Call it in a
 * subpage (or pass through SubpageHeader's onBack); while mounted, pressing
 * Escape with no dirty form open invokes the most-recently-registered handler.
 * Pass `undefined` to opt out (e.g. a top-level page with nothing to go back to).
 */
export function useBackHandler(onBack?: () => void): void {
  const api = React.useContext(BackNavApiContext)
  // Hold the latest closure in a ref so re-renders don't churn the stack.
  const ref = React.useRef(onBack)
  React.useEffect(() => { ref.current = onBack })
  React.useEffect(() => {
    if (!api) return
    const stack = api.stack.current
    stack.push(ref)
    return () => {
      const i = stack.indexOf(ref)
      if (i !== -1) stack.splice(i, 1)
    }
  }, [api])
}

/**
 * Register the current form with the app-wide SaveBar. Call it unconditionally
 * in a form view; it shows the island while `dirty`, keeps handlers current, and
 * hides the island automatically when the form unmounts (e.g. on navigation).
 */
export function useSaveBar({ dirty, saving = false, onSave, onDiscard, message, saveLabel, discardLabel }: SaveBarRegistration): void {
  const api = React.useContext(SaveBarApiContext)

  // Keep latest handlers in the shared ref (no state churn from new closures).
  React.useEffect(() => {
    if (api) api.handlers.current = { onSave, onDiscard }
  })

  // Drive visibility from primitives only; `api` is stable → no render loops.
  React.useEffect(() => {
    if (!api) return
    api.setState({ visible: dirty, saving, message, saveLabel, discardLabel })
    return () => api.setState((s) => ({ ...s, visible: false }))
  }, [api, dirty, saving, message, saveLabel, discardLabel])
}

/** The floating island. Rendered once by the shell inside the content column. */
export function SaveBar({ className }: { className?: string }) {
  const state = React.useContext(SaveBarStateContext)
  const api = React.useContext(SaveBarApiContext)
  const t = useTranslation()

  // Keep the island mounted through its exit animation: `rendered` lags behind
  // `visible` so we can play fade-out before unmounting.
  const [rendered, setRendered] = React.useState(state.visible)
  const [closing, setClosing] = React.useState(false)

  React.useEffect(() => {
    if (state.visible) {
      setRendered(true)
      setClosing(false)
      return
    }
    if (!rendered) return
    setClosing(true)
    const id = setTimeout(() => { setRendered(false); setClosing(false) }, 200)
    return () => clearTimeout(id)
  }, [state.visible, rendered])

  if (!api || !rendered) return null
  const { saving, message, saveLabel, discardLabel } = state

  return (
    <div className={cn('pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4', className)}>
      {/* Dark island for strong contrast against the light page (auto-inverts in dark mode). */}
      <div className={cn(
        'pointer-events-auto flex items-center gap-5 rounded-full bg-foreground py-2 pl-5 pr-2 text-background shadow-xl ring-1 ring-black/5 duration-200',
        closing ? 'animate-out fade-out slide-out-to-bottom-2' : 'animate-in fade-in slide-in-from-bottom-2',
      )}>
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          {message ?? t('saveBar.unsaved')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => api.handlers.current.onDiscard?.()}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-background/70 transition-colors hover:bg-background/10 hover:text-background disabled:opacity-50"
          >
            {discardLabel ?? t('common.discard')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => api.handlers.current.onSave?.()}
            className="inline-flex items-center rounded-full bg-background px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90 disabled:opacity-60"
          >
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {saveLabel ?? t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
