// Pure(-ish) source-file collector for `fayz deploy` (milestone P5.1). Walks an
// app directory and returns the SOURCE files to upload to the platform, applying
// a fixed exclude set, the app's .gitignore (a documented SUBSET of the spec),
// an extension allowlist, and a per-file size cap. The only side effect is
// reading the filesystem via an injectable `readDir`/`readFile`/`stat` trio so
// the whole thing is unit-testable against temp fixtures — no network, ever.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Per-file cap: files larger than this are skipped with a warning. */
export const MAX_FILE_BYTES = 256 * 1024

/**
 * Extensions we upload. Everything else is skipped (binaries especially). The
 * cap still applies to allowed extensions (e.g. a huge png is skipped).
 */
export const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.html',
  '.md',
  '.svg',
  '.txt',
  '.ico',
  '.png',
])

/**
 * Directories/paths always excluded, regardless of .gitignore. Matched against
 * a path segment (dir name) during the walk.
 */
export const ALWAYS_EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  '.fayz',
  '.turbo',
  '.cache',
])

export interface CollectedFile {
  /** POSIX-style path relative to the app dir (upload key). */
  path: string
  /** File contents (utf8). */
  content: string
  /** Byte length of the content. */
  bytes: number
}

export interface SkippedFile {
  path: string
  reason: 'size' | 'extension' | 'binary'
  bytes?: number
}

export interface CollectDeployFilesResult {
  files: CollectedFile[]
  skipped: SkippedFile[]
  /** Total bytes across `files`. */
  totalBytes: number
}

export interface CollectDeployFilesOptions {
  /** Injectable dir lister → dirent-like entries. Defaults to node fs. */
  readDir?: (dir: string) => Array<{ name: string; isDirectory: boolean; isFile: boolean }>
  /** Injectable file reader (utf8). Defaults to node fs. */
  readFile?: (path: string) => string
  /** Injectable byte-size probe. Defaults to node fs `statSync().size`. */
  fileSize?: (path: string) => number
  /** Injectable existence check (for .gitignore). Defaults to node fs. */
  fileExists?: (path: string) => boolean
  /** Cap override (bytes). Defaults to MAX_FILE_BYTES. */
  maxBytes?: number
}

// ---------------------------------------------------------------------------
// .gitignore — DOCUMENTED SUBSET
// ---------------------------------------------------------------------------
//
// We honor a pragmatic subset of gitignore semantics, sufficient for the files a
// scaffolded Fayz app ships:
//   • Blank lines and `#` comments are ignored.
//   • A leading `!` (negation/un-ignore) line is IGNORED (not supported) — we
//     never re-include; the fixed allowlist + excludes are the safety net.
//   • A trailing `/` means "directory only" — matched against directory names.
//   • A leading `/` anchors to the app root; otherwise a pattern matches at any
//     depth (by basename or by the anchored relative path).
//   • `*` matches within a single path segment (no `/`); `**` is treated like
//     `*` for our purposes. `?` matches a single non-`/` char.
//   • No brace expansion, no character classes beyond `?`/`*`.
// Anything relying on unsupported gitignore features simply won't be excluded by
// .gitignore — but ALWAYS_EXCLUDED_DIRS + the extension allowlist still apply.

export interface GitignoreRule {
  /** Regex matched against the POSIX relative path (and, if unanchored, basename). */
  regex: RegExp
  /** True → only matches directories. */
  dirOnly: boolean
  /** True → anchored to root (pattern had a leading '/' or contained a middle '/'). */
  anchored: boolean
}

function globToRegExpSource(glob: string): string {
  let out = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      // Collapse ** to * (single-segment wildcard is enough for our subset).
      if (glob[i + 1] === '*') i++
      out += '[^/]*'
    } else if (c === '?') {
      out += '[^/]'
    } else if ('.+^${}()|[]\\'.includes(c)) {
      out += '\\' + c
    } else {
      out += c
    }
  }
  return out
}

