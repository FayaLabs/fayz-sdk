import type { EntityDef } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// CORE_QUERY_ENTITIES — spine tables the agent may read and write even though
// no app declares a CRUD page for them.
//
// The data primitives (createRecord / updateRecord / searchRecords / queryData)
// build their entity enum from three sources: the app's registered CRUD
// entities, plugin registries, and plugin `queryEntities`. A spine table that
// lives inside a DETAIL TAB rather than on a page of its own belongs to none of
// them — so the agent could not see it, and would answer "esses campos não
// estão disponíveis" to a request the UI handles fine.
//
// These are declared here, merged in by deriveAgentContract and useAITools, so
// EVERY app gets them without editing a single app config. They intentionally
// produce NO route and NO nav item: the surface for an address is the person's
// Endereços tab, not a top-level page.
// ---------------------------------------------------------------------------

/** public.addresses — @fayz-ai/db spine migration 017_core_addresses. */
const addressEntity: EntityDef = {
  name: 'Address',
  namePlural: 'Addresses',
  icon: 'MapPin',
  data: {
    table: 'addresses',
    tenantScoped: true,
    tenantIdColumn: 'tenant_id',
    searchColumns: ['label', 'street', 'district', 'city', 'postal_code', 'recipient'],
  },
  fields: [
    // owner_id/owner_type are how an address attaches to its person. They are
    // required and described rather than hidden: the agent reaches this table
    // from a record it already has in hand ("adiciona o endereço X pra ele"),
    // so the id it must pass is the one it just searched for or created.
    {
      key: 'owner_id',
      label: 'Owner record id',
      type: 'text',
      required: true,
      hint: 'Id of the person (client, contact, supplier, staff…) this address belongs to.',
    },
    {
      key: 'owner_type',
      label: 'Owner kind',
      type: 'select',
      options: ['person', 'location', 'tenant'],
      hint: "Defaults to 'person'. Only set it for an address that belongs to a business location or to the tenant itself.",
    },
    { key: 'label', label: 'Label', type: 'text', searchable: true, hint: 'Casa, Trabalho, Depósito…' },
    {
      key: 'kind',
      label: 'Use',
      type: 'select',
      options: ['both', 'shipping', 'billing'],
      hint: "Defaults to 'both'.",
    },
    { key: 'postal_code', label: 'Postal code', type: 'text', required: true, searchable: true, hint: 'CEP.' },
    { key: 'street', label: 'Street', type: 'text', required: true, searchable: true },
    { key: 'number', label: 'Number', type: 'text' },
    { key: 'complement', label: 'Complement', type: 'text' },
    { key: 'district', label: 'District', type: 'text', searchable: true, hint: 'Bairro.' },
    { key: 'city', label: 'City', type: 'text', required: true, searchable: true },
    { key: 'state', label: 'State', type: 'text', required: true, hint: 'Two-letter UF.' },
    { key: 'country', label: 'Country', type: 'text', hint: "Defaults to 'BR'." },
    { key: 'recipient', label: 'Recipient', type: 'text', searchable: true, hint: 'Who receives, if not the owner.' },
    { key: 'phone', label: 'Phone', type: 'text' },
    {
      key: 'is_default',
      label: 'Default address',
      type: 'boolean',
      hint: 'Only one default per owner and kind — clear the previous one before setting this.',
    },
  ],
}

export interface CoreQueryEntity {
  key: string
  entity: EntityDef
  writable?: boolean
  /**
   * How this entity attaches to another record — appended to the descriptions
   * of the data primitives that can act on it. These entities do NOT stand
   * alone, and nothing in a flat enum of ~37 keys conveys that.
   *
   * Both directions matter, and each fails differently without it. On WRITE the
   * model reaches for `updateRecord` on the parent, is told the fields do not
   * exist, and then gives up or buries the data in a free-text column. On READ
   * it searches the parent, finds no address on it, and confidently answers
   * "this contact has no address registered" — a falsehood, since the row is
   * one filtered query away.
   *
   * Stated here rather than inferred at failure time on purpose: guessing the
   * intended entity from rejected FIELD NAMES points "add an address to this
   * contact" at the business-locations table, which declares the same columns.
   */
  agentHint?: string
}

export const CORE_QUERY_ENTITIES: CoreQueryEntity[] = [
  {
    key: 'address',
    entity: addressEntity,
    writable: true,
    agentHint:
      '`address` holds the street address of a PERSON (client, contact, supplier, staff). A person record has NO street/city/postal_code fields of its own. ' +
      "To read where someone lives, search `address` with filters {\"owner_id\": <the person's id>} — a person with no address field is not a person without an address. " +
      "To record one, create an `address` with owner_id set to the person's id. Never write an address into a notes field.",
  },
]
