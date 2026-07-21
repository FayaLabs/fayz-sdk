import { create } from 'zustand'

/**
 * Payload describing WHY the upgrade modal opened, so the visual component (owned
 * by the shell/gates layer) can tailor its copy — a hit quantity cap
 * (`limitKey`) or a plan-gated feature (`feature`).
 */
export interface UpgradeModalPayload {
  limitKey?: string
  feature?: string
}

export interface UpgradeModalStore {
  /** The active payload, or null when closed. */
  current: UpgradeModalPayload | null
  open(payload: UpgradeModalPayload): void
  close(): void
}

/**
 * Global, lightweight store for the single app-wide UpgradeModal. `useLimitGuard`
 * and imperative create handlers call `open(...)` when a limit blocks; the visual
 * modal (rendered once near the shell root by the gates layer) subscribes to
 * `current`. Kept as a zustand singleton so store + component share one instance.
 */
export const useUpgradeModalStore = create<UpgradeModalStore>((set) => ({
  current: null,
  open: (payload) => set({ current: payload }),
  close: () => set({ current: null }),
}))
