import type { PluginRegistryDef, EntityDef } from '@fayz-ai/core'
import type { AcquisitionChannel } from './types'

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
    { key: 'kind', label: 'Type', type: 'select', options: KIND_OPTIONS, showInTable: true },
    { key: 'icon', label: 'Icon', type: 'text', showInTable: true },
  ],
  facets: [{ field: 'kind' }],
}

/** Build the marketing settings registries, seeding Channels from the resolved
 *  domain preset. Read-only today (channels come from the preset); flip
 *  readOnly + add a `data.table` to make them tenant-editable. */
export function buildMarketingRegistries(channels: AcquisitionChannel[]): PluginRegistryDef[] {
  return [
    {
      id: 'channels',
      entity: channelEntity,
      icon: 'Radio',
      description: 'Acquisition channels tracked for this workspace',
      display: 'table',
      readOnly: true,
      seedData: channels.map((c) => ({ id: c.id, label: c.label, kind: c.kind, icon: c.icon })),
    },
  ]
}
