// Physical table names for the conversations plugin (plg_conversations* prefix).
// Import T and reference T.<key> in the data provider so a rename lands in
// exactly one place.
export const T = {
  conversations: 'plg_conversations',
  messages: 'plg_conversation_messages',
} as const
