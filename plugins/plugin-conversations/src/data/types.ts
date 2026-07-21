import type {
  Conversation,
  Message,
  ListConversationsQuery,
  SendMessageInput,
  CreateConversationInput,
  ConversationStatus,
} from '../types'

export interface ConversationsProvider {
  listConversations(query?: ListConversationsQuery): Promise<Conversation[]>
  getMessages(conversationId: string): Promise<Message[]>
  createConversation(input: CreateConversationInput): Promise<Conversation>
  sendMessage(input: SendMessageInput): Promise<Message>
  markRead(conversationId: string): Promise<void>
  setStatus(conversationId: string, status: ConversationStatus): Promise<Conversation>
}
