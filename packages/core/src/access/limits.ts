import type { LimitDeclaration } from '../types/entitlements'

/**
 * The 4-layer limit-declaration merge, extracted so the browser AccessProvider
 * and the manifest derivation (`fayz manifest emit`) resolve the EXACT same
 * final set: core built-ins < entity-derived < plugin `declaredLimits` < app
 * overrides. Later layers win by key. Pure: pass the layers in, get the merge
 * out — deriving a declaration FROM an entity stays at the call site.
 */
export function mergeLimitDeclarations(
  ...layers: Array<LimitDeclaration[] | undefined>
): LimitDeclaration[] {
  const byKey = new Map<string, LimitDeclaration>()
  for (const layer of layers) {
    for (const decl of layer ?? []) byKey.set(decl.key, decl)
  }
  return Array.from(byKey.values())
}
