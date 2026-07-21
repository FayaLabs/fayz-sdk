import { useCallback } from 'react'
import { useChatStore, type ChatMessage } from '../stores/chat.store'
import { useTranslation } from './useTranslation'

interface UseChatOptions {
  apiEndpoint?: string
  systemPrompt?: string
}

export function useChat(options?: UseChatOptions) {
  const store = useChatStore()
  const { t } = useTranslation()
  // The assistant is only "real" when the host app wires an apiEndpoint. Without
  // it we used to fake a canned demo reply — dishonest. Now the panel disables
  // free-text input and, if a suggestion chip is clicked anyway, we answer with a
  // clear "not configured" notice instead of pretending to be an AI.
  const isConfigured = !!options?.apiEndpoint

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      store.addMessage(userMsg)

      if (!options?.apiEndpoint) {
        // Honest non-configured state — no fake "demo response".
        store.addMessage({
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: t('chat.notConfigured'),
          timestamp: new Date().toISOString(),
        })
        return
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }
      store.addMessage(assistantMsg)
      store.setStreaming(true)

      try {
        const response = await fetch(options.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              ...(options.systemPrompt
                ? [{ role: 'system', content: options.systemPrompt }]
                : []),
              ...store.messages.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content },
            ],
          }),
        })

        if (!response.ok) {
          store.updateLastAssistant('Sorry, something went wrong. Please try again.')
          store.setStreaming(false)
          return
        }

        const data = await response.json()
        const text = data.choices?.[0]?.message?.content ?? data.content ?? 'No response.'
        store.updateLastAssistant(text)
      } catch {
        store.updateLastAssistant('Sorry, I could not connect. Please try again later.')
      } finally {
        store.setStreaming(false)
      }
    },
    [store, options?.apiEndpoint, options?.systemPrompt, t]
  )

  // FOLLOW-UP — full LLM + tools loop:
  // Today, with an apiEndpoint, we do a single request/response round-trip and
  // ignore the aiTools declared by plugins (see useAITools). PluginAITool is
  // purely declarative (id/name/description/mode/parameters) — it carries NO
  // executable handler — so there is nothing to run client-side. The complete
  // agentic loop belongs server-side behind apiEndpoint: forward the tool
  // definitions (already JSON-Schema shaped for Claude tool_use) as `tools`,
  // and when the model returns tool_use blocks, execute them against the tenant's
  // data (respecting permissions), feed tool_result back, and stream the final
  // turn. That server contract is the follow-up; this hook stays transport-only.
  return {
    messages: store.messages,
    isOpen: store.isOpen,
    isStreaming: store.isStreaming,
    /** True only when a real chat.apiEndpoint is configured. */
    isConfigured,
    sendMessage,
    toggleOpen: store.toggleOpen,
    setOpen: store.setOpen,
    reset: store.reset,
  }
}
