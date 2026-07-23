// Text folding + ranking for global search. The same folding must exist in SQL
// as public.fayz_norm() (@fayz-ai/db 018_global_search.sql), or server and
// client disagree on what matched.

const COMBINING_MARKS = /[\u0300-\u036f]/g

/** Strip diacritics, lowercase, collapse non-alphanumerics to single spaces. */
export function foldText(value: unknown): string {
  if (typeof value !== 'string' || value === '') return ''
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Fold, keeping each folded char's index in the source — used for highlighting. */
export function foldWithMap(value: string): { folded: string; map: number[] } {
  const out: string[] = []
  const map: number[] = []
  let pendingSpace = false
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!
    const folded = ch.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
    for (const f of folded) {
      const alnum = (f >= 'a' && f <= 'z') || (f >= '0' && f <= '9')
      if (!alnum) { pendingSpace = out.length > 0; continue }
      if (pendingSpace) { out.push(' '); map.push(i); pendingSpace = false }
      out.push(f)
      map.push(i)
    }
  }
  return { folded: out.join(''), map }
}

/** Digits only — phone numbers, CPF/CNPJ, SKUs typed with separators. */
export function digitsOf(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D+/g, '') : ''
}

export interface NormalizedQuery {
  /** What the user typed, untouched. */
  raw: string
  /** Folded form of the whole query — the "phrase". */
  folded: string
  /** Folded query split on whitespace. */
  tokens: string[]
  /** Digits the user typed, when they typed enough of them to mean a number. */
  digits: string
  /** The longest token — the most selective thing to send to a `%LIKE%` backend. */
  anchor: string
}

/** Below this a phone/document lookup is indistinguishable from noise. */
const MIN_DIGIT_QUERY = 4

export function normalizeQuery(raw: string): NormalizedQuery {
  const folded = foldText(raw)
  const tokens = folded ? folded.split(' ').filter(Boolean) : []
  const digits = raw.replace(/\D+/g, '')
  let anchor = ''
  for (const token of tokens) if (token.length > anchor.length) anchor = token
  return {
    raw,
    folded,
    tokens,
    digits: digits.length >= MIN_DIGIT_QUERY ? digits : '',
    anchor,
  }
}

// Fuzzy similarity — Sørensen–Dice over bigrams. Same family as pg_trgm's
// similarity(), so both sides rank near-misses the same way.

function bigrams(value: string): string[] {
  if (value.length < 2) return value ? [value] : []
  const out: string[] = []
  for (let i = 0; i < value.length - 1; i++) out.push(value.slice(i, i + 2))
  return out
}

/** 0 (nothing in common) … 1 (identical). Both inputs must already be folded. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const left = bigrams(a)
  const right = bigrams(b)
  if (left.length === 0 || right.length === 0) return 0
  const pool = new Map<string, number>()
  for (const g of left) pool.set(g, (pool.get(g) ?? 0) + 1)
  let shared = 0
  for (const g of right) {
    const count = pool.get(g)
    if (count) { shared++; pool.set(g, count - 1) }
  }
  return (2 * shared) / (left.length + right.length)
}

/** Best similarity between the query token and any single word of the text. */
function wordSimilarity(text: string, token: string): number {
  let best = similarity(text, token)
  for (const word of text.split(' ')) {
    if (!word) continue
    const s = similarity(word, token)
    if (s > best) best = s
  }
  return best
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export interface RankCandidate {
  /** Folded display name — what the user is most likely aiming at. */
  title: string
  /** Folded concatenation of every searchable value on the record. */
  haystack: string
  /** Digits of every phone/document-ish value on the record. */
  digits?: string
}

/** A fuzzy word has to be at least this close before it counts as a match. */
const FUZZY_FLOOR = 0.62

/** Score a candidate 0…1. Zero means "not a match" — the score is also the filter. */
export function scoreCandidate(query: NormalizedQuery, candidate: RankCandidate): number {
  const { folded, tokens } = query
  if (!folded || tokens.length === 0) return 0
  const title = candidate.title
  const haystack = candidate.haystack || title

  // Phrase: the query as one string.
  let phrase = 0
  if (title === folded) phrase = 1
  else if (title.startsWith(folded)) phrase = 0.94
  else if (title.includes(' ' + folded)) phrase = 0.88
  else if (title.includes(folded)) phrase = 0.76
  else if (haystack.startsWith(folded) || haystack.includes(' ' + folded)) phrase = 0.7
  else if (haystack.includes(folded)) phrase = 0.62

  // Tokens: every word must land somewhere ("maria silva" → "Maria da Silva").
  let tokenTotal = 0
  let fuzzyUsed = false
  for (const token of tokens) {
    let best = 0
    if (title.startsWith(token)) best = 0.95
    else if (title.includes(' ' + token)) best = 0.85
    else if (title.includes(token)) best = 0.7
    else if (haystack.startsWith(token) || haystack.includes(' ' + token)) best = 0.6
    else if (haystack.includes(token)) best = 0.5
    else {
      const sim = wordSimilarity(title, token)
      if (sim >= FUZZY_FLOOR) { best = 0.45 * sim; fuzzyUsed = true }
    }
    if (best === 0) return phrase > 0 ? phrase : 0
    tokenTotal += best
  }
  let tokenScore = tokenTotal / tokens.length
  // A typo-only match must never outrank a literal one.
  if (fuzzyUsed) tokenScore *= 0.8

  let score = Math.max(phrase, tokenScore)

  // Digits: a phone number has no words to match.
  if (query.digits && candidate.digits && candidate.digits.includes(query.digits)) {
    score = Math.max(score, 0.72 + Math.min(0.2, query.digits.length / 50))
  }

  if (score === 0) return 0

  // Tie-break: shorter title wins ("Ana" over "Ana Beatriz" for "ana").
  const brevity = 1 / (1 + Math.max(0, title.length - folded.length) / 40)
  return score * 0.97 + brevity * 0.03
}

/** Ranges in the ORIGINAL text covered by the query, merged and sorted. */
export function highlightRanges(text: string, query: NormalizedQuery): Array<[number, number]> {
  if (!text || query.tokens.length === 0) return []
  const { folded, map } = foldWithMap(text)
  if (!folded) return []
  const spans: Array<[number, number]> = []
  const needles = query.tokens.length > 1 ? [query.folded, ...query.tokens] : [query.folded]
  for (const needle of needles) {
    if (!needle) continue
    let from = 0
    for (;;) {
      const at = folded.indexOf(needle, from)
      if (at === -1) break
      const start = map[at]
      const endChar = map[at + needle.length - 1]
      if (start !== undefined && endChar !== undefined) spans.push([start, endChar + 1])
      from = at + needle.length
    }
  }
  if (spans.length === 0) return []
  spans.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = [spans[0]!]
  for (const span of spans.slice(1)) {
    const last = merged[merged.length - 1]!
    if (span[0] <= last[1]) last[1] = Math.max(last[1], span[1])
    else merged.push(span)
  }
  return merged
}
