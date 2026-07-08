// ---------------------------------------------------------------------------
// Content planner — domain types + provider seam. Deliberately separate from
// MarketingDataProvider: analytics is mock-until-bridges, while the planner is
// a real CRUD surface (Supabase-backed via createSafeDataProvider). The
// interface must stay methods-only (the safe-provider Proxy turns every
// property access into a call).
// ---------------------------------------------------------------------------

export type PostFormat = 'reel' | 'static' | 'carousel' | 'story' | 'video' | 'live' | 'article'

/** Platforms an account can publish to. UI-driven list (the DB stores plain
 *  text[]), so growing it is a one-line change here. */
export const PLATFORMS = [
  'instagram',
  'tiktok',
  'youtube',
  'facebook',
  'linkedin',
  'x',
  'pinterest',
  'threads',
] as const
export type Platform = (typeof PLATFORMS)[number]

export type PostStatus = 'idea' | 'script' | 'recording' | 'editing' | 'scheduled' | 'published'

export const POST_STATUS_ORDER: PostStatus[] = ['idea', 'script', 'recording', 'editing', 'scheduled', 'published']

export interface SocialAccount {
  id: string
  name: string
  handle?: string
  /** Platforms this account/brand publishes to (one account, many connections). */
  platforms: string[]
  isActive: boolean
}

export interface ContentPlan {
  id: string
  accountId: string
  name: string
  status: 'draft' | 'active' | 'archived'
  weeksCount: number
  startDate?: string
  /** Structured "what we want" config — feeds chips + future AI drafting. */
  objective?: string
  tone?: string
  pillars: string[]
  formats: PostFormat[]
  weeklyFrequency: number
  /** Free-form brief/strategy document (markdown). */
  briefMd: string
}

/** Recording-day checklist item (on-set companion). */
export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface ContentPost {
  id: string
  planId: string
  weekNumber: number
  position: number
  title: string
  format: PostFormat
  status: PostStatus
  scheduledDate?: string
  /** Target platforms for this post; empty = inherit the account's platforms. */
  platforms: string[]
  /** Recording-day checklist — persisted as the crew checks items off. */
  checklist: ChecklistItem[]
  /** Uploaded asset URL (static posts: caption + final art instead of a script). */
  mediaUrl?: string
  hook?: string
  cta?: string
  /** The Notion-style page body — the script/plan in markdown. */
  contentMd: string
  updatedAt?: string
}

export interface SaveSocialAccountInput {
  id?: string
  name: string
  handle?: string
  platforms?: string[]
  isActive?: boolean
}

export interface SaveContentPlanInput {
  id?: string
  accountId?: string
  name?: string
  status?: ContentPlan['status']
  weeksCount?: number
  startDate?: string | null
  objective?: string
  tone?: string
  pillars?: string[]
  formats?: PostFormat[]
  weeklyFrequency?: number
  briefMd?: string
}

export interface SaveContentPostInput {
  id?: string
  planId?: string
  weekNumber?: number
  position?: number
  title?: string
  format?: PostFormat
  status?: PostStatus
  scheduledDate?: string | null
  platforms?: string[]
  checklist?: ChecklistItem[]
  mediaUrl?: string | null
  hook?: string
  cta?: string
  contentMd?: string
}

export interface ContentPlannerProvider {
  listAccounts(): Promise<SocialAccount[]>
  saveAccount(input: SaveSocialAccountInput): Promise<SocialAccount>
  /** Hard delete — plans and posts cascade with the account. */
  deleteAccount(id: string): Promise<void>
  listPlans(accountId: string): Promise<ContentPlan[]>
  getPlan(id: string): Promise<ContentPlan | null>
  savePlan(input: SaveContentPlanInput): Promise<ContentPlan>
  deletePlan(id: string): Promise<void>
  /** Ordered by week_number then position. */
  listPosts(planId: string): Promise<ContentPost[]>
  getPost(id: string): Promise<ContentPost | null>
  savePost(input: SaveContentPostInput): Promise<ContentPost>
  deletePost(id: string): Promise<void>
}
