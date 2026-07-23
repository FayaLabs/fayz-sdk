import { useAuthStore } from '@fayz-ai/auth'
import { useOrganizationStore } from '../stores/organization.store'

// ---------------------------------------------------------------------------
// Auto-approval — the assistant's "don't ask me again", modelled on Claude
// Code's allowlist.
//
// Confirming every single write is the right default (an agent write is still
// a write), but a manager who books twenty appointments an hour answers the
// same card twenty times. So the card offers a third answer: approve, and
// remember this ONE kind of action.
//
// Two grades, on purpose:
//   • persisted  — additive writes (create/update). Survive reloads, scoped to
//                  org + user, revocable from the assistant's tools panel.
//   • session    — destructive writes (delete/cancel). Never persisted: a
//                  misheard voice command must not be able to erase data on a
//                  rule the user granted last month and forgot.
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'fayz.agent.auto-approve.v1'

export interface AutoApprovalRule {
  /** `toolName` or `toolName:scope` — what the decision is remembered against. */
  key: string
  toolName: string
  /** Entity the rule is limited to, so "always create clients" never becomes
   *  "always create anything". */
  scope?: string
  /** Human label for the revoke list ("Criar Cliente"). */
  label: string
  createdAt: string
}

/** Writes that remove or void data. Their grants never outlive the tab. */
const DESTRUCTIVE = /(delete|destroy|remove|cancel|archive|refund|void)/i

export function isDestructiveTool(toolName: string): boolean {
  return DESTRUCTIVE.test(toolName)
}

export function approvalKey(toolName: string, scope?: string): string {
  return scope ? `${toolName}:${scope}` : toolName
}

function storageKey(): string | null {
  const orgId = useOrganizationStore.getState().currentOrg?.id
  const userId = useAuthStore.getState().user?.id
  // No identity yet → nothing is remembered. Anonymous grants would follow the
  // browser, not the person, and leak across tenants on a shared machine.
  if (!orgId || !userId) return null
  return `${STORAGE_PREFIX}:${orgId}:${userId}`
}

function read(): AutoApprovalRule[] {
  const key = storageKey()
  if (!key || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as AutoApprovalRule[]).filter((r) => r && r.key) : []
  } catch {
    return []
  }
}

function write(rules: AutoApprovalRule[]): void {
  const key = storageKey()
  if (!key || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(rules))
  } catch {
    // Private mode / quota — the grant simply stays session-scoped.
  }
}

/** Grants that die with the tab (destructive tools, and private-mode fallback). */
const sessionGrants = new Set<string>()

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of Array.from(listeners)) listener()
}

/** Re-render the revoke list when a grant is added or removed. */
export function subscribeAutoApprovals(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function listAutoApprovals(): AutoApprovalRule[] {
  return read()
}

export function isAutoApproved(toolName: string, scope?: string): boolean {
  const key = approvalKey(toolName, scope)
  if (sessionGrants.has(key)) return true
  if (isDestructiveTool(toolName)) return false
  return read().some((rule) => rule.key === key)
}

export function grantAutoApproval(input: {
  toolName: string
  scope?: string
  label: string
  /** Force session-only. Destructive tools are session-only regardless. */
  session?: boolean
}): void {
  const key = approvalKey(input.toolName, input.scope)
  if (input.session || isDestructiveTool(input.toolName)) {
    sessionGrants.add(key)
    notify()
    return
  }
  const rules = read().filter((rule) => rule.key !== key)
  rules.push({
    key,
    toolName: input.toolName,
    scope: input.scope,
    label: input.label,
    createdAt: new Date().toISOString(),
  })
  write(rules)
  notify()
}

export function revokeAutoApproval(key: string): void {
  sessionGrants.delete(key)
  write(read().filter((rule) => rule.key !== key))
  notify()
}

export function revokeAllAutoApprovals(): void {
  sessionGrants.clear()
  write([])
  notify()
}
