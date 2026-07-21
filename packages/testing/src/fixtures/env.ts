// ---------------------------------------------------------------------------
// Env resolution — process.env wins (CI overrides), then the app's own
// gitignored .env (the same VITE_SUPABASE_* the app uses). NEVER hardcode key
// material; this is the one place every dogfood suite reads secrets from.
//
// Deduped verbatim from the 5 near-identical readDotEnv()/envVar() copies in
// the school/dentist/beauty/resto/agency e2e fixtures.
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'

let cache: Record<string, string> | null = null

function readDotEnv(): Record<string, string> {
  if (cache) return cache
  const file = path.resolve(process.cwd(), '.env')
  const out: Record<string, string> = {}
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  cache = out
  return out
}

/** First defined value among `names`, checking process.env then the app's .env. */
export function envVar(...names: string[]): string | undefined {
  const dotenv = readDotEnv()
  for (const n of names) {
    if (process.env[n]) return process.env[n]
    if (dotenv[n]) return dotenv[n]
  }
  return undefined
}

/** Like envVar, but throws a clear message when nothing is set (required secrets). */
export function requireEnv(message: string, ...names: string[]): string {
  const v = envVar(...names)
  if (!v) throw new Error(message)
  return v
}
