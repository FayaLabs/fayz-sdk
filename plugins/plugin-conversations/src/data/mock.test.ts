import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMockConversationsProvider } from './mock'

// Minimal localStorage shim so we can exercise the persistence path (the mock
// guards on `typeof window`, degrading to pure memory when absent).
function installLocalStorage(): void {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
  }
  ;(globalThis as unknown as { window: unknown }).window = { localStorage }
}

function uninstallLocalStorage(): void {
  delete (globalThis as unknown as { window?: unknown }).window
}

describe('plugin-conversations · mock provider', () => {
  it('ships a typed seed', async () => {
    const provider = createMockConversationsProvider()
    const list = await provider.listConversations()
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].contactName).toBeTruthy()
  })

  it('createConversation → sendMessage → list persists within the session', async () => {
    const provider = createMockConversationsProvider({ tenantId: 'test-tenant' })

    const created = await provider.createConversation({
      channel: 'sms',
      contactName: 'Ada Lovelace',
      contactHandle: '+1 555 010 0000',
      firstMessage: 'Hello there',
    })
    expect(created.id).toBeTruthy()
    expect(created.channel).toBe('sms')
    expect(created.contactName).toBe('Ada Lovelace')
    expect(created.lastMessagePreview).toBe('Hello there')

    // The seeded first message is present.
    const seededMsgs = await provider.getMessages(created.id)
    expect(seededMsgs).toHaveLength(1)
    expect(seededMsgs[0].direction).toBe('outbound')
    expect(seededMsgs[0].body).toBe('Hello there')

    // A follow-up reply rolls the thread + preview forward.
    const reply = await provider.sendMessage({ conversationId: created.id, body: 'How are you?' })
    expect(reply.direction).toBe('outbound')

    const msgs = await provider.getMessages(created.id)
    expect(msgs.map((m) => m.body)).toEqual(['Hello there', 'How are you?'])

    // The new conversation surfaces in list() with the latest preview.
    const list = await provider.listConversations()
    const found = list.find((c) => c.id === created.id)
    expect(found).toBeDefined()
    expect(found!.lastMessagePreview).toBe('How are you?')
  })

  it('persists across provider instances via localStorage (reload survives)', async () => {
    installLocalStorage()
    try {
      const first = createMockConversationsProvider({ tenantId: 'reload-tenant' })
      const created = await first.createConversation({
        channel: 'whatsapp',
        contactName: 'Grace Hopper',
        firstMessage: 'Compiling',
      })

      // Simulate a reload: a brand-new provider for the same tenant.
      const second = createMockConversationsProvider({ tenantId: 'reload-tenant' })
      const list = await second.listConversations()
      const found = list.find((c) => c.id === created.id)
      expect(found).toBeDefined()
      expect(found!.contactName).toBe('Grace Hopper')

      const msgs = await second.getMessages(created.id)
      expect(msgs.map((m) => m.body)).toContain('Compiling')
    } finally {
      uninstallLocalStorage()
    }
  })
})

// Guard so the shim never leaks into other suites if this file is imported elsewhere.
beforeEach(() => uninstallLocalStorage())
afterEach(() => uninstallLocalStorage())
