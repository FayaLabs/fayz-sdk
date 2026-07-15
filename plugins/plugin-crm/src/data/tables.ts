// Central physical-table-name registry for plugin-crm. Providers import T and
// never hardcode the plg_crm_* strings, so a future rename touches one file.
export const T = {
  activities: 'plg_crm_activities',
  tags: 'plg_crm_tags',
  activityTypes: 'plg_crm_activity_types',
  pipelines: 'plg_crm_pipelines',
  pipelineStages: 'plg_crm_pipeline_stages',
  dealExtensions: 'plg_crm_deal_extensions',
  leadSources: 'plg_crm_lead_sources',
} as const
