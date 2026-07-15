import { createStore, type StoreApi } from 'zustand/vanilla'
import { getActiveTenantId } from '@fayz-ai/core'
import type {
  ContentPlan,
  ContentPlannerProvider,
  ContentPost,
  SaveContentPlanInput,
  SaveContentPostInput,
  SaveSocialAccountInput,
  SocialAccount,
} from '../../data/contentTypes'

// ---------------------------------------------------------------------------
// Content-planner UI state — separate from the analytics store on purpose:
// the Conteúdo tab loads lazily on first visit and never gates (or is gated
// by) the overview's five analytics fetches.
// ---------------------------------------------------------------------------

export type BoardViewMode = 'board' | 'calendar' | 'list'

export interface ContentPlannerUIState {
  loaded: boolean
  loading: boolean
  /** Tenant the current data was loaded for. The tenant hydrates async after
   *  login/refresh, so views re-load when this diverges from the active one. */
  loadedTenantId: string | null
  /** Board / calendar / list — survives opening a post and coming back. */
  viewMode: BoardViewMode
  setViewMode(mode: BoardViewMode): void
  accounts: SocialAccount[]
  activeAccountId: string | null
  plans: ContentPlan[]
  activePlan: ContentPlan | null
  posts: ContentPost[]

  load(): Promise<void>
  setAccount(accountId: string): Promise<void>
  selectPlan(planId: string): Promise<void>
  saveAccount(input: SaveSocialAccountInput): Promise<SocialAccount>
  deleteAccount(id: string): Promise<void>
  savePlan(input: SaveContentPlanInput): Promise<ContentPlan>
  savePost(input: SaveContentPostInput): Promise<ContentPost>
  deletePost(id: string): Promise<void>
}

export function createContentPlannerStore(
  provider: ContentPlannerProvider,
): StoreApi<ContentPlannerUIState> {
  async function loadPlansFor(accountId: string): Promise<{ plans: ContentPlan[]; activePlan: ContentPlan | null; posts: ContentPost[] }> {
    const plans = await provider.listPlans(accountId)
    const activePlan = plans.find((p) => p.status === 'active') ?? plans[0] ?? null
    const posts = activePlan ? await provider.listPosts(activePlan.id) : []
    return { plans, activePlan, posts }
  }

  return createStore<ContentPlannerUIState>((set, get) => ({
    loaded: false,
    loading: false,
    loadedTenantId: null,
    viewMode: 'board',
    setViewMode(mode) { set({ viewMode: mode }) },
    accounts: [],
    activeAccountId: null,
    plans: [],
    activePlan: null,
    posts: [],

    async load() {
      if (get().loading) return
      set({ loading: true })
      try {
        const accounts = await provider.listAccounts()
        const current = get().activeAccountId
        const activeAccountId = (current && accounts.some((a) => a.id === current) ? current : accounts[0]?.id) ?? null
        const { plans, activePlan, posts } = activeAccountId
          ? await loadPlansFor(activeAccountId)
          : { plans: [], activePlan: null, posts: [] }
        set({
          accounts, activeAccountId, plans, activePlan, posts,
          loaded: true, loading: false,
          loadedTenantId: getActiveTenantId() ?? null,
        })
      } catch (err) {
        set({ loading: false, loaded: true })
        throw err
      }
    },

    async setAccount(accountId) {
      set({ activeAccountId: accountId, loading: true })
      try {
        const { plans, activePlan, posts } = await loadPlansFor(accountId)
        set({ plans, activePlan, posts, loading: false })
      } catch (err) {
        set({ loading: false })
        throw err
      }
    },

    async selectPlan(planId) {
      const plan = get().plans.find((p) => p.id === planId) ?? null
      const posts = plan ? await provider.listPosts(plan.id) : []
      set({ activePlan: plan, posts })
    },

    async saveAccount(input) {
      const account = await provider.saveAccount(input)
      const accounts = await provider.listAccounts()
      set({ accounts })
      if (!get().activeAccountId) await get().setAccount(account.id)
      return account
    },

    async deleteAccount(id) {
      await provider.deleteAccount(id)
      const accounts = await provider.listAccounts()
      const wasActive = get().activeAccountId === id
      set({ accounts })
      if (wasActive) {
        const next = accounts[0]?.id ?? null
        if (next) {
          await get().setAccount(next)
        } else {
          set({ activeAccountId: null, plans: [], activePlan: null, posts: [] })
        }
      }
    },

    async savePlan(input) {
      const plan = await provider.savePlan(input)
      const accountId = get().activeAccountId
      if (accountId) {
        const plans = await provider.listPlans(accountId)
        const activePlan = plans.find((p) => p.id === plan.id) ?? get().activePlan
        const posts = activePlan ? await provider.listPosts(activePlan.id) : []
        set({ plans, activePlan, posts })
      }
      return plan
    },

    async savePost(input) {
      const post = await provider.savePost(input)
      const planId = get().activePlan?.id
      if (planId && post.planId === planId) {
        const posts = await provider.listPosts(planId)
        set({ posts })
      }
      return post
    },

    async deletePost(id) {
      await provider.deletePost(id)
      const planId = get().activePlan?.id
      if (planId) {
        const posts = await provider.listPosts(planId)
        set({ posts })
      }
    },
  }))
}
