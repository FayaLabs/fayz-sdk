// The AI Builder request taxonomy — the contract the platform's request
// classifier targets. The classifier itself lives in the `fayz` platform repo;
// this is the canonical source of truth for the request classes and the
// architecture layer each is allowed to touch (docs/architecture-boundaries.md).

/** Ownership layer a request may modify. */
export type FayzLayer = 'app' | 'plugin-config' | 'private-extension' | 'platform' | 'none'

export type AiBuilderRequestClass =
  | 'app-edit'
  | 'plugin-config'
  | 'private-extension'
  | 'platform-or-plugin-upgrade'
  | 'unsafe-blocked'

export interface AiBuilderRequestClassDef {
  id: AiBuilderRequestClass
  label: string
  /** Which ownership layer this class is allowed to modify. */
  layer: FayzLayer
  /** Who may perform it. */
  editableBy: 'ai' | 'partner' | 'fayz' | 'none'
  needsCode: boolean
  needsDeploy: boolean
  description: string
  examples: string[]
}

export const AI_BUILDER_REQUEST_CLASSES: Record<AiBuilderRequestClass, AiBuilderRequestClassDef> = {
  'app-edit': {
    id: 'app-edit',
    label: 'App edit',
    layer: 'app',
    editableBy: 'ai',
    needsCode: false,
    needsDeploy: false,
    description:
      'Change the generated app: pages, routes, layout, theme, copy, blocks, slots. Manifest-level edits (ladder 1–4) need no code; custom components/pages (ladder 5–6) are app-owned code.',
    examples: [
      'Change the brand color and headline',
      'Add a new landing page with a hero and product grid',
      'Reorder dashboard cards',
    ],
  },
  'plugin-config': {
    id: 'plugin-config',
    label: 'Plugin config',
    layer: 'plugin-config',
    editableBy: 'ai',
    needsCode: false,
    needsDeploy: false,
    description:
      'Configure an installed plugin as manifest data: enabled modules, fields, statuses, rules, feature flags, labels, currency.',
    examples: [
      'Enable the reconciliation module in financial',
      'Add a "VIP" status to clients',
      'Turn on delivery pricing in the menu',
    ],
  },
  'private-extension': {
    id: 'private-extension',
    label: 'Private extension',
    layer: 'private-extension',
    editableBy: 'partner',
    needsCode: true,
    needsDeploy: true,
    description:
      'Add new business behaviour as an app-local plugin (own entities, data, migrations, AI tools, connectors). The sanctioned partner/Silvio path — scaffold with `fayz create plugin`. See private-plugins.md.',
    examples: [
      'Build a loyalty-points engine with its own table',
      'Add a custom importer for a legacy ERP',
      'Integrate a provider Fayz does not support yet (adapter)',
    ],
  },
  'platform-or-plugin-upgrade': {
    id: 'platform-or-plugin-upgrade',
    label: 'Platform / plugin upgrade',
    layer: 'platform',
    editableBy: 'fayz',
    needsCode: true,
    needsDeploy: true,
    description:
      'Change owned by Fayz: bump SDK/plugin versions, run manifest/DB migrations, evolve an engine. Not editable from a generated app.',
    examples: [
      'Upgrade @fayz-ai/core across the fleet',
      'Migrate manifests v2 → v3',
      'Add a capability to an official plugin',
    ],
  },
  'unsafe-blocked': {
    id: 'unsafe-blocked',
    label: 'Unsafe / blocked',
    layer: 'none',
    editableBy: 'none',
    needsCode: false,
    needsDeploy: false,
    description:
      'Requests that would break the boundary and must be refused or rerouted: mutating SDK/runtime/plugin internals, forking an SDK page, importing a provider SDK directly into app code, or bypassing tenancy/permissions/security.',
    examples: [
      'Edit the code inside @fayz-ai/plugin-crm',
      'Copy an SDK page into the app and modify it',
      'Call the Supabase client directly from a storefront component',
      'Disable row-level security for a tenant',
    ],
  },
}

export const AI_BUILDER_REQUEST_CLASS_IDS = Object.keys(
  AI_BUILDER_REQUEST_CLASSES,
) as AiBuilderRequestClass[]

/** True when a request class is permitted (anything but unsafe-blocked). */
export function isAllowedRequestClass(id: AiBuilderRequestClass): boolean {
  return id !== 'unsafe-blocked'
}
