import { createHash } from 'node:crypto'

// Canonical manifest serialization — BYTE-COMPATIBLE with
// packages/core/src/manifest/serialize.ts (the canonical implementation; this
// copy exists because the CLI is deliberately dependency-free). Rules: object
// keys sorted, arrays kept in declared order, undefined values dropped,
// 2-space indent, trailing newline, `contractHash` itself excluded from the
// hashed bytes. If you change one side, change the other and the tests.

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

export function serializeManifestCanonical(manifest: Record<string, unknown>): string {
  const { contractHash: _omit, ...rest } = manifest
  return `${JSON.stringify(sortValue(rest), null, 2)}\n`
}

export function computeContractHash(manifest: Record<string, unknown>): string {
  return createHash('sha256').update(serializeManifestCanonical(manifest), 'utf8').digest('hex')
}

/** Serialize WITH the freshly computed contractHash embedded — the exact bytes
 *  `fayz manifest emit` writes to app.manifest.json. */
export function serializeManifestWithHash(manifest: Record<string, unknown>): string {
  const contractHash = computeContractHash(manifest)
  const { contractHash: _omit, ...rest } = manifest
  return `${JSON.stringify(sortValue({ ...rest, contractHash }), null, 2)}\n`
}
