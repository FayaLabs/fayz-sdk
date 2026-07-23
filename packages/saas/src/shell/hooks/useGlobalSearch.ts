import { useCallback, useMemo, useRef } from 'react'
import { searchEverything, type GlobalSearchResult, type SearchHit } from '@fayz-ai/core'
import { usePluginRuntimeOptional } from '../lib/plugins'
import { collectSearchTargets } from '../lib/search-targets'
import { openEntity, resolveEntityRoute } from '../../lib/entity-routes'

/** The palette's data half: one search across every entity the user may see,
 *  plus the navigation that opening a result performs. */
export function useGlobalSearch() {
  const runtime = usePluginRuntimeOptional()

  const targets = useMemo(
    () => collectSearchTargets({
      registries: runtime?.registries ?? new Map(),
      queryEntities: runtime?.activePlugins.flatMap((p) => p.queryEntities ?? []) ?? [],
    }),
    // Rebuilding per keystroke would re-permission-check every entity.
    [runtime],
  )

  // A slow answer for "bi" must not overwrite a fast one for "bigodinho".
  const generation = useRef(0)

  const search = useCallback(
    async (query: string, onPartial?: (result: GlobalSearchResult) => void): Promise<GlobalSearchResult> => {
      const token = ++generation.current
      return searchEverything(query, {
        targets,
        limit: 30,
        perTarget: 5,
        onPartial: onPartial ? (partial) => { if (token === generation.current) onPartial(partial) } : undefined,
      })
    },
    [targets],
  )

  const select = useCallback((hit: SearchHit) => {
    openEntity(hit.id, hit.archetype, hit.archetypeKind, undefined, hit.key)
  }, [])

  /** True when opening this hit lands somewhere real. */
  const canOpen = useCallback(
    (hit: SearchHit) => resolveEntityRoute(hit.archetype, hit.archetypeKind, hit.key) !== null,
    [],
  )

  return { search, select, canOpen, targetCount: targets.length }
}
