/**
 * Entitlement key for the AI assistant.
 *
 * A plan gates it with `entitlements.features.assistant = false`; absent means
 * open, so apps that never declare it keep the assistant.
 */
export const ASSISTANT_FEATURE = 'assistant'
