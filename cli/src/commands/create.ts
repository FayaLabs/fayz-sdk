import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { resolveFayzPackageVersion, type FayzPackageChannel } from '../lib/package-versions.js'
import { TEMPLATES, KINDS, type Kind, type AppTemplate } from '../templates/index.js'

// `fayz create <storefront|admin|member> <name>` — scaffold a real, compiling
// repo-per-app project in the dogfood shape (pulse-store / beauty-saas /
// course-members): code config as source of truth, derived app.manifest.json,
// mock providers so it boots with zero env, fayzVite for local-source dev.

export interface CreateOptions {
  /** Parent directory to create the app in (default: cwd). */
  dir?: string
  /** Run `npm install` after writing files. */
  install?: boolean
  /** Release channel for @fayz-ai package versions (default: stable). */
  channel?: FayzPackageChannel
}

function write(root: string, rel: string, content: string): void {
  const full = resolve(root, rel)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

function packageJson(name: string, template: AppTemplate, channel: FayzPackageChannel): string {
  const deps: Record<string, string> = { ...template.externalDependencies }
  for (const pkg of template.fayzDependencies) deps[pkg] = resolveFayzPackageVersion(pkg, channel)
  const sorted = Object.fromEntries(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)))
  return (
    JSON.stringify(
      {
        name,
        private: true,
        version: '0.1.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc --noEmit && vite build',
          preview: 'vite preview',
          typecheck: 'tsc --noEmit',
        },
        dependencies: sorted,
        devDependencies: {
          '@types/node': '^20.0.0',
          '@types/react': '^18.3.0',
          '@types/react-dom': '^18.3.0',
          '@vitejs/plugin-react': '^4.3.0',
          autoprefixer: '^10.4.0',
          postcss: '^8.4.0',
          tailwindcss: '^3.4.0',
          typescript: '^5.5.0',
          vite: '^5.4.0',
        },
      },
      null,
      2,
    ) + '\n'
  )
}

export function create(kind: string, name: string, options: CreateOptions = {}): number {
  if (!KINDS.includes(kind as Kind)) {
    console.error(`✗ Unknown kind "${kind}". Use: ${KINDS.join(' | ')}`)
    return 1
  }
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    console.error(`✗ Provide a kebab-case app name, e.g. fayz create ${kind} my-app`)
    return 1
  }
  const parent = options.dir ? resolve(process.cwd(), options.dir) : process.cwd()
  const root = resolve(parent, name)
  if (existsSync(root)) {
    console.error(`✗ Directory "${root}" already exists.`)
    return 1
  }
  const template = TEMPLATES[kind as Kind]
  const channel = options.channel ?? 'stable'

  let files: Record<string, string>
  try {
    files = { 'package.json': packageJson(name, template, channel), ...template.files(name) }
  } catch (err) {
    console.error(`✗ ${err instanceof Error ? err.message : err}`)
    return 1
  }
  mkdirSync(root, { recursive: true })
  for (const [rel, content] of Object.entries(files)) write(root, rel, content)

  console.log(`✓ Created ${kind} app "${name}" at ${root} (${channel} channel)`)

  if (options.install) {
    console.log('\n→ npm install')
    const res = spawnSync('npm', ['install'], { cwd: root, stdio: 'inherit' })
    if (res.status !== 0) {
      console.error('✗ npm install failed — fix and re-run it inside the app.')
      return res.status ?? 1
    }
  }

  console.log(`\n  cd ${options.dir ? root : name}`)
  if (!options.install) console.log('  npm install')
  console.log('  npm run dev')
  console.log('\n  Personalization checklist + working rules: CLAUDE.md')
  if (template.note) console.log(`\n  Note: ${template.note}`)
  return 0
}
