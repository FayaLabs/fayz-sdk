import {
  type AppTemplate,
  titleCase,
  viteConfig,
  tsconfig,
  postcssConfig,
  tailwindConfig,
  stylesCss,
  indexHtml,
  gitignore,
  mainTsx,
  registryTsx,
  readme,
  claudeMd,
  SHARED_EXTERNAL_DEPS,
} from './shared.js'

// Member/learner portal — course-members is the shape reference: manifest-first
// renderApp through the 'member' scaffold, courses catalog seeded via the mock
// provider. autoEnroll grants any login access to every published course.

const CHECKLIST = `1. **Access model**: keep \`autoEnroll: true\` (any login sees everything — good
   for demos/communities) or remove it for purchase-gated enrollment.
2. **Content**: seed the real catalog — replace \`createMockCoursesProvider()\`
   in \`src/plugins.generated.ts\` with a seeded one (courses, modules, lessons).
3. **Identity**: \`accent\` color + name in \`app.manifest.json\` (this kind is
   manifest-first — the manifest IS the config).
4. **Production**: swap the mock courses provider for a Supabase-backed one.`

function appTsx(): string {
  return `import { renderApp } from '@fayz-ai/portal'
import manifest from '../app.manifest.json'

// Manifest-first: a pure-data app.manifest.json rendered through the 'member'
// scaffold (the SDK's authenticated learner portal surface).
export function App() {
  return renderApp(manifest, { surface: 'member' })
}
`
}

function pluginsGenerated(): string {
  return `// AI-BUILDER contract file: plugin/scaffold/provider wiring lives here.
// Importing @fayz-ai/portal runs its scaffold self-registration
// (registerScaffold('member')); the mock courses provider seeds the catalog.
import '@fayz-ai/portal'

import { setCoursesProvider, createMockCoursesProvider } from '@fayz-ai/portal'

setCoursesProvider(createMockCoursesProvider())
`
}

function manifest(name: string): string {
  return (
    JSON.stringify(
      {
        manifestVersion: 2,
        id: name,
        name: titleCase(name),
        backend: { provider: 'mock' },
        locale: { default: 'pt-BR', supported: ['pt-BR'] },
        surfaces: {
          member: { scaffold: 'member', options: { accent: '#10b981', autoEnroll: true } },
        },
      },
      null,
      2,
    ) + '\n'
  )
}

export const memberTemplate: AppTemplate = {
  kind: 'member',
  port: 5191,
  fayzDependencies: ['@fayz-ai/sdk', '@fayz-ai/portal', '@fayz-ai/ui'],
  externalDependencies: SHARED_EXTERNAL_DEPS,
  checklist: CHECKLIST,
  note: 'Any login grants access to the seeded mock courses (autoEnroll). Swap the provider for a Supabase-backed one for production.',
  files: (name) => ({
    'app.manifest.json': manifest(name),
    'index.html': indexHtml(titleCase(name)),
    '.gitignore': gitignore(),
    'vite.config.ts': viteConfig(5191),
    'tsconfig.json': tsconfig(),
    'postcss.config.js': postcssConfig(),
    'tailwind.config.ts': tailwindConfig(),
    'README.md': readme(name, 'member'),
    'CLAUDE.md': claudeMd(name, 'member', CHECKLIST),
    'src/styles.css': stylesCss(),
    'src/main.tsx': mainTsx(),
    'src/App.tsx': appTsx(),
    'src/plugins.generated.ts': pluginsGenerated(),
    'src/registry.tsx': registryTsx(),
  }),
}
