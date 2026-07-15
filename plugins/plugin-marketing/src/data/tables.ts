// Physical table names for the marketing plugin (plg_marketing_* prefix). Import T
// and reference T.<key> in the data providers so a rename lands in one place.
export const T = {
  socialAccounts: 'plg_marketing_social_accounts',
  contentPlans: 'plg_marketing_content_plans',
  contentPosts: 'plg_marketing_content_posts',
} as const
