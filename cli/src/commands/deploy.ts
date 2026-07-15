import { createInterface } from 'node:readline'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { collectDeployFiles, type CollectDeployFilesResult } from '../lib/deploy-files.js'
import {
  ApiError,
  createPlatformClient,
  DEFAULT_BASE_URL,
  isValidTokenFormat,
  resolveToken,
  TOKEN_PREFIX,
  type PlatformClient,
} from '../lib/fayz-platform.js'
import { confirmationGate } from '../lib/supabase-management.js'

// `fayz deploy [dir]` (milestone P5.1). Collects an app's SOURCE files, upserts
// them into a platform project (creating + linking one on first deploy), and
// triggers a server-side build → static hosting. The ONLY network surface is the
// platform client's injectable fetch. `--dry-run` performs zero network calls.
//
// Token resolution: env FAYZ_TOKEN → ~/.fayz/credentials.json (from `fayz login`).
// Project link: <appDir>/.fayz/project.json { projectId, name }. NOTE: `.fayz/`
// should be git-ignored by the app; the scaffold templates are NOT edited in this
// milestone — document that the developer adds `.fayz/` to .gitignore.

interface DeployFlags {
  dryRun: boolean
  yes: boolean
  dir?: string
}

function parseFlags(args: string[]): DeployFlags {
  const flags: DeployFlags = { dryRun: false, yes: false }
  for (const a of args) {
    if (a === '--dry-run') flags.dryRun = true
    else if (a === '--yes' || a === '-y') flags.yes = true
    else if (!a.startsWith('-')) flags.dir = a
  }
  return flags
}

interface ProjectLink {
  projectId: string
  name: string
}

function projectLinkPath(appDir: string): string {
  return join(appDir, '.fayz', 'project.json')
}

function readProjectLink(appDir: string): ProjectLink | null {
  const p = projectLinkPath(appDir)
  if (!existsSync(p)) return null
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as unknown
    if (parsed && typeof parsed === 'object' && typeof (parsed as ProjectLink).projectId === 'string') {
      return parsed as ProjectLink
    }
  } catch {
    /* ignore */
  }
  return null
}

function writeProjectLink(appDir: string, link: ProjectLink): void {
  const p = projectLinkPath(appDir)
  mkdirSync(join(appDir, '.fayz'), { recursive: true })
  writeFileSync(p, JSON.stringify(link, null, 2) + '\n')
}

/** Derive a project name from package.json `name`, falling back to the dir name. */
function deriveProjectName(appDir: string): string {
  const pkgPath = join(appDir, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string }
      if (typeof pkg.name === 'string' && pkg.name.trim()) return pkg.name.trim()
    } catch {
      /* ignore */
    }
  }
  return basename(appDir)
}

async function promptConfirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await new Promise<string>((res) => rl.question(question, res))
    return answer.trim().toLowerCase() === 'y'
  } finally {
    rl.close()
  }
}

function printCollection(appDir: string, collected: CollectDeployFilesResult): void {
  console.log(`▸ Arquivos a enviar de ${appDir}:\n`)
  for (const f of collected.files) {
    console.log(`  ${f.path}  (${f.bytes} B)`)
  }
  if (collected.skipped.length > 0) {
    console.log('\n  Ignorados:')
    for (const s of collected.skipped) {
      const detail = s.reason === 'size' ? `> limite (${s.bytes} B)` : s.reason
      console.log(`    ⚠ ${s.path} — ${detail}`)
    }
  }
  console.log(
    `\n  Total: ${collected.files.length} arquivo(s), ${collected.totalBytes} B.`,
  )
}

/** Map an API/network failure to an actionable message. */
function explainApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return (
        'token inválido ou a plataforma ainda não liberou acesso de CLI para sua conta — fale com a gente.\n' +
        `  (${err.status}) ${err.body.slice(0, 200)}`
      )
    }
    return err.message
  }
  return (err as Error).message
}

export interface DeployDeps {
  /** Injectable client factory so tests never hit the network. */
  makeClient?: (opts: { baseUrl?: string; token: string }) => PlatformClient
}

