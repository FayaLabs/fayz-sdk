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

  // Broadcast visibility to the module-level signal (for the ToastProvider).
  React.useEffect(() => { setSaveBarVisibleSignal(state.visible) }, [state.visible])

  // Cmd/Ctrl+Enter submits the active (dirty) form from anywhere on the page.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && state.visible && !state.saving) {
        e.preventDefault()
        handlers.current.onSave?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.visible, state.saving])

  return (
    <SaveBarApiContext.Provider value={api}>
      <SaveBarStateContext.Provider value={state}>
        {children}
      </SaveBarStateContext.Provider>
    </SaveBarApiContext.Provider>
  )
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
