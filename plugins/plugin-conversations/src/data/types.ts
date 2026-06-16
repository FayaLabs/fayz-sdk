import type {
  Conversation,
  Message,
  ListConversationsQuery,
  SendMessageInput,
  ConversationStatus,
} from '../types'

export interface ConversationsProvider {
  listConversations(query?: ListConversationsQuery): Promise<Conversation[]>
  getMessages(conversationId: string): Promise<Message[]>
  sendMessage(input: SendMessageInput): Promise<Message>
  markRead(conversationId: string): Promise<void>
  setStatus(conversationId: string, status: ConversationStatus): Promise<Conversation>
}