export async function deploy(args: string[], deps: DeployDeps = {}): Promise<number> {
  const flags = parseFlags(args)
  const appDir = resolve(flags.dir ?? process.cwd())

  if (!existsSync(appDir)) {
    console.error(`✗ Diretório não encontrado: ${appDir}`)
    return 1
  }

  // Collect the source files up front (needed for both dry-run and real deploy).
  const collected = collectDeployFiles(appDir)
  const existingLink = readProjectLink(appDir)
  const projectName = existingLink?.name ?? deriveProjectName(appDir)

  // --- Dry-run: list what would upload + the target, zero network. ---
  if (flags.dryRun) {
    printCollection(appDir, collected)
    const target = existingLink
      ? `projeto existente '${existingLink.name}' (${existingLink.projectId})`
      : `novo projeto '${projectName}' (será criado no primeiro deploy)`
    console.log(`  Destino: ${target}`)
    console.log('  (dry-run — nenhuma chamada de rede foi feita)')
    return 0
  }

  if (collected.files.length === 0) {
    console.error(`✗ Nenhum arquivo para enviar em ${appDir}. Rode 'fayz deploy --dry-run' para inspecionar.`)
    return 1
  }

  // ① Resolve the token (env → ~/.fayz/credentials.json).
  const resolved = resolveToken()
  if (!resolved.token) {
    console.error(
      "✗ Nenhum token Fayz encontrado. Rode 'fayz login' primeiro, ou defina FAYZ_TOKEN no ambiente.",
    )
    return 1
  }
  if (!isValidTokenFormat(resolved.token)) {
    console.error(
      `✗ Token com formato inválido (esperado prefixo '${TOKEN_PREFIX}'). Rode 'fayz login' novamente.`,
    )
    return 1
  }
  const baseUrl = resolved.baseUrl ?? DEFAULT_BASE_URL

  // ② Confirm before touching the platform.
  console.log(`▸ Deploy de ${appDir}`)
  console.log(`  ${collected.files.length} arquivo(s), ${collected.totalBytes} B → ${baseUrl}`)
  console.log(
    existingLink
      ? `  Projeto: '${existingLink.name}' (${existingLink.projectId})`
      : `  Projeto: '${projectName}' (novo — será criado)`,
  )

  const gate = confirmationGate({ yes: flags.yes, isTTY: Boolean(process.stdin.isTTY) })
  if (gate.error) {
    console.error(
      '✗ Recusando fazer deploy sem confirmação em um shell não-interativo. Rode novamente com --yes para prosseguir.',
    )
    return 1
  }
  if (gate.needsPrompt) {
    const ok = await promptConfirm(`  Digite 'y' para publicar em ${baseUrl}: `)
    if (!ok) {
      console.log('Cancelado — nada foi enviado.')
      return 1
    }
  }

  // ③ Build the client (the only network surface) and run create→upload→publish.
  const makeClient =
    deps.makeClient ?? ((o) => createPlatformClient({ baseUrl: o.baseUrl, token: o.token }))
  const client = makeClient({ baseUrl, token: resolved.token })

  try {
    let link = existingLink
    if (!link) {
      console.log(`▸ Criando projeto '${projectName}'…`)
      const project = await client.createProject(projectName)
      link = { projectId: project.id, name: projectName }
      writeProjectLink(appDir, link)
      console.log(`  ✓ projeto criado: ${link.projectId} (salvo em .fayz/project.json)`)
    }

    console.log(`▸ Enviando ${collected.files.length} arquivos…`)
    await client.uploadFiles(
      link.projectId,
      collected.files.map((f) => ({ path: f.path, content: f.content })),
      (p) => console.log(`  lote ${p.batch}/${p.totalBatches} — ${p.filesUploaded}/${p.totalFiles} arquivos`),
    )

    console.log('▸ Publicando (build no servidor)…')
    const published = await client.publishProject(link.projectId)
    console.log('\n✓ Deploy concluído!')
    console.log(`\n  ${published.url}\n`)
    return 0
  } catch (err) {
    console.error(`✗ ${explainApiError(err)}`)
    return 1
  }
}
