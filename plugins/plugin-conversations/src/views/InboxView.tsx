import React from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@fayz-ai/ui'
import { useConversationsStore } from '../ConversationsContext'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { ContactPanel } from './ContactPanel'
import { useMediaQuery } from './shared'

export function InboxView() {
  const { conversations, selectedId, deselect } = useConversationsStore((s) => s)
  // xl+ shows the contact panel inline (three panes); below that it's an
  // on-demand slide-over so the list + thread keep room to breathe.
  const isWidePanel = useMediaQuery('(min-width: 1280px)')
  const [panelOpen, setPanelOpen] = React.useState(false)
  const selected = conversations.find((c) => c.id === selectedId) ?? null

  // Open the panel by default only when it fits inline; collapse it otherwise.
  React.useEffect(() => {
    setPanelOpen(isWidePanel)
  }, [isWidePanel])

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-background">
      {/* Conversation list — single-pane below lg (full width), fixed rail at lg+.
          Below lg it yields to the thread once a conversation is open. */}
      <ConversationList className={cn(selected ? 'hidden lg:flex' : 'flex')} />

      {/* Thread — hidden below lg until a conversation is selected. */}
      {selected ? (
        <MessageThread
          selected={selected}
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          onBack={deselect}
          className="flex"
        />
      ) : (
        <section className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-muted/20 text-muted-foreground lg:flex">
          <MessageSquare className="h-9 w-9" />
          <p className="mt-2 text-sm">Select a conversation to start chatting</p>
        </section>
      )}

      {/* Contact panel — inline column at xl, slide-over overlay below xl. */}
      {selected && panelOpen && (
        <>
          <button
            className="absolute inset-0 z-10 bg-black/40 xl:hidden"
            aria-label="Close details"
            onClick={() => setPanelOpen(false)}
          />
          <ContactPanel
            contact={selected}
            onClose={() => setPanelOpen(false)}
            className="absolute inset-y-0 right-0 z-20 w-[340px] max-w-[88%] shadow-2xl xl:static xl:z-auto xl:w-[300px] xl:max-w-none xl:shadow-none"
          />
        </>
      )}
    </div>
  )
}
