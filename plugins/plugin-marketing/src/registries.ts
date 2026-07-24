import type { PluginRegistryDef, EntityDef } from '@fayz-ai/core'
import type { AcquisitionChannel } from './types'
import { T } from './data/tables'

// ---------------------------------------------------------------------------
// Settings registries — surfaced as CRUD tabs in the central Settings area
// (mirrors how plugin-menu exposes Allergens / Dietary Tags). "Channels" lists
// the acquisition channels resolved from the domain preset.
// ---------------------------------------------------------------------------

const KIND_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'organic', label: 'Organic' },
  { value: 'social', label: 'Social' },
  { value: 'referral', label: 'Referral' },
  { value: 'direct', label: 'Direct' },
  { value: 'outbound', label: 'Outbound' },
]

const channelEntity: EntityDef = {
  name: 'Channel',
  namePlural: 'Channels',
  icon: 'Radio',
  displayField: 'label',
  defaultSort: 'label',
  fields: [
    { key: 'label', label: 'Channel', type: 'text', required: true, showInTable: true, searchable: true },
    { key: 'channelKey', label: 'Key', type: 'text', required: true, showInTable: true },
    { key: 'kind', label: 'Type', type: 'select', options: KIND_OPTIONS, showInTable: true },
    { key: 'icon', label: 'Icon', type: 'text' },
    { key: 'monthlySpend', label: 'Monthly spend', type: 'number', showInTable: true, defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true, inlineToggle: true },
  ],
  facets: [{ field: 'kind' }],
  data: {
    table: T.channels,
    tenantScoped: true,
    searchColumns: ['label', 'channel_key'],
  },
}

/** Build the marketing settings registries. Channels are tenant-editable rows
 *  in plg_marketing_channels; the Supabase provider lazily seeds them from the
 *  resolved domain preset (seedData doubles as walkable mock data). */
export function buildMarketingRegistries(channels: AcquisitionChannel[]): PluginRegistryDef[] {
  return [
    {
      id: 'channels',
      entity: channelEntity,
      icon: 'Radio',
      description: 'Acquisition channels tracked for this workspace',
      display: 'table',
      seedData: [
        ...channels.map((c) => ({
          id: c.id, channelKey: c.id, label: c.label, kind: c.kind, icon: c.icon, isActive: true, monthlySpend: 0,
        })),
      ],
    },
  ]
}
