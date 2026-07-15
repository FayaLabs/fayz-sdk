import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import registry from '../skills-registry.json'
import { fayzDescobertaSkill } from '../templates/skills/fayz-descoberta.js'
import { fayzCreateSkill } from '../templates/skills/fayz-create.js'
import { fayzDbSkill } from '../templates/skills/fayz-db.js'
import { fayzPluginSkill } from '../templates/skills/fayz-plugin.js'
import { fayzShipSkill } from '../templates/skills/fayz-ship.js'

// `fayz skill list|add` — the curated skills layer of the Fayz ecosystem. Skills
// are the "procedures" of the stack: officials first (the golden path), then
// community (skills.sh — installed by the dev, NEVER fetched by this CLI), then
// internal-roadmap (in development). `list --json` is the first agent-grade
// primitive; agents can read the menu and choose. Bundled officials ship their
// SKILL.md inside the CLI, so `add` is a pure local file write — zero network.

const DOCS_URL = 'https://developers.fayz.ai/pt-BR/docs/ia/skills'

type Tier = 'official' | 'community' | 'internal-roadmap'

interface SkillEntry {
  id: string
  tier: Tier
  title: string
  description: string
  source: 'bundled' | 'skills.sh' | 'roadmap'
  installRef?: string
}

const SKILLS = (registry as { skills: SkillEntry[] }).skills

// Bundled SKILL.md bodies, keyed by id. Only `source: bundled` entries appear here.
const BUNDLED: Record<string, string> = {
  'fayz-descoberta': fayzDescobertaSkill,
  'fayz-create': fayzCreateSkill,
  'fayz-db': fayzDbSkill,
  'fayz-plugin': fayzPluginSkill,
  'fayz-ship': fayzShipSkill,
}

const TIER_ORDER: Tier[] = ['official', 'community', 'internal-roadmap']

const TIER_HEADING: Record<Tier, string> = {
  official: 'Oficiais — o trilho do fluxo',
  community: 'Comunidade — instale via skills.sh (você roda o comando)',
  'internal-roadmap': 'Roadmap — em desenvolvimento',
}

function byTier(tier: Tier): SkillEntry[] {
  return SKILLS.filter((s) => s.tier === tier)
}

function listSkills(json: boolean): number {
  if (json) {
    // First agent-grade primitive: a parseable menu. Stable shape for tooling.
    console.log(JSON.stringify({ docs: DOCS_URL, skills: SKILLS }, null, 2))
    return 0
  }

  console.log('fayz skills — cardápio curado\n')
  for (const tier of TIER_ORDER) {
    const entries = byTier(tier)
    if (entries.length === 0) continue
    console.log(`▸ ${TIER_HEADING[tier]}`)
    for (const s of entries) {
      console.log(`    ${s.id.padEnd(30)} ${s.description}`)
      if (s.tier === 'community' && s.installRef) {
        console.log(`    ${' '.repeat(30)} instalar: npx skills add ${s.installRef}`)
      }
    }
    console.log('')
  }
  console.log(`Instalar uma skill oficial:  fayz skill add <id>`)
  console.log(`Docs: ${DOCS_URL}`)
  return 0
}

function addSkill(id: string, dir: string, force: boolean): number {
  if (!id) {
    console.error('✗ Informe o id da skill. Ex.: fayz skill add fayz-descoberta')
    console.error('  Veja o cardápio com: fayz skill list')
    return 1
  }

  const entry = SKILLS.find((s) => s.id === id)
  if (!entry) {
    console.error(`✗ Skill "${id}" não encontrada no registry curado.`)
    console.error('  Veja os ids disponíveis com: fayz skill list')
    return 1
  }

  // Community skills: this CLI NEVER runs third-party installers (security).
  // We print the exact command for the dev to run — nothing is fetched here.
  if (entry.tier === 'community') {
    console.log(`▸ "${id}" é uma skill da comunidade (fonte: skills.sh).`)
    console.log('  A CLI do Fayz não baixa instaladores de terceiros. Rode você mesmo:')
    console.log('')
    console.log(`    npx skills add ${entry.installRef}`)
    console.log('')
    console.log(`  Mais sobre skills da comunidade: ${DOCS_URL}`)
    return 0
  }

  // Internal-roadmap: not shippable yet.
  if (entry.tier === 'internal-roadmap') {
    console.log(`▸ "${id}" está no roadmap interno — em desenvolvimento, ainda não instalável.`)
    console.log(`  Acompanhe o cardápio com: fayz skill list`)
    return 0
  }

  // Official (bundled): write .claude/skills/<id>/SKILL.md into the project.
  const body = BUNDLED[id]
  if (!body) {
    console.error(`✗ Skill oficial "${id}" está no registry mas não tem conteúdo embutido.`)
    return 1
  }

  const skillDir = resolve(dir, '.claude', 'skills', id)
  const target = join(skillDir, 'SKILL.md')

  if (existsSync(target) && !force) {
    console.error(`✗ Já existe ${target}.`)
    console.error('  Use --force para sobrescrever.')
    return 1
  }

  try {
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(target, body)
  } catch (err) {
    console.error(`✗ Não foi possível escrever ${target}: ${(err as Error).message}`)
    return 1
  }

  console.log(`✓ Skill "${id}" instalada em ${target}`)
  console.log('  Funciona em qualquer agente que leia skills de .claude/skills/ (Claude Code e outros).')
  return 0
}

interface SkillFlags {
  json: boolean
  force: boolean
  positional: string[]
}

function parseFlags(args: string[]): SkillFlags {
  const flags: SkillFlags = { json: false, force: false, positional: [] }
  for (const a of args) {
    if (a === '--json') flags.json = true
    else if (a === '--force' || a === '-f') flags.force = true
    else flags.positional.push(a)
  }
  return flags
}

export function skill(sub: string | undefined, args: string[]): number {
  const flags = parseFlags(args)

  switch (sub) {
    case 'list':
      return listSkills(flags.json)
    case 'add':
      return addSkill(flags.positional[0] ?? '', flags.positional[1] ?? process.cwd(), flags.force)
    default:
      console.error(`✗ Subcomando 'fayz skill' desconhecido: "${sub ?? ''}".`)
      console.error('  Tente: fayz skill list  |  fayz skill add <id>')
      return 1
  }
}
