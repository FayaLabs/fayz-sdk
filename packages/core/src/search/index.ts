export {
  searchEverything,
  clearSearchCache,
  setSearchIndexAvailable,
  isSearchIndexAvailable,
  MIN_QUERY_LENGTH,
} from './engine'
export {
  foldText,
  foldWithMap,
  digitsOf,
  normalizeQuery,
  similarity,
  scoreCandidate,
  highlightRanges,
} from './text'
export type { NormalizedQuery, RankCandidate } from './text'
export type {
  SearchTarget,
  SearchHit,
  SearchGroup,
  SearchPath,
  SearchOptions,
  GlobalSearchResult,
} from './types'
