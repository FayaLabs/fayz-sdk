// Builders come from @fayz-ai/db (single drizzle-orm instance) — never import
// pgTable/uuid directly from drizzle-orm/pg-core. See MIGRATION-ARCHITECTURE §6.
import {
  pgTable, uuid, text, boolean, integer, date, jsonb, index, uniqueIndex,
  numeric, timestamp,
  tenantId, timestamps, createdAt,
} from '@fayz-ai/db'

// ---------------------------------------------------------------------------
// Marketing plugin — Ring-1 schema (schema-as-code), content planner tables.
// RLS policies + grants are companion SQL (Drizzle doesn't diff those) —
// see src/migrations/001_content_planner.sql.
// ---------------------------------------------------------------------------

// Acquisition channels — tenant-owned rows seeded from the domain preset.
// `channel_key` is the stable preset/config id ('instagram', 'paid-search'…),
// aligned with plugin-crm's lead-sources where they overlap.
export const mktChannels = pgTable('plg_marketing_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  channelKey: text('channel_key').notNull(),
  label: text('label').notNull(),
  icon: text('icon'),
  kind: text('kind').notNull().default('organic'),
  isActive: boolean('is_active').notNull().default(true),
  monthlySpend: numeric('monthly_spend').notNull().default('0'),
  ...timestamps,
}, (t) => [
  index('idx_plg_marketing_channels_tenant').on(t.tenantId),
  uniqueIndex('u_plg_marketing_channels_tenant_key').on(t.tenantId, t.channelKey),
])

// Acquisition campaigns — real CRUD; performance is DERIVED at read time from
// v_marketing_attribution (channel match within the campaign window), only
// spend is stored.
export const mktCampaigns = pgTable('plg_marketing_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  name: text('name').notNull(),
  channelKey: text('channel_key').notNull(),
  status: text('status').notNull().default('draft'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  spend: numeric('spend').notNull().default('0'),
  ...timestamps,
}, (t) => [
  index('idx_plg_marketing_campaigns_tenant').on(t.tenantId),
  index('idx_plg_marketing_campaigns_channel').on(t.tenantId, t.channelKey),
])

export const mktSocialAccounts = pgTable('plg_marketing_social_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  name: text('name').notNull(),
  handle: text('handle'),
  // One account, many platform connections (Instagram, YouTube, TikTok, ...)
  platforms: text('platforms').array().notNull().default(['instagram']),
  isActive: boolean('is_active').notNull().default(true),
  ...createdAt,
}, (t) => [index('idx_plg_marketing_social_accounts_tenant').on(t.tenantId)])

export const mktContentPlans = pgTable('plg_marketing_content_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  accountId: uuid('account_id').notNull().references(() => mktSocialAccounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: text('status').notNull().default('active'),
  weeksCount: integer('weeks_count').notNull().default(8),
  startDate: date('start_date'),
  objective: text('objective'),
  tone: text('tone'),
  pillars: jsonb('pillars').notNull().default([]),
  formats: jsonb('formats').notNull().default([]),
  weeklyFrequency: integer('weekly_frequency').notNull().default(3),
  briefMd: text('brief_md').notNull().default(''),
  ...timestamps,
}, (t) => [
  index('idx_plg_marketing_content_plans_tenant').on(t.tenantId),
  index('idx_plg_marketing_content_plans_account').on(t.accountId),
])

export const mktContentPosts = pgTable('plg_marketing_content_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  planId: uuid('plan_id').notNull().references(() => mktContentPlans.id, { onDelete: 'cascade' }),
  weekNumber: integer('week_number').notNull().default(1),
  position: integer('position').notNull().default(0),
  title: text('title').notNull(),
  format: text('format').notNull().default('reel'),
  status: text('status').notNull().default('idea'),
  scheduledDate: date('scheduled_date'),
  // Target platforms for this post; empty = inherit the account's platforms
  platforms: text('platforms').array().notNull().default([]),
  // Recording-day checklist [{ id, text, done }]
  checklist: jsonb('checklist').notNull().default([]),
  // Uploaded asset (static posts: caption + final art instead of a script)
  mediaUrl: text('media_url'),
  hook: text('hook'),
  cta: text('cta'),
  contentMd: text('content_md').notNull().default(''),
  ...timestamps,
}, (t) => [
  index('idx_plg_marketing_content_posts_tenant').on(t.tenantId),
  index('idx_plg_marketing_content_posts_plan').on(t.planId, t.weekNumber, t.position),
  index('idx_plg_marketing_content_posts_status').on(t.tenantId, t.status),
])
