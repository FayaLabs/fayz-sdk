import { describe, it, expect } from 'vitest'
import type { PluginManifest, RegisteredEntity } from '@fayz-ai/core'
import { deriveAgentContract } from './derive-contract'
import type { FayzAppConfig } from './config'

// ---------------------------------------------------------------------------
// Fixtures — a minimal app: one CRUD entity with a limitKey, one plugin with a
// persist tool bound to an RPC, a registry, declared features/limits/rpcs.
// Entities are passed explicitly so the test never touches the global registry.
// ---------------------------------------------------------------------------

const clientEntity: RegisteredEntity = {
  entityKey: 'person:customer',
  label: 'Cliente',
  labelPlural: 'Clientes',
  source: 'app',
  fields: [],
  entityDef: {
    name: 'Cliente',
    namePlural: 'Clientes',
    icon: 'User',
    limitKey: 'clients',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true, searchable: true },
      { key: 'status', label: 'Status', type: 'select', options: [{ label: 'Ativo', value: 'active' }, { label: 'Inativo', value: 'inactive' }] },
      { key: 'origin_id', label: 'Origem', type: 'relation', relation: { table: 'categories' } },
    ],
    data: {
      table: 'clients',
      tenantIdColumn: 'tenant_id',
      archetype: 'person',
      archetypeKind: 'customer',
      searchColumns: ['name', 'email'],
    },
  },
}

const agendaPlugin = {
  id: 'agenda',
  name: 'Agenda',
  version: '1.0.0',
  scope: 'vertical',
  routes: [],
  aiTools: [
    {
      id: 'agenda.create-appointment',
      name: 'createAppointment',
      description: 'Creates a new appointment.',
      mode: 'persist',
      limitKey: 'bookings_month',
      permission: { feature: 'appointments', action: 'create' },
      execution: { plane: 'server', kind: 'rpc', rpc: 'agent_agenda_create_appointment' },
    },
  ],
  declaredFeatures: [{ id: 'appointments', label: 'Appointments' }],
  declaredLimits: [{ key: 'bookings_month', label: 'Appointments/mo', table: 'appointments', period: 'month' }],
  declaredRpcs: [
    { name: 'agent_agenda_create_appointment', kind: 'write', description: 'Guarded appointment create.', audits: true },
  ],
  registries: [
    {
      id: 'cancellation-reasons',
      entity: {
        name: 'Motivo de cancelamento',
        namePlural: 'Motivos de cancelamento',
        icon: 'X',
        fields: [{ key: 'label', label: 'Label', type: 'text' }],
        data: { table: 'appointment_cancellation_reasons' },
      },
    },
  ],
} as unknown as PluginManifest

const config = {
  name: 'Test App',
  plugins: [agendaPlugin],
  permissions: { features: [{ id: 'clients', label: 'Clientes' }] },
  billing: {
    plans: [],
    limitDeclarations: [{ key: 'clients', label: 'Clients (app override)', table: 'clients', kindFilter: 'customer' }],
  },
  chat: { title: 'Assistente Glow', systemPrompt: 'You are the salon assistant.' },
  agentContract: {
    knowledge: { businessRules: [{ id: 'cancel-window', description: 'Cancelations need 2h notice.' }] },
    rpcs: [{ name: 'agent_beauty_quote_service_price', kind: 'read', description: 'Price quote.' }],
  },
} as unknown as FayzAppConfig

describe('deriveAgentContract', () => {
  const { agent, limitDeclarations } = deriveAgentContract(config, [clientEntity])

  it('projects registered entities with data mapping and fields (no closures)', () => {
    const client = agent.entities?.find((e) => e.key === 'person:customer')
    expect(client).toBeDefined()
    expect(client?.limitKey).toBe('clients')
    expect(client?.data).toMatchObject({ table: 'clients', tenantIdColumn: 'tenant_id', archetypeKind: 'customer' })
    expect(client?.fields.find((f) => f.key === 'status')?.options).toEqual(['active', 'inactive'])
    expect(client?.fields.find((f) => f.key === 'origin_id')?.relationTable).toBe('categories')
    expect(JSON.parse(JSON.stringify(client))).toEqual(client)
  })

  it('projects plugin registries as entities + registry index', () => {
    expect(agent.registries).toEqual([
      { pluginId: 'agenda', id: 'cancellation-reasons', entityKey: 'agenda:cancellation-reasons' },
    ])
    expect(agent.entities?.some((e) => e.key === 'agenda:cancellation-reasons')).toBe(true)
  })

  it('derives the two data primitives covering entities + registries', () => {
    const search = agent.tools?.find((t) => t.name === 'searchRecords')
    const query = agent.tools?.find((t) => t.name === 'queryData')
    expect(search?.execution).toEqual({ plane: 'server', kind: 'entity_read', entity: '*' })
    expect(query?.execution).toEqual({ plane: 'server', kind: 'entity_read', entity: '*' })
    // The closed target enum lists both the CRUD entity and the registry key.
    const searchEnum = (search?.parameters?.properties?.entity as { enum?: string[] })?.enum ?? []
    expect(searchEnum).toContain('person:customer')
    expect(searchEnum).toContain('agenda:cancellation-reasons')
    // No per-entity tool remains — the catalog is primitives + declared tools.
    expect(agent.tools?.some((t) => t.id.startsWith('entity.'))).toBe(false)
  })

  it('keeps plugin-authored execution and defaults persist tools to confirmation', () => {
    const create = agent.tools?.find((t) => t.id === 'agenda.create-appointment')
    expect(create?.execution).toEqual({ plane: 'server', kind: 'rpc', rpc: 'agent_agenda_create_appointment' })
    expect(create?.requiresConfirmation).toBe(true)
    expect(create?.limitKey).toBe('bookings_month')
    expect(create?.pluginId).toBe('agenda')
  })

  it('marks core tools client-plane', () => {
    const nav = agent.tools?.find((t) => t.name === 'navigateTo')
    expect(nav?.execution).toEqual({ plane: 'client' })
  })

  it('resolves the 4-layer limit merge with app override winning', () => {
    const clients = limitDeclarations.find((d) => d.key === 'clients')
    expect(clients?.label).toBe('Clients (app override)')
    expect(limitDeclarations.some((d) => d.key === 'users')).toBe(true)
    expect(limitDeclarations.some((d) => d.key === 'bookings_month')).toBe(true)
  })

  it('collects plugin + app rpcs and app knowledge + persona', () => {
    expect(agent.rpcs?.map((r) => r.name)).toEqual([
      'agent_agenda_create_appointment',
      'agent_beauty_quote_service_price',
    ])
    expect(agent.persona).toEqual({ name: 'Assistente Glow', systemPrompt: 'You are the salon assistant.' })
    expect(agent.domainKnowledge?.businessRules?.[0]?.id).toBe('cancel-window')
    expect(agent.declaredFeatures?.map((f) => f.id).sort()).toEqual(['appointments', 'clients'])
  })

  it('produces a JSON-stable agent section (serializable end to end)', () => {
    expect(JSON.parse(JSON.stringify(agent))).toEqual(agent)
  })
})
