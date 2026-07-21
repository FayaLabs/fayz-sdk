import type { AppManifest } from './index'

// ---------------------------------------------------------------------------
// Deterministic serialization — the SAME manifest object must always produce
// the SAME bytes, because the sha256 of those bytes (`contractHash`) is what
// makes `fayz manifest sync` idempotent and lets `fayz doctor` prove the
// committed app.manifest.json is not stale. Rules: object keys sorted, arrays
// kept in declared order (order is meaning: nav position, migration order),
// 2-space indent, trailing newline, `contractHash` itself excluded.
// ---------------------------------------------------------------------------

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      const v = record[key]
      if (v !== undefined) out[key] = sortValue(v)
    }
    return out
  }
  return value
}

/** Canonical JSON of a manifest (contractHash excluded, keys sorted). */
export function serializeManifest(manifest: AppManifest): string {
  const { contractHash: _omit, ...rest } = manifest
  return `${JSON.stringify(sortValue(rest), null, 2)}\n`
}

/**
 * sha256 (hex) of the canonical serialization. Async because it runs on
 * WebCrypto (`globalThis.crypto.subtle`), which exists in every runtime we
 * target (browsers, Node ≥ 18, edge) — no node:crypto import, keeping this
 * module bundleable everywhere.
 */
export async function computeContractHash(manifest: AppManifest): Promise<string> {
  const bytes = new TextEncoder().encode(serializeManifest(manifest))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Serialize WITH the freshly computed contractHash embedded — what
 *  `fayz manifest emit` writes to app.manifest.json. */
export async function serializeManifestWithHash(manifest: AppManifest): Promise<string> {
  const contractHash = await computeContractHash(manifest)
  const { contractHash: _omit, ...rest } = manifest
  return `${JSON.stringify(sortValue({ ...rest, contractHash }), null, 2)}\n`
}
