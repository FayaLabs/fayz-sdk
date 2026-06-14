import { useCallback } from 'react'
import { useChatStore, type ChatMessage } from '../stores/chat.store'

interface UseChatOptions {
  apiEndpoint?: string
  systemPrompt?: string
}

export function useChat(options?: UseChatOptions) {
  const store = useChatStore()

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      store.addMessage(userMsg)

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }
      store.addMessage(assistantMsg)
      store.setStreaming(true)

      if (!options?.apiEndpoint) {
        // Mock response if no endpoint configured
        setTimeout(() => {
          store.updateLastAssistant(
            "I'm your AI assistant. This is a demo response — connect an API endpoint to enable real conversations."
          )
          store.setStreaming(false)
        }, 800)
        return
      }

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
    [store, options?.apiEndpoint, options?.systemPrompt]
  )

  return {
    messages: store.messages,
    isOpen: store.isOpen,
    isStreaming: store.isStreaming,
    sendMessage,
    toggleOpen: store.toggleOpen,
    setOpen: store.setOpen,
    reset: store.reset,
  }
}
