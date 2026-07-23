import { describe, it, expect } from 'vitest'
import { executeAITool, type AIToolExecutionContext } from './ai-tool-handlers'
import type { OrgMember, Organization, TeamPerson } from '@fayz-ai/core'

// The regression: a person-first app (Great DJs) listed six people on the Team
// screen while the assistant answered "your team is one person, with the role
// of Owner" — the handler read `tenant_members`, which only ever holds the
// accounts that can log in, and reported the RBAC profile name as the person's
// name.

const OWNER = {
  id: 'm1',
  userId: 'u1',
  orgId: 'org1',
  profileId: 'owner',
  profileName: 'Owner',
  user: { id: 'u1', email: 'dono@greatdjs.com.br', fullName: 'Vinicius Maia' },
  joinedAt: '2026-01-01',
} as OrgMember

const TEAM: TeamPerson[] = [
  { personId: 'p1', name: 'Equipe Great DJs', kind: 'staff', isActive: true },
  { personId: 'p2', name: 'DJ Marcos Vinil', kind: 'teacher', email: 'marcos@greatdjs.com.br', isActive: true },
  { personId: 'p3', name: 'Léa Beats', kind: 'teacher', email: 'lea@greatdjs.com.br', isActive: true },
  { personId: 'p4', name: 'Rafa Groove', kind: 'teacher', email: 'rafa@greatdjs.com.br', isActive: true },
  { personId: 'p5', name: 'Paula Mendes', kind: 'staff', email: 'paula@greatdjs.com.br', isActive: true },
  {
    personId: 'p6',
    name: 'Igor Santos',
    kind: 'staff',
    email: 'igor@greatdjs.com.br',
    isActive: true,
    membership: { memberId: 'm1', userId: 'u1', profileId: 'owner', profileName: 'Owner' },
  },
]

function ctx(over: Partial<AIToolExecutionContext> = {}): AIToolExecutionContext {
  return {
    currentOrg: { id: 'org1', name: 'Great DJs', slug: 'great-djs' } as Organization,
    members: [OWNER],
    currentPath: '/',
    routes: [],
    navigate: () => {},
    dataTools: new Map(),
    ...over,
  }
}

const parse = (r: { content: string }) => JSON.parse(r.content)

describe('getTeamMembers', () => {
  it('reports the whole team, not just the accounts that can log in', async () => {
    const result = parse(await executeAITool('getTeamMembers', {}, ctx({ loadTeam: async () => TEAM })))

    expect(result.total).toBe(6)
    expect(result.members.map((m: { name: string }) => m.name)).toContain('Léa Beats')
  })

  it('keeps the person name and their access role apart', async () => {
    const result = parse(await executeAITool('getTeamMembers', {}, ctx({ loadTeam: async () => TEAM })))
    const igor = result.members.find((m: { name: string }) => m.name === 'Igor Santos')
    const lea = result.members.find((m: { name: string }) => m.name === 'Léa Beats')

    expect(igor).toMatchObject({ accessRole: 'Owner', hasLogin: true })
    // No login is not "no name" — the row still carries who they are.
    expect(lea).toMatchObject({ kind: 'teacher', accessRole: null, hasLogin: false })
  })

  it('filters by person kind as well as by access role', async () => {
    const teachers = parse(await executeAITool('getTeamMembers', { role: 'teacher' }, ctx({ loadTeam: async () => TEAM })))
    const owners = parse(await executeAITool('getTeamMembers', { role: 'owner' }, ctx({ loadTeam: async () => TEAM })))

    expect(teachers.total).toBe(3)
    expect(owners.total).toBe(1)
  })

  it('falls back to memberships in legacy mode, without naming people after their role', async () => {
    const result = parse(await executeAITool('getTeamMembers', {}, ctx()))

    expect(result.total).toBe(1)
    expect(result.members[0]).toMatchObject({
      name: 'Vinicius Maia',
      email: 'dono@greatdjs.com.br',
      accessRole: 'Owner',
    })
  })
})

describe('getBusinessSummary', () => {
  it('counts the team the same way the Team screen does', async () => {
    const result = parse(await executeAITool('getBusinessSummary', {}, ctx({ loadTeam: async () => TEAM })))

    expect(result.teamSize).toBe(6)
  })
})
