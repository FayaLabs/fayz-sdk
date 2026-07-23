import * as React from 'react'
import { useChatStore } from './stores/chat.store'
import { useRightRailStore } from './right-rail'

/** The agentic hand-off: queue a prompt that auto-sends (the click IS the send
 *  intent) and flip the rail to the Chat tab. Shared by the Notes tab and any
 *  plugin surface (e.g. a task's "Conversar com IA"). */
export function useDelegateToAssistant(): (prompt: string) => void {
  const queuePrompt = useChatStore((s) => s.queuePrompt)
  const openPanel = useRightRailStore((s) => s.openPanel)
  return React.useCallback(
    (prompt: string) => {
      queuePrompt(prompt)
      openPanel('chat')
    },
    [queuePrompt, openPanel],
  )
}
