// Builders come from @fayz-ai/db (single drizzle-orm instance) — never import
// pgTable/uuid directly from drizzle-orm/pg-core. See MIGRATION-ARCHITECTURE §6.
import {
  pgTable, uuid, text, boolean, integer, numeric, date, timestamp, index,
  tenantId, timestamps, createdAt, people, orders,
} from '@fayz-ai/db'

// ---------------------------------------------------------------------------
// CRM plugin — Ring-1 schema (schema-as-code).
//
// Leads live on public.people (kind='lead'); deals/quotes on public.orders.
// These tables extend that spine with pipeline, tagging and activity data.
// RLS policies, grants and the v_leads/v_deals read-views are companion SQL
// (Drizzle doesn't diff grants/views) — see the app's drizzle/companion/.
// ---------------------------------------------------------------------------

export const pipelines = pgTable('plg_crm_pipelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
}, (t) => [index('idx_plg_crm_pipelines_tenant').on(t.tenantId)])

export const pipelineStages = pgTable('plg_crm_pipeline_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
  color: text('color').default('#6366f1'),
  probability: numeric('probability', { precision: 5, scale: 2 }).default('0'),
  isWon: boolean('is_won').default(false),
  isLost: boolean('is_lost').default(false),
  ...createdAt,
}, (t) => [
  index('idx_plg_crm_pipeline_stages_tenant').on(t.tenantId),
  index('idx_plg_crm_pipeline_stages_pipeline').on(t.pipelineId),
])

export const leadSources = pgTable('plg_crm_lead_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  ...createdAt,
}, (t) => [index('idx_plg_crm_lead_sources_tenant').on(t.tenantId)])

export const crmTags = pgTable('plg_crm_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  name: text('name').notNull(),
  color: text('color').default('#6366f1'),
  isActive: boolean('is_active').notNull().default(true),
  ...createdAt,
}, (t) => [index('idx_plg_crm_tags_tenant').on(t.tenantId)])

export const dealExtensions = pgTable('plg_crm_deal_extensions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  tenantId: tenantId(),
  pipelineId: uuid('pipeline_id').references(() => pipelines.id),
  stageId: uuid('stage_id').references(() => pipelineStages.id),
  probability: numeric('probability', { precision: 5, scale: 2 }).default('0'),
  expectedCloseDate: date('expected_close_date'),
  leadId: uuid('lead_id').references(() => people.id),
  lostReason: text('lost_reason'),
  ...timestamps,
}, (t) => [
  index('idx_plg_crm_deal_extensions_tenant').on(t.tenantId),
  index('idx_plg_crm_deal_extensions_order').on(t.orderId),
  index('idx_plg_crm_deal_extensions_stage').on(t.stageId),
])

export const crmActivityTypes = pgTable('plg_crm_activity_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  ...createdAt,
}, (t) => [index('idx_plg_crm_activity_types_tenant').on(t.tenantId)])

export const crmActivities = pgTable('plg_crm_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: tenantId(),
  dealId: uuid('deal_id').references(() => orders.id),
  leadId: uuid('lead_id').references(() => people.id),
  contactId: uuid('contact_id').references(() => people.id),
  contactName: text('contact_name'),
  activityType: text('activity_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  assignedToId: uuid('assigned_to_id'),
  assignedToName: text('assigned_to_name'),
  ...createdAt,
}, (t) => [
  index('idx_plg_crm_activities_tenant').on(t.tenantId),
  index('idx_plg_crm_activities_deal').on(t.dealId),
  index('idx_plg_crm_activities_lead').on(t.leadId),
  index('idx_plg_crm_activities_due').on(t.tenantId, t.dueDate),
])
