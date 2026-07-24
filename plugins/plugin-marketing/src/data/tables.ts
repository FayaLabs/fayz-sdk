// Physical table names for the marketing plugin (plg_marketing_* prefix). Import T
// and reference T.<key> in the data providers so a rename lands in one place.
export const T = {
  socialAccounts: 'plg_marketing_social_accounts',
  contentPlans: 'plg_marketing_content_plans',
  contentPosts: 'plg_marketing_content_posts',
  channels: 'plg_marketing_channels',
  campaigns: 'plg_marketing_campaigns',
} as const

// Read views (bridge views over spine + plugin tables; see 006_analytics_views.sql)
export const V = {
  channels: 'v_marketing_channels',
  campaigns: 'v_marketing_campaigns',
  attribution: 'v_marketing_attribution',
} as const
