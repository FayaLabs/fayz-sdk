#!/usr/bin/env node
// Runs SQL against the pool through the Supabase Management API (the same
// endpoint the dashboard SQL editor uses). Credentials come from
// fayz-sdk/.env.pool.local, which .gitignore covers; nothing is echoed.
//
//   node sql.mjs "select count(*) from orders"
//   node sql.mjs --file ../migrations/0014_x.sql
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.resolve(here, '../../../.env.pool.local')
const env = fs.existsSync(envFile)
  ? Object.fromEntries(fs.readFileSync(envFile, 'utf8').split('\n')
      .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
  : {}

const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN
const ref = process.env.SUPABASE_PROJECT_REF ?? env.SUPABASE_PROJECT_REF
if (!token || !ref) {
  console.error('missing SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF in .env.pool.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const fileIdx = args.indexOf('--file')
const query = fileIdx > -1
  ? fs.readFileSync(path.resolve(process.cwd(), args[fileIdx + 1]), 'utf8')
  : args.join(' ')

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
})
const body = await res.text()
if (!res.ok) { console.error(`HTTP ${res.status}: ${body}`); process.exit(1) }
try {
  const rows = JSON.parse(body)
  console.log(Array.isArray(rows) && rows.length ? JSON.stringify(rows, null, 1) : 'ok (sem linhas)')
} catch { console.log(body) }
