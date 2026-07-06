// ---------------------------------------------------------------------------
// Global quick-add trigger (FAY-1242).
//
// A tiny module-level store so a "log a transaction" request can be fired from
// ANYWHERE in the app (e.g. the app shell's elevated center "+" bottom-nav
// button) without a shared React context. The FinancialPage subscribes and
// opens its QuickTransactionForm when a request arrives; the request is a
// one-shot (consumed on read) so re-mounting /financial doesn't re-open it.
//
// Flow: center "+" → openQuickAdd() → navigate to /financial → FinancialPage
// mounts, sees the pending request, opens the sheet. If already on /financial
// the subscription fires and the sheet opens instantly.
// ---------------------------------------------------------------------------

import * as React from 'react'
import type { QuickTransactionType } from './types'

export interface QuickAddRequest {
  type: QuickTransactionType
  /** Foreground the receipt/attachment step + auto-open the picker. */
  receipt: boolean
}

let pending: QuickAddRequest | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

/** Fire a quick-add request from anywhere. Default = an expense. */
export function openQuickAdd(type: QuickTransactionType = 'expense', receipt = false): void {
  pending = { type, receipt }
  emit()
}

/** Read + clear the pending request (one-shot). */
export function consumeQuickAdd(): QuickAddRequest | null {
  const req = pending
  pending = null
  return req
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot(): QuickAddRequest | null {
  return pending
}

/** React binding — returns the pending request (null when none). */
export function usePendingQuickAdd(): QuickAddRequest | null {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