/** Parse .gitignore content into our supported rule subset. */
export function parseGitignore(content: string): GitignoreRule[] {
  const rules: GitignoreRule[] = []
  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('!')) continue // negation unsupported → skip
    let dirOnly = false
    if (line.endsWith('/')) {
      dirOnly = true
      line = line.slice(0, -1)
    }
    let anchored = false
    if (line.startsWith('/')) {
      anchored = true
      line = line.slice(1)
    }
    if (line.includes('/')) anchored = true
    if (!line) continue
    const src = globToRegExpSource(line)
    // Anchored → match from root. Unanchored → match the basename OR any suffix
    // segment path.
    const regex = anchored
      ? new RegExp(`^${src}(/.*)?$`)
      : new RegExp(`(^|/)${src}(/.*)?$`)
    rules.push({ regex, dirOnly, anchored })
  }
  return rules
}

/** True when `relPath` (POSIX, of the given kind) is ignored by the rules. */
export function isIgnored(relPath: string, isDir: boolean, rules: GitignoreRule[]): boolean {
  for (const rule of rules) {
    if (rule.dirOnly && !isDir) continue
    if (rule.regex.test(relPath)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

/** Env files we always drop, except .env.example which is safe to publish. */
function isBlockedEnvFile(name: string): boolean {
  return name.startsWith('.env') && name !== '.env.example'
}

function toPosix(p: string): string {
  return sep === '/' ? p : p.split(sep).join('/')
}

const defaultIo = {
  readDir: (dir: string) =>
    readdirSync(dir, { withFileTypes: true }).map((d) => ({
      name: d.name,
      isDirectory: d.isDirectory(),
      isFile: d.isFile(),
    })),
  readFile: (p: string) => readFileSync(p, 'utf8'),
  fileSize: (p: string) => statSync(p).size,
  fileExists: (p: string) => existsSync(p),
}

/**
 * Walk `appDir` and collect uploadable source files. Deterministic order
 * (lexicographic by relative path). Pure w.r.t. the injectable IO.
 */
export function collectDeployFiles(
  appDir: string,
  options: CollectDeployFilesOptions = {},
): CollectDeployFilesResult {
  const readDir = options.readDir ?? defaultIo.readDir
  const readFile = options.readFile ?? defaultIo.readFile
  const fileSize = options.fileSize ?? defaultIo.fileSize
  const fileExists = options.fileExists ?? defaultIo.fileExists
  const maxBytes = options.maxBytes ?? MAX_FILE_BYTES

  // Load .gitignore rules (best-effort; absence = no extra rules).
  let rules: GitignoreRule[] = []
  const gitignorePath = join(appDir, '.gitignore')
  if (fileExists(gitignorePath)) {
    try {
      rules = parseGitignore(readFile(gitignorePath))
    } catch {
      rules = []
    }
  }

  const files: CollectedFile[] = []
  const skipped: SkippedFile[] = []

  function walk(dir: string): void {
    let entries: Array<{ name: string; isDirectory: boolean; isFile: boolean }>
    try {
      entries = readDir(dir)
    } catch {
      return
    }
    // Stable order.
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (const entry of entries) {
      const full = join(dir, entry.name)
      const rel = toPosix(relative(appDir, full))
      if (entry.isDirectory) {
        if (ALWAYS_EXCLUDED_DIRS.has(entry.name)) continue
        if (isIgnored(rel, true, rules)) continue
        walk(full)
        continue
      }
      if (!entry.isFile) continue
      if (isBlockedEnvFile(entry.name)) continue
      if (isIgnored(rel, false, rules)) continue

      // .env.example is safe to publish even though its extension isn't in the
      // allowlist (the only exempt env file — real .env* were dropped above).
      const ext = extensionOf(entry.name)
      if (entry.name !== '.env.example' && !ALLOWED_EXTENSIONS.has(ext)) {
        skipped.push({ path: rel, reason: 'extension' })
        continue
      }
      let bytes: number
      try {
        bytes = fileSize(full)
      } catch {
        continue
      }
      if (bytes > maxBytes) {
        skipped.push({ path: rel, reason: 'size', bytes })
        continue
      }
      let content: string
      try {
        content = readFile(full)
      } catch {
        continue
      }
      files.push({ path: rel, content, bytes })
    }
  }

  walk(appDir)
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  skipped.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const totalBytes = files.reduce((n, f) => n + f.bytes, 0)
  return { files, skipped, totalBytes }
}
