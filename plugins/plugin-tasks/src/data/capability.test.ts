// First end-to-end capability test for any Fayz plugin (FAY-1206).
// Proves the data slice of the Plugin Capability Contract against the mock
// provider: typed seed is present, writes persist and surface in queries and
// the summary, and updates/deletes round-trip. This is the template other
// plugins copy — see docs/PLUGIN-PATTERNS.md → capability anatomy.
import { describe, it, expect } from 'vitest'
import { createMockTasksProvider } from './mock'

describe('plugin-tasks capability · data slice (mock provider)', () => {
  it('ships typed seed (labels are provisioned, not empty)', async () => {
    const provider = createMockTasksProvider()
    const labels = await provider.getLabels()
    expect(labels).toHaveLength(4)
    expect(labels.map((l) => l.name)).toContain('Bug')
  })

  it('persists a created task: it surfaces in queries and the summary', async () => {
    const provider = createMockTasksProvider()
    const before = await provider.getSummary()

    const task = await provider.createTask({ title: 'Wire capability gate', status: 'todo', priority: 'high' })
    expect(task.id).toBeTruthy()
    expect(task.tenantId).toBe('mock')

    const todo = await provider.getTasks({ status: 'todo' })
    expect(todo.some((t) => t.id === task.id)).toBe(true)

    const after = await provider.getSummary()
    expect(after.total).toBe(before.total + 1)
    expect(after.highPriority).toBe(before.highPriority + 1)
  })

  it('round-trips update and delete', async () => {
    const provider = createMockTasksProvider()
    const task = await provider.createTask({ title: 'temp' })

    const moved = await provider.updateTask(task.id, { status: 'done' })
    expect(moved.status).toBe('done')

    await provider.deleteTask(task.id)
    expect(await provider.getTaskById(task.id)).toBeNull()
  })
})
